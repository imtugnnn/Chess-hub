package vn.chesshub.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
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

  public UserService(UserRepository users, ChessClassRepository classes, StudentRepository students) {
    this.users = users;
    this.classes = classes;
    this.students = students;
  }

  public List<User> list() { return users.findAllByOrderByFullNameAsc(); }

  public DeletionEligibility deletionEligibility(UUID userId) {
    requireUser(userId);
    List<String> blockers = deletionBlockers(userId);
    return new DeletionEligibility(blockers.isEmpty(), blockers);
  }

  @Transactional
  public void deleteUnusedUser(UUID userId) {
    requireUser(userId);
    List<String> blockers = deletionBlockers(userId);
    if (!blockers.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT,
          "Không thể xóa tài khoản vì vẫn còn " + String.join(", ", blockers) + ".");
    }
    users.deleteById(userId);
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
