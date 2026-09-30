package vn.chesshub.service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.entity.User;
import vn.chesshub.repository.UserRepository;

@Service
public class CenterService {
  private final JdbcTemplate db;
  private final UserRepository users;

  public CenterService(JdbcTemplate db, UserRepository users) {
    this.db = db;
    this.users = users;
  }

  @Transactional(readOnly = true)
  public Dashboard dashboard(UUID userId) {
    requireUser(userId);
    UUID currentCenterId = db.queryForObject("select center_id from users where id = ?", UUID.class, userId);
    Center center = activeCenter(userId, currentCenterId);
    List<Invitation> incoming = db.query("""
      select i.id, i.center_id, c.name as center_name, u.full_name as person_name,
             u.email as person_email, i.created_at
      from center_invitations i
      join centers c on c.id = i.center_id
      join users u on u.id = i.invited_by_user_id
      where i.invited_user_id = ? and i.status = 'PENDING'
      order by i.created_at desc
      """, CenterService::invitation, userId);
    if (center == null) return new Dashboard(null, List.of(), incoming, List.of());
    List<Member> members = db.query("""
      select u.id, u.full_name, u.email, m.role
      from center_memberships m join users u on u.id = m.user_id
      where m.center_id = ? and m.status = 'ACTIVE'
      order by case when m.role = 'OWNER' then 0 else 1 end, u.full_name
      """, (rs, row) -> new Member(uuid(rs, "id"), rs.getString("full_name"), rs.getString("email"), rs.getString("role")), center.id());
    List<Invitation> outgoing = center.ownerUserId().equals(userId) ? db.query("""
      select i.id, i.center_id, c.name as center_name, u.full_name as person_name,
             u.email as person_email, i.created_at
      from center_invitations i
      join centers c on c.id = i.center_id
      join users u on u.id = i.invited_user_id
      where i.center_id = ? and i.status = 'PENDING'
      order by i.created_at desc
      """, CenterService::invitation, center.id()) : List.of();
    return new Dashboard(center, members, incoming, outgoing);
  }

  @Transactional
  public Dashboard create(UUID userId, String name) {
    requireUser(userId);
    lockUser(userId);
    User user = requireUser(userId);
    if (activeCenter(userId, user.getCenterId()) != null || hasActiveMembership(userId)) {
      throw error(HttpStatus.CONFLICT, "Bạn đã thuộc một trung tâm.");
    }
    List<UUID> owned = db.query("select id from centers where owner_user_id = ? order by created_at limit 1",
      (rs, row) -> uuid(rs, "id"), userId);
    UUID centerId;
    if (owned.isEmpty()) {
      String centerName = name == null ? "" : name.trim();
      if (centerName.isEmpty() || centerName.length() > 255) {
        throw error(HttpStatus.BAD_REQUEST, "Tên trung tâm phải có từ 1 đến 255 ký tự.");
      }
      centerId = UUID.randomUUID();
      db.update("insert into centers (id, owner_user_id, name) values (?, ?, ?)", centerId, userId, centerName);
    } else {
      centerId = owned.getFirst();
    }
    db.update("""
      insert into center_memberships (center_id, user_id, role, status)
      values (?, ?, 'OWNER', 'ACTIVE')
      on conflict (center_id, user_id) do update set role = 'OWNER', status = 'ACTIVE'
      """, centerId, userId);
    db.update("update users set center_id = ? where id = ?", centerId, userId);
    db.update("update center_invitations set status = 'CANCELLED', responded_at = current_timestamp where invited_user_id = ? and status = 'PENDING'", userId);
    db.update("update student set center_id = ?, owner_user_id = null where owner_user_id = ? and center_id is null", centerId, userId);
    // Records created before student ownership was introduced are linked through classes.
    // Share only records that are used exclusively by this owner's classes.
    db.update("""
      update student s set center_id = ?
      where s.center_id is null and s.owner_user_id is null
        and exists (
          select 1 from chess_class_students cs join chess_classes c on c.id = cs.chess_class_id
          where cs.student_id = s.id and c.teacher_id = ?
        )
        and not exists (
          select 1 from chess_class_students cs join chess_classes c on c.id = cs.chess_class_id
          where cs.student_id = s.id and c.teacher_id <> ?
        )
      """, centerId, userId, userId);
    return dashboard(userId);
  }

  @Transactional
  public Dashboard invite(UUID ownerId, String email) {
    requireUser(ownerId);
    String normalizedEmail = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    if (!normalizedEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
      throw error(HttpStatus.BAD_REQUEST, "Email không hợp lệ.");
    }
    User invitee = users.findByEmail(normalizedEmail)
      .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Email này chưa có tài khoản ChessHub."));
    if (invitee.getId().equals(ownerId)) throw error(HttpStatus.BAD_REQUEST, "Bạn không thể mời chính mình.");
    Center center = activeCenter(ownerId, requireUser(ownerId).getCenterId());
    if (center == null || !center.ownerUserId().equals(ownerId)) {
      throw error(HttpStatus.FORBIDDEN, "Chỉ chủ trung tâm mới có thể gửi lời mời.");
    }
    if (hasActiveMembership(invitee.getId()) || users.ownsCenter(invitee.getId())) {
      throw error(HttpStatus.CONFLICT, "Người dùng này đã thuộc một trung tâm.");
    }
    Integer pending = db.queryForObject("""
      select count(*) from center_invitations
      where center_id = ? and invited_user_id = ? and status = 'PENDING'
      """, Integer.class, center.id(), invitee.getId());
    if (pending != null && pending > 0) throw error(HttpStatus.CONFLICT, "Lời mời đang chờ phản hồi.");
    try {
      db.update("""
        insert into center_invitations (id, center_id, invited_user_id, invited_by_user_id)
        values (?, ?, ?, ?)
        """, UUID.randomUUID(), center.id(), invitee.getId(), ownerId);
    } catch (DataIntegrityViolationException exception) {
      throw error(HttpStatus.CONFLICT, "Lời mời đang chờ phản hồi.");
    }
    return dashboard(ownerId);
  }

  @Transactional
  public Dashboard respond(UUID userId, UUID invitationId, boolean accept) {
    requireUser(userId);
    lockUser(userId);
    List<UUID> centers = db.query("""
      select center_id from center_invitations
      where id = ? and invited_user_id = ? and status = 'PENDING'
      for update
      """, (rs, row) -> uuid(rs, "center_id"), invitationId, userId);
    if (centers.isEmpty()) throw error(HttpStatus.NOT_FOUND, "Lời mời không còn hiệu lực.");
    UUID centerId = centers.getFirst();
    if (accept) {
      if (hasActiveMembership(userId) || users.ownsCenter(userId)) {
        throw error(HttpStatus.CONFLICT, "Bạn đã thuộc một trung tâm.");
      }
      db.update("""
        insert into center_memberships (center_id, user_id, role, status)
        values (?, ?, 'TEACHER', 'ACTIVE')
        on conflict (center_id, user_id) do update set role = 'TEACHER', status = 'ACTIVE', joined_at = current_timestamp
        """, centerId, userId);
      db.update("update users set center_id = ? where id = ?", centerId, userId);
      db.update("update center_invitations set status = 'CANCELLED', responded_at = current_timestamp where invited_user_id = ? and id <> ? and status = 'PENDING'", userId, invitationId);
    }
    db.update("update center_invitations set status = ?, responded_at = current_timestamp where id = ?",
      accept ? "ACCEPTED" : "DECLINED", invitationId);
    return dashboard(userId);
  }

  private Center activeCenter(UUID userId, UUID centerId) {
    if (centerId == null) return null;
    List<Center> centers = db.query("""
      select c.id, c.name, c.owner_user_id, owner.full_name as owner_name
      from centers c
      join users owner on owner.id = c.owner_user_id
      join center_memberships m on m.center_id = c.id and m.user_id = ? and m.status = 'ACTIVE'
      where c.id = ?
      """, (rs, row) -> new Center(uuid(rs, "id"), rs.getString("name"),
        uuid(rs, "owner_user_id"), rs.getString("owner_name")), userId, centerId);
    return centers.isEmpty() ? null : centers.getFirst();
  }

  private boolean hasActiveMembership(UUID userId) {
    Integer count = db.queryForObject("select count(*) from center_memberships where user_id = ? and status = 'ACTIVE'",
      Integer.class, userId);
    return count != null && count > 0;
  }

  private void lockUser(UUID userId) { db.queryForObject("select id from users where id = ? for update", UUID.class, userId); }

  private User requireUser(UUID userId) {
    return users.findById(userId).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản."));
  }

  private static UUID uuid(ResultSet rs, String column) throws SQLException { return rs.getObject(column, UUID.class); }

  private static Invitation invitation(ResultSet rs, int row) throws SQLException {
    return new Invitation(uuid(rs, "id"), uuid(rs, "center_id"), rs.getString("center_name"),
      rs.getString("person_name"), rs.getString("person_email"), rs.getTimestamp("created_at").toInstant());
  }

  private static ResponseStatusException error(HttpStatus status, String message) {
    return new ResponseStatusException(status, message);
  }

  public record Center(UUID id, String name, UUID ownerUserId, String ownerName) { }
  public record Member(UUID id, String fullName, String email, String role) { }
  public record Invitation(UUID id, UUID centerId, String centerName, String personName, String personEmail, Instant createdAt) { }
  public record Dashboard(Center center, List<Member> members, List<Invitation> incomingInvitations, List<Invitation> outgoingInvitations) { }
}
