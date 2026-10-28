package vn.chesshub.service;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.entity.User;
import vn.chesshub.repository.UserRepository;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CenterMemberRemovalTest {
  final UUID ownerId = UUID.randomUUID(), memberId = UUID.randomUUID(), outsiderId = UUID.randomUUID();
  final UUID centerId = UUID.randomUUID();
  JdbcTemplate db;
  CenterService service;
  UserRepository users;

  @BeforeEach void setup() {
    db = new JdbcTemplate(new DriverManagerDataSource("jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1", "sa", ""));
    db.execute("create table users (id uuid primary key, center_id uuid, full_name varchar, email varchar)");
    db.execute("create table centers (id uuid primary key, owner_user_id uuid, name varchar)");
    db.execute("create table center_memberships (center_id uuid, user_id uuid, role varchar, status varchar)");
    db.execute("create table center_invitations (id uuid, center_id uuid, invited_user_id uuid, invited_by_user_id uuid, status varchar, created_at timestamp)");
    db.execute("create table chess_classes (id uuid primary key, teacher_id uuid)");
    db.execute("create table student (id uuid primary key, center_id uuid)");
    users = mock(UserRepository.class);
    service = new CenterService(db, users, mock(InvitationMailService.class));
    for (UUID id : new UUID[]{ownerId, memberId, outsiderId}) {
      User user = mock(User.class);
      when(user.getId()).thenReturn(id);
      when(user.getCenterId()).thenReturn(id.equals(outsiderId) ? null : centerId);
      when(users.findById(id)).thenReturn(Optional.of(user));
      db.update("insert into users values (?, ?, ?, ?)", id, id.equals(outsiderId) ? null : centerId, "Teacher", id + "@example.com");
    }
    db.update("insert into centers values (?, ?, 'Center')", centerId, ownerId);
    db.update("insert into center_memberships values (?, ?, 'OWNER', 'ACTIVE')", centerId, ownerId);
    db.update("insert into center_memberships values (?, ?, 'TEACHER', 'ACTIVE')", centerId, memberId);
  }

  @Test void removalRevokesMembershipButPreservesAccountClassesAndSharedStudents() {
    UUID classId = UUID.randomUUID(), studentId = UUID.randomUUID();
    db.update("insert into chess_classes values (?, ?)", classId, memberId);
    db.update("insert into student values (?, ?)", studentId, centerId);
    var dashboard = service.removeMember(ownerId, memberId);
    assertEquals(1, dashboard.members().size());
    assertEquals(ownerId, dashboard.members().getFirst().id());
    assertNull(db.queryForObject("select center_id from users where id = ?", UUID.class, memberId));
    assertEquals("LEFT", db.queryForObject("select status from center_memberships where user_id = ?", String.class, memberId));
    assertNull(service.dashboard(memberId).center());
    assertEquals(memberId, db.queryForObject("select teacher_id from chess_classes where id = ?", UUID.class, classId));
    assertEquals(centerId, db.queryForObject("select center_id from student where id = ?", UUID.class, studentId));
    verify(users, never()).delete(any());
  }

  @Test void teacherCannotRemoveAnotherMember() {
    assertStatus(HttpStatus.FORBIDDEN, () -> service.removeMember(memberId, ownerId));
    assertEquals(2, service.dashboard(ownerId).members().size());
  }

  @Test void ownerCannotRemoveSelf() {
    assertStatus(HttpStatus.BAD_REQUEST, () -> service.removeMember(ownerId, ownerId));
    assertEquals(2, service.dashboard(ownerId).members().size());
  }

  @Test void outsiderCannotBeRemoved() {
    assertStatus(HttpStatus.NOT_FOUND, () -> service.removeMember(ownerId, outsiderId));
    assertEquals(2, service.dashboard(ownerId).members().size());
  }

  @Test void repeatedRemovalIsRejected() {
    service.removeMember(ownerId, memberId);
    assertStatus(HttpStatus.NOT_FOUND, () -> service.removeMember(ownerId, memberId));
  }

  private void assertStatus(HttpStatus expected, org.junit.jupiter.api.function.Executable action) {
    assertEquals(expected, assertThrows(ResponseStatusException.class, action).getStatusCode());
  }
}
