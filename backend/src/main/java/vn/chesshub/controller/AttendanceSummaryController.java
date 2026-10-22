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
import vn.chesshub.repository.TuitionPaymentRepository;
import vn.chesshub.entity.TuitionPayment;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping("/api/v1/teachers/{teacherId}/attendance-summary")
public class AttendanceSummaryController {
  private final ChessClassRepository classes;
  private final ClassSessionRepository sessions;
  private final SessionAttendanceRepository attendance;
  private final TuitionPaymentRepository payments;

  public AttendanceSummaryController(ChessClassRepository classes, ClassSessionRepository sessions, SessionAttendanceRepository attendance, TuitionPaymentRepository payments) {
    this.classes = classes;
    this.sessions = sessions;
    this.attendance = attendance;
    this.payments = payments;
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
      .collect(java.util.stream.Collectors.groupingBy(item -> attendanceKey(item.getSession().getChessClass().getId(), item.getMembership().getId()), java.util.stream.Collectors.counting()));
    Map<String, Long> absentCounts = monthAttendance.stream()
      .filter(item -> "ABSENT".equals(item.getStatus()))
      .collect(java.util.stream.Collectors.groupingBy(item -> attendanceKey(item.getSession().getChessClass().getId(), item.getMembership().getId()), java.util.stream.Collectors.counting()));

    var classrooms = classes.findWithStudentsByTeacherIdOrderByName(teacherId);
    var monthPayments = classrooms.isEmpty() ? List.<TuitionPayment>of() : payments.findByClassIdInAndReportMonth(classrooms.stream().map(ChessClass::getId).toList(), month.toString());
    return classrooms.stream()
      .filter(classroom -> sessionCounts.getOrDefault(classroom.getId(), 0L) > 0)
      .map(classroom -> ClassAttendanceSummary.from(classroom, sessionCounts.get(classroom.getId()), attendedCounts, absentCounts, monthAttendance, monthPayments))
      .toList();
  }

  private static String attendanceKey(UUID classId, UUID studentId) { return classId + ":" + studentId; }

  public record ClassAttendanceSummary(UUID classId, String className, long sessionCount, BigDecimal feePerSession, List<StudentAttendanceSummary> students) {
    static ClassAttendanceSummary from(ChessClass classroom, long sessionCount, Map<String, Long> attendedCounts, Map<String, Long> absentCounts, List<SessionAttendance> history, List<TuitionPayment> payments) {
      Map<UUID, vn.chesshub.entity.ClassMembership> roster = new java.util.LinkedHashMap<>();
      classroom.getActiveMemberships().forEach(student -> roster.put(student.getId(), student));
      history.stream().filter(item -> item.getSession().getChessClass().getId().equals(classroom.getId()))
        .forEach(item -> roster.putIfAbsent(item.getMembership().getId(), item.getMembership()));
      var currentIds = classroom.getActiveMemberships().stream().map(vn.chesshub.entity.ClassMembership::getId).collect(java.util.stream.Collectors.toSet());
      Map<UUID, TuitionPayment> paymentMap = payments.stream().filter(p -> p.getClassId().equals(classroom.getId()))
        .collect(java.util.stream.Collectors.toMap(TuitionPayment::getIdentityId, p -> p));
      // Keep previously collected former members even if their attendance was corrected away.
      classroom.getMemberships().stream().filter(m -> paymentMap.containsKey(m.getId()) || m.getStudentId() != null && paymentMap.containsKey(m.getStudentId()))
        .forEach(m -> roster.putIfAbsent(m.getId(), m));
      Map<UUID, List<vn.chesshub.entity.ClassMembership>> groups = roster.values().stream().collect(java.util.stream.Collectors.groupingBy(m -> m.getStudentId() == null ? m.getId() : m.getStudentId()));
      List<StudentAttendanceSummary> students = groups.entrySet().stream()
        .map(entry -> {
          var members = entry.getValue(); var student = members.getFirst();
          long attendedDays = members.stream().mapToLong(m -> attendedCounts.getOrDefault(attendanceKey(classroom.getId(), m.getId()), 0L)).sum();
          long absentSessions = members.stream().mapToLong(m -> absentCounts.getOrDefault(attendanceKey(classroom.getId(), m.getId()), 0L)).sum();
          // A name-only membership may acquire a profile later. Keep its original receipt identity/history.
          TuitionPayment payment = paymentMap.get(entry.getKey());
          if (payment == null) payment = members.stream().map(m -> paymentMap.get(m.getId())).filter(java.util.Objects::nonNull).findFirst().orElse(null);
          return new StudentAttendanceSummary(student.getId(), student.getStudentId(), student.getFullName(), attendedDays,
            classroom.getFeePerSession().multiply(BigDecimal.valueOf(attendedDays)), members.stream().noneMatch(m -> currentIds.contains(m.getId())), absentSessions,
            payment == null ? entry.getKey() : payment.getIdentityId(), payment == null ? TuitionPayment.View.empty() : TuitionPayment.View.from(payment), student.getBirthDate(),
            members.stream().map(m -> new AttendancePart(m.getId(), attendedCounts.getOrDefault(attendanceKey(classroom.getId(), m.getId()), 0L), absentCounts.getOrDefault(attendanceKey(classroom.getId(), m.getId()), 0L), !currentIds.contains(m.getId()))).toList());
        })
        .sorted(java.util.Comparator.comparing(StudentAttendanceSummary::studentName, String.CASE_INSENSITIVE_ORDER))
        .toList();
      return new ClassAttendanceSummary(classroom.getId(), classroom.getName(), sessionCount, classroom.getFeePerSession(), students);
    }
  }

  public record AttendancePart(UUID membershipId, long attendedDays, long absentSessions, boolean leftClass) { }
  public record StudentAttendanceSummary(UUID membershipId, UUID studentId, String studentName, long attendedDays, BigDecimal tuitionAmount, boolean leftClass, long absentSessions, UUID identityId, TuitionPayment.View payment, LocalDate birthDate, List<AttendancePart> attendanceParts) { }
}
