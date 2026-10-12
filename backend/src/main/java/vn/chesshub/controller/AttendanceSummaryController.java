package vn.chesshub.controller;

import java.time.LocalDate;
import java.time.YearMonth;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.chesshub.entity.ChessClass;
import vn.chesshub.entity.Student;
import vn.chesshub.entity.SessionAttendance;
import org.springframework.transaction.annotation.Transactional;
import vn.chesshub.repository.ChessClassRepository;
import vn.chesshub.repository.ClassSessionRepository;
import vn.chesshub.repository.SessionAttendanceRepository;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping("/api/v1/teachers/{teacherId}/attendance-summary")
public class AttendanceSummaryController {
  private final ChessClassRepository classes;
  private final ClassSessionRepository sessions;
  private final SessionAttendanceRepository attendance;

  public AttendanceSummaryController(ChessClassRepository classes, ClassSessionRepository sessions, SessionAttendanceRepository attendance) {
    this.classes = classes;
    this.sessions = sessions;
    this.attendance = attendance;
  }

  @GetMapping
  @Transactional(readOnly = true)
  public List<ClassAttendanceSummary> list(@PathVariable UUID teacherId,
      @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
    LocalDate from = month.atDay(1);
    LocalDate to = month.atEndOfMonth();
    Map<UUID, Long> sessionCounts = sessions.findByChessClassTeacherIdAndSessionDateBetweenOrderBySessionDateAscStartTimeAsc(teacherId, from, to)
      .stream().collect(java.util.stream.Collectors.groupingBy(item -> item.getChessClass().getId(), java.util.stream.Collectors.counting()));
    List<SessionAttendance> monthAttendance = attendance.findBySessionChessClassTeacherIdAndSessionSessionDateBetween(teacherId, from, to);
    Map<String, Long> attendedCounts = monthAttendance.stream()
      .filter(item -> "PRESENT".equals(item.getStatus()) || "LATE".equals(item.getStatus()))
      .collect(java.util.stream.Collectors.groupingBy(item -> attendanceKey(item.getSession().getChessClass().getId(), item.getStudent().getId()), java.util.stream.Collectors.counting()));
    Map<String, Long> absentCounts = monthAttendance.stream()
      .filter(item -> "ABSENT".equals(item.getStatus()))
      .collect(java.util.stream.Collectors.groupingBy(item -> attendanceKey(item.getSession().getChessClass().getId(), item.getStudent().getId()), java.util.stream.Collectors.counting()));

    return classes.findWithStudentsByTeacherIdOrderByName(teacherId).stream()
      .filter(classroom -> sessionCounts.getOrDefault(classroom.getId(), 0L) > 0)
      .map(classroom -> ClassAttendanceSummary.from(classroom, sessionCounts.get(classroom.getId()), attendedCounts, absentCounts, monthAttendance))
      .toList();
  }

  private static String attendanceKey(UUID classId, UUID studentId) { return classId + ":" + studentId; }

  public record ClassAttendanceSummary(UUID classId, String className, long sessionCount, BigDecimal feePerSession, List<StudentAttendanceSummary> students) {
    static ClassAttendanceSummary from(ChessClass classroom, long sessionCount, Map<String, Long> attendedCounts, Map<String, Long> absentCounts, List<SessionAttendance> history) {
      Map<UUID, Student> roster = new java.util.LinkedHashMap<>();
      classroom.getStudents().forEach(student -> roster.put(student.getId(), student));
      history.stream().filter(item -> item.getSession().getChessClass().getId().equals(classroom.getId()))
        .forEach(item -> roster.putIfAbsent(item.getStudent().getId(), item.getStudent()));
      var currentIds = classroom.getStudents().stream().map(Student::getId).collect(java.util.stream.Collectors.toSet());
      List<StudentAttendanceSummary> students = roster.values().stream()
        .map(student -> {
          long attendedDays = attendedCounts.getOrDefault(attendanceKey(classroom.getId(), student.getId()), 0L);
          long absentSessions = absentCounts.getOrDefault(attendanceKey(classroom.getId(), student.getId()), 0L);
          return new StudentAttendanceSummary(student.getId(), student.getFullName(), attendedDays, classroom.getFeePerSession().multiply(BigDecimal.valueOf(attendedDays)), !currentIds.contains(student.getId()), absentSessions);
        })
        .sorted(java.util.Comparator.comparing(StudentAttendanceSummary::studentName, String.CASE_INSENSITIVE_ORDER))
        .toList();
      return new ClassAttendanceSummary(classroom.getId(), classroom.getName(), sessionCount, classroom.getFeePerSession(), students);
    }
  }

  public record StudentAttendanceSummary(UUID studentId, String studentName, long attendedDays, BigDecimal tuitionAmount, boolean leftClass, long absentSessions) { }
}
