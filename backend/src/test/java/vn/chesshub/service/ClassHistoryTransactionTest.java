package vn.chesshub.service;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.controller.AttendanceController;
import vn.chesshub.controller.AttendanceSummaryController;
import vn.chesshub.entity.*;
import vn.chesshub.repository.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(properties = { "spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false" }, showSql = false)
@Import({ ClassScheduleService.class, ChessClassService.class, AttendanceController.class, AttendanceSummaryController.class })
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class ClassHistoryTransactionTest {
  @Autowired UserRepository users;
  @Autowired StudentRepository students;
  @Autowired ChessClassRepository classes;
  @Autowired ClassSessionRepository sessions;
  @Autowired SessionAttendanceRepository attendance;
  @Autowired TournamentRepository tournaments;
  @Autowired ClassScheduleService schedules;
  @Autowired ChessClassService classService;
  @Autowired AttendanceController attendanceApi;
  @Autowired AttendanceSummaryController summaryApi;
  @Autowired JdbcTemplate db;
  @Autowired PlatformTransactionManager transactionManager;
  TransactionTemplate tx;
  UUID teacherId, classId, sessionId, studentId, otherClassId;
  LocalDate date = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(7);

  @BeforeEach void setup() {
    tx = new TransactionTemplate(transactionManager);
    db.execute("CREATE TABLE IF NOT EXISTS session_materials (session_id UUID NOT NULL, material_id UUID NOT NULL, PRIMARY KEY(session_id, material_id))");
    tx.executeWithoutResult(status -> {
      User teacher = users.save(new User("Teacher", UUID.randomUUID() + "@example.com", "hash")); teacherId = teacher.getId();
      Student student = students.save(new Student("An", LocalDate.of(2015, 1, 1), "Phụ huynh", "0901234567", null, teacherId)); studentId = student.getId();
      ChessClass classroom = new ChessClass(teacher, "Class", "", 0, "blue", BigDecimal.valueOf(100000)); classroom.confirmScope(null); classroom.addStudent(student); classroom = classes.save(classroom); classId = classroom.getId();
      ChessClass other = new ChessClass(teacher, "Other", "", 0, "blue"); other.confirmScope(null); other.addStudent(student); otherClassId = classes.save(other).getId();
      sessionId = sessions.save(new ClassSession(classroom, date, LocalTime.of(17, 0), LocalTime.of(18, 0))).getId();
    });
  }
  ClassScheduleService.RecurringRequest request(String token) {
    return new ClassScheduleService.RecurringRequest(date, date, List.of(date.getDayOfWeek().getValue()), LocalTime.of(19, 0), LocalTime.of(20, 0), token);
  }
  void mark() { attendanceApi.save(teacherId, classId, sessionId, new AttendanceController.AttendanceRequest(List.of(new AttendanceController.AttendanceRecord(studentId, "PRESENT")))); }

  @Test void addingStudentAcceptsOnlyNameAndBirthAndReusesExplicitProfileWithoutCopying() {
    var created = classService.addStudent(teacherId, classId, new ChessClassService.StudentCommand("New child", LocalDate.of(2016, 1, 2), null, null));
    assertEquals("", created.getParentPhoneNumber());
    assertNull(created.getParentName());
    long count = students.count();
    var reused = classService.addStudent(teacherId, otherClassId, new ChessClassService.StudentCommand(null, null, null, null, null, null, created.getId()));
    assertEquals(created.getId(), reused.getId());
    assertEquals(count, students.count());
    assertThrows(ResponseStatusException.class, () -> classService.addStudent(teacherId, otherClassId,
      new ChessClassService.StudentCommand(null, null, null, null, null, null, created.getId())));
    UUID foreignId = tx.execute(status -> {
      User other = users.save(new User("Other teacher", UUID.randomUUID() + "@example.com", "hash"));
      return students.save(new Student("Foreign", LocalDate.of(2016, 1, 2), null, "", null, other.getId())).getId();
    });
    assertThrows(ResponseStatusException.class, () -> classService.addStudent(teacherId, classId,
      new ChessClassService.StudentCommand(null, null, null, null, null, null, foreignId)));
  }

  @Test void removingMembershipPreservesAttendanceTuitionOtherClassAndTournamentRows() {
    mark();
    UUID tournamentId = tx.execute(status -> tournaments.save(new Tournament(teacherId, classes.findById(classId).orElseThrow(), sessions.findById(sessionId).orElseThrow(), "Giải")).getId());
    classService.removeStudent(teacherId, classId, studentId);
    tx.executeWithoutResult(status -> {
      assertTrue(classes.findById(classId).orElseThrow().getStudents().isEmpty()); assertEquals(0, classes.findById(classId).orElseThrow().getStudentCount());
      assertEquals(1, classes.findById(otherClassId).orElseThrow().getStudents().size());
      assertTrue(students.existsById(studentId)); assertTrue(tournaments.existsById(tournamentId));
    });
    assertTrue(attendanceApi.list(teacherId, classId, sessionId).getFirst().leftClass());
    var summary = summaryApi.list(teacherId, YearMonth.from(date)).stream().filter(item -> item.classId().equals(classId)).findFirst().orElseThrow().students().getFirst();
    assertEquals(BigDecimal.valueOf(100000), summary.tuitionAmount()); assertEquals(1, summary.attendedDays());
    attendanceApi.save(teacherId, classId, sessionId, new AttendanceController.AttendanceRequest(List.of(new AttendanceController.AttendanceRecord(studentId, "LATE"))));
    assertEquals("LATE", attendanceApi.list(teacherId, classId, sessionId).getFirst().status());
    assertEquals(studentId, classService.addStudent(teacherId, classId, new ChessClassService.StudentCommand("An", LocalDate.of(2015, 1, 1), "Phụ huynh", "0901234567")).getId());
  }

  @Test void failedAttendanceBatchRollsBackEarlierStatusUpdates() {
    mark();
    assertThrows(ResponseStatusException.class, () -> attendanceApi.save(teacherId, classId, sessionId,
      new AttendanceController.AttendanceRequest(List.of(new AttendanceController.AttendanceRecord(studentId, "ABSENT"), new AttendanceController.AttendanceRecord(UUID.randomUUID(), "PRESENT")))));
    assertEquals("PRESENT", attendanceApi.list(teacherId, classId, sessionId).getFirst().status());
  }

  @Test void monthlyReportOnlyIncludesScheduledClassesAndCountsPresentLateAndAbsentSeparately() {
    YearMonth reportMonth = YearMonth.from(date);
    tx.executeWithoutResult(status -> {
      ChessClass classroom = classes.findById(classId).orElseThrow();
      Student student = students.findById(studentId).orElseThrow();
      String[] states = {"PRESENT", "LATE", "ABSENT"};
      for (int i = 0; i < states.length; i++) {
        ClassSession lesson = sessions.save(new ClassSession(classroom, reportMonth.atDay(i + 1), LocalTime.of(12, 0), LocalTime.of(13, 0)));
        attendance.save(new SessionAttendance(lesson, student, states[i]));
      }
      sessions.save(new ClassSession(classroom, reportMonth.atDay(4), LocalTime.of(12, 0), LocalTime.of(13, 0)));
      sessions.save(new ClassSession(classes.findById(otherClassId).orElseThrow(), reportMonth.minusMonths(1).atDay(1), LocalTime.of(12, 0), LocalTime.of(13, 0)));
    });
    var report = summaryApi.list(teacherId, reportMonth);
    assertEquals(1, report.size()); assertEquals(classId, report.getFirst().classId());
    assertEquals(5, report.getFirst().sessionCount());
    var student = report.getFirst().students().getFirst();
    assertEquals(2, student.attendedDays()); assertEquals(1, student.absentSessions());
    assertEquals(BigDecimal.valueOf(200000), student.tuitionAmount());
    assertTrue(summaryApi.list(teacherId, reportMonth.plusMonths(2)).isEmpty());
  }

  @Test void monthlyReportRetainsUnmarkedRosterAndAbsentOnlyFormerStudents() {
    attendanceApi.save(teacherId, classId, sessionId, new AttendanceController.AttendanceRequest(List.of(new AttendanceController.AttendanceRecord(studentId, "ABSENT"))));
    classService.removeStudent(teacherId, classId, studentId);
    UUID currentStudentId = tx.execute(status -> {
      Student current = students.save(new Student("Unmarked", LocalDate.of(2016, 1, 1), "Parent", "0902345678", null, teacherId));
      classes.findById(classId).orElseThrow().addStudent(current);
      return current.getId();
    });
    var students = summaryApi.list(teacherId, YearMonth.from(date)).getFirst().students();
    var former = students.stream().filter(s -> s.studentId().equals(studentId)).findFirst().orElseThrow();
    assertTrue(former.leftClass()); assertEquals(0, former.attendedDays()); assertEquals(1, former.absentSessions());
    var current = students.stream().filter(s -> s.studentId().equals(currentStudentId)).findFirst().orElseThrow();
    assertFalse(current.leftClass()); assertEquals(0, current.attendedDays()); assertEquals(0, current.absentSessions());
  }

  @Test void existingProfileCanBeLinkedByIdWithoutCreatingOrChangingOwnership() {
    classService.removeStudent(teacherId, classId, studentId);
    assertEquals(studentId, classService.addExistingStudent(teacherId, classId, studentId).getId());
    tx.executeWithoutResult(status -> {
      Student stored = students.findById(studentId).orElseThrow();
      assertEquals(teacherId, stored.getOwnerUserId()); assertNull(stored.getCenterId());
      assertEquals(1, classes.findById(classId).orElseThrow().getStudents().size());
    });
    assertThrows(ResponseStatusException.class, () -> classService.addExistingStudent(teacherId, classId, studentId));
  }

  @Test void linkingByIdRejectsAnotherTeachersPersonalProfile() {
    UUID foreignStudent = tx.execute(status -> {
      User other = users.save(new User("Other", UUID.randomUUID() + "@example.com", "hash"));
      return students.save(new Student("Foreign", LocalDate.of(2015, 1, 1), "Parent", "0901234567", null, other.getId())).getId();
    });
    assertThrows(ResponseStatusException.class, () -> classService.addExistingStudent(teacherId, classId, foreignStudent));
    tx.executeWithoutResult(status -> assertEquals(1, classes.findById(classId).orElseThrow().getStudents().size()));
  }

  @Test void quickCreationPersistsOptionalFieldsAndReusingProfileCannotOverwriteThem() {
    var command = new ChessClassService.StudentCommand("New with notes", LocalDate.of(2015, 2, 3), "Parent", "0901234567", "091 234 5678", "First\nSecond");
    Student created = classService.addStudent(teacherId, classId, command);
    UUID createdId = created.getId();
    tx.executeWithoutResult(status -> {
      Student stored = students.findById(createdId).orElseThrow();
      assertEquals("0912345678", stored.getPhoneNumber()); assertEquals("First\nSecond", stored.getNotes());
    });
    Student reused = classService.addStudent(teacherId, otherClassId,
      new ChessClassService.StudentCommand("New with notes", LocalDate.of(2015, 2, 3), "Parent", "0901234567", "0923456789", "Overwrite"));
    assertEquals(createdId, reused.getId());
    tx.executeWithoutResult(status -> assertEquals("First\nSecond", students.findById(createdId).orElseThrow().getNotes()));
  }

  @Test void classCreationPersistsOptionalProfileFieldsAndRejectsInvalidPhone() {
    var planned = new ChessClassService.ScheduleCommand("MANUAL", List.of(new ChessClassService.SessionCommand(date.plusDays(1), LocalTime.of(10, 0), LocalTime.of(11, 0))), null, null, null, null, null);
    var result = classService.create(teacherId, new ChessClassService.CreateClassCommand("New class", BigDecimal.ZERO,
      List.of(new ChessClassService.StudentCommand("Class student", LocalDate.of(2016, 1, 1), "Parent", "0901234567", "0934567890", "From class creation")), planned));
    tx.executeWithoutResult(status -> {
      Student created = classes.findById(result.chessClass().getId()).orElseThrow().getStudents().iterator().next();
      assertEquals("0934567890", created.getPhoneNumber()); assertEquals("From class creation", created.getNotes());
    });
    assertThrows(ResponseStatusException.class, () -> classService.addStudent(teacherId, classId,
      new ChessClassService.StudentCommand("Invalid phone", LocalDate.of(2016, 1, 1), "Parent", "0901234567", "abc", null)));
  }

  @Test void bulkReplacementRollbackRestoresDeletedSessionAndClassDescription() {
    var preview = schedules.preview(teacherId, classId, request(null));
    assertThrows(IllegalStateException.class, () -> tx.executeWithoutResult(status -> {
      schedules.apply(teacherId, classId, request(preview.token()));
      throw new IllegalStateException("Simulated failure after flush");
    }));
    tx.executeWithoutResult(status -> {
      assertTrue(sessions.existsById(sessionId)); assertEquals(1, sessions.findByChessClassIdOrderBySessionDateAscStartTimeAsc(classId).size());
      assertEquals("", classes.findById(classId).orElseThrow().getSchedule());
    });
  }

  @Test void attachedSessionIsRetainedAndStalePreviewCannotDeleteIt() {
    var preview = schedules.preview(teacherId, classId, request(null));
    db.update("INSERT INTO session_materials(session_id, material_id) VALUES (?, ?)", sessionId, UUID.randomUUID());
    assertThrows(ResponseStatusException.class, () -> schedules.apply(teacherId, classId, request(preview.token())));
    var refreshed = schedules.preview(teacherId, classId, request(null));
    schedules.apply(teacherId, classId, request(refreshed.token()));
    assertTrue(sessions.existsById(sessionId));
    assertEquals(1, db.queryForObject("SELECT count(*) FROM session_materials WHERE session_id = ?", Integer.class, sessionId));
  }

  @Test void attendanceWaitsForRemovalLockThenRejectsNewRecord() throws Exception {
    CountDownLatch removed = new CountDownLatch(1), release = new CountDownLatch(1), attempted = new CountDownLatch(1);
    ExecutorService pool = Executors.newFixedThreadPool(2);
    try {
      Future<?> removal = pool.submit(() -> tx.executeWithoutResult(status -> {
        classService.removeStudent(teacherId, classId, studentId); removed.countDown();
        try { if (!release.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Timed out"); }
        catch (InterruptedException exception) { Thread.currentThread().interrupt(); throw new IllegalStateException(exception); }
      }));
      assertTrue(removed.await(5, TimeUnit.SECONDS));
      Future<?> marking = pool.submit(() -> { attempted.countDown(); mark(); });
      assertTrue(attempted.await(5, TimeUnit.SECONDS));
      assertThrows(TimeoutException.class, () -> marking.get(150, TimeUnit.MILLISECONDS));
      release.countDown(); removal.get(5, TimeUnit.SECONDS);
      ExecutionException failure = assertThrows(ExecutionException.class, () -> marking.get(5, TimeUnit.SECONDS));
      assertInstanceOf(ResponseStatusException.class, failure.getCause());
      assertTrue(attendanceApi.list(teacherId, classId, sessionId).isEmpty());
    } finally { release.countDown(); pool.shutdownNow(); }
  }
}
