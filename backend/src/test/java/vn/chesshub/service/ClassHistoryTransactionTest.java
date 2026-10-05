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
      ChessClass classroom = new ChessClass(teacher, "Class", "", 0, "blue", BigDecimal.valueOf(100000)); classroom.addStudent(student); classroom = classes.save(classroom); classId = classroom.getId();
      ChessClass other = new ChessClass(teacher, "Other", "", 0, "blue"); other.addStudent(student); otherClassId = classes.save(other).getId();
      sessionId = sessions.save(new ClassSession(classroom, date, LocalTime.of(17, 0), LocalTime.of(18, 0))).getId();
    });
  }
  ClassScheduleService.RecurringRequest request(String token) {
    return new ClassScheduleService.RecurringRequest(date, date, List.of(date.getDayOfWeek().getValue()), LocalTime.of(19, 0), LocalTime.of(20, 0), token);
  }
  void mark() { attendanceApi.save(teacherId, classId, sessionId, new AttendanceController.AttendanceRequest(List.of(new AttendanceController.AttendanceRecord(studentId, "PRESENT")))); }

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
