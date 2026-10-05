package vn.chesshub.controller;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.entity.ClassSession;
import vn.chesshub.entity.SessionAttendance;
import vn.chesshub.repository.ClassSessionRepository;
import vn.chesshub.repository.SessionAttendanceRepository;
import vn.chesshub.repository.StudentRepository;
import vn.chesshub.repository.ChessClassRepository;
import org.springframework.transaction.annotation.Transactional;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping("/api/v1/teachers/{teacherId}/classes/{classId}/sessions/{sessionId}/attendance")
public class AttendanceController {
  private static final Set<String> STATUSES = Set.of("PRESENT", "ABSENT", "LATE");
  private final ClassSessionRepository sessions;
  private final SessionAttendanceRepository attendance;
  private final StudentRepository students;
  private final ChessClassRepository classes;

  public AttendanceController(ClassSessionRepository sessions, SessionAttendanceRepository attendance, StudentRepository students, ChessClassRepository classes) {
    this.sessions = sessions;
    this.attendance = attendance;
    this.students = students;
    this.classes = classes;
  }

  @GetMapping
  @Transactional(readOnly = true)
  public List<AttendanceResponse> list(@PathVariable UUID teacherId, @PathVariable UUID classId, @PathVariable UUID sessionId) {
    ClassSession session = session(teacherId, classId, sessionId);
    Set<UUID> current = session.getChessClass().getStudents().stream().map(student -> student.getId()).collect(java.util.stream.Collectors.toSet());
    return attendance.findBySessionId(sessionId).stream().map(item -> AttendanceResponse.from(item, !current.contains(item.getStudent().getId()))).toList();
  }

  @PutMapping
  @Transactional
  public List<AttendanceResponse> save(@PathVariable UUID teacherId, @PathVariable UUID classId, @PathVariable UUID sessionId,
      @RequestBody AttendanceRequest request) {
    var classroom = classes.findForUpdate(classId, teacherId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học."));
    ClassSession session = session(teacherId, classId, sessionId);
    if (request == null || request.records() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Danh sách điểm danh là bắt buộc.");
    Map<UUID, SessionAttendance> existing = attendance.findBySessionId(sessionId).stream()
      .collect(java.util.stream.Collectors.toMap(item -> item.getStudent().getId(), item -> item));
    Set<UUID> requested = new java.util.HashSet<>();
    List<SessionAttendance> updates = request.records().stream().map(record -> {
      if (record == null || record.studentId() == null || record.status() == null || !STATUSES.contains(record.status()) || !requested.add(record.studentId())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Danh sách hoặc trạng thái điểm danh không hợp lệ.");
      var student = students.findById(record.studentId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Học sinh không tồn tại."));
      boolean belongsToClass = classroom.getStudents().stream().anyMatch(member -> member.getId().equals(student.getId()));
      if (!belongsToClass && !existing.containsKey(student.getId())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể tạo điểm danh mới cho học sinh đã rời lớp.");
      SessionAttendance saved = existing.get(student.getId());
      if (saved == null) return new SessionAttendance(session, student, record.status());
      saved.updateStatus(record.status());
      return saved;
    }).toList();
    Set<UUID> current = classroom.getStudents().stream().map(student -> student.getId()).collect(java.util.stream.Collectors.toSet());
    return attendance.saveAll(updates).stream().map(item -> AttendanceResponse.from(item, !current.contains(item.getStudent().getId()))).toList();
  }

  private ClassSession session(UUID teacherId, UUID classId, UUID sessionId) {
    return sessions.findByIdAndChessClassIdAndChessClassTeacherId(sessionId, classId, teacherId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy buổi học."));
  }

  public record AttendanceRequest(List<AttendanceRecord> records) { }
  public record AttendanceRecord(UUID studentId, String status) { }
  public record AttendanceResponse(UUID studentId, String status, String fullName, String parentPhoneNumber, boolean leftClass) {
    static AttendanceResponse from(SessionAttendance item, boolean leftClass) { return new AttendanceResponse(item.getStudent().getId(), item.getStatus(), item.getStudent().getFullName(), item.getStudent().getParentPhoneNumber(), leftClass); }
  }
}
