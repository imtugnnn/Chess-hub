package vn.chesshub.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import vn.chesshub.entity.User;
import vn.chesshub.repository.ChessClassRepository;
import vn.chesshub.repository.StudentRepository;
import vn.chesshub.repository.UserRepository;

@Service
@Transactional(readOnly = true)
public class UserService {
  private final UserRepository users;
  private final ChessClassRepository classes;
  private final StudentRepository students;
  private final NamedParameterJdbcTemplate jdbc;

  public UserService(UserRepository users, ChessClassRepository classes, StudentRepository students, NamedParameterJdbcTemplate jdbc) {
    this.users = users;
    this.classes = classes;
    this.students = students;
    this.jdbc = jdbc;
  }

  public List<User> list() { return users.findAllByOrderByFullNameAsc(); }

  public DeletionEligibility deletionEligibility(UUID userId) {
    requireUser(userId);
    List<String> blockers = deletionBlockers(userId);
    return new DeletionEligibility(true, blockers);
  }

  @Transactional
  public void deleteUnusedUser(UUID userId) {
    requireUser(userId);
    var parameters = java.util.Map.of("userId", userId);
    // Lock the account before removing dependent rows. All statements share this transaction.
    jdbc.queryForList("select id from users where id = :userId for update", parameters);
    String ownedCenters = "select id from centers where owner_user_id = :userId";
    String ownedStudents = "select id from student where owner_user_id = :userId or center_id in (" + ownedCenters + ")";
    String ownedClasses = "select id from chess_classes where teacher_id = :userId";
    String ownedSessions = "select id from class_sessions where class_id in (" + ownedClasses + ")";
    String ownedTournaments = "select id from tournaments where teacher_id = :userId";
    String participants = "select id from tournament_participants where tournament_id in (" + ownedTournaments + ") or student_id in (" + ownedStudents + ")";
    jdbc.update("delete from tournament_pairings where round_id in (select id from tournament_rounds where tournament_id in (" + ownedTournaments + ")) or white_participant_id in (" + participants + ") or black_participant_id in (" + participants + ")", parameters);
    jdbc.update("delete from tournament_participants where id in (" + participants + ")", parameters);
    jdbc.update("delete from tournament_tie_breaks where tournament_id in (" + ownedTournaments + ")", parameters);
    jdbc.update("delete from tournament_rounds where tournament_id in (" + ownedTournaments + ")", parameters);
    jdbc.update("delete from tournaments where id in (" + ownedTournaments + ")", parameters);
    jdbc.update("delete from session_attendance where session_id in (" + ownedSessions + ") or student_id in (" + ownedStudents + ")", parameters);
    jdbc.update("delete from class_sessions where id in (" + ownedSessions + ")", parameters);
    jdbc.update("update chess_classes c set student_count = (select count(*) from chess_class_students cs where cs.chess_class_id = c.id and cs.student_id not in (" + ownedStudents + ")) where c.id not in (" + ownedClasses + ") and exists (select 1 from chess_class_students cs where cs.chess_class_id = c.id and cs.student_id in (" + ownedStudents + "))", parameters);
    jdbc.update("delete from chess_class_students where chess_class_id in (" + ownedClasses + ") or student_id in (" + ownedStudents + ")", parameters);
    jdbc.update("delete from chess_classes where id in (" + ownedClasses + ")", parameters);
    jdbc.update("delete from student where id in (" + ownedStudents + ")", parameters);
    jdbc.update("delete from center_invitations where invited_by_user_id = :userId or invited_user_id = :userId or center_id in (" + ownedCenters + ")", parameters);
    jdbc.update("delete from center_memberships where user_id = :userId or center_id in (" + ownedCenters + ")", parameters);
    jdbc.update("update users set center_id = null where center_id in (" + ownedCenters + ")", parameters);
    jdbc.update("delete from centers where id in (" + ownedCenters + ")", parameters);
    jdbc.update("delete from users where id = :userId", parameters);
  }

  private User requireUser(UUID userId) {
    return users.findById(userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản."));
  }

  private List<String> deletionBlockers(UUID userId) {
    java.util.ArrayList<String> blockers = new java.util.ArrayList<>();
    if (classes.existsByTeacherId(userId)) blockers.add("lớp học");
    if (students.existsByOwnerUserId(userId)) blockers.add("hồ sơ học viên riêng");
    if (users.ownsCenter(userId)) blockers.add("trung tâm sở hữu");
    if (users.hasActiveCenterMembership(userId)) blockers.add("thành viên trung tâm");
    if (users.hasCreatedCenterInvitations(userId)) blockers.add("lời mời trung tâm đã tạo");
    return blockers;
  }

  public record DeletionEligibility(boolean eligible, List<String> blockers) { }
}
