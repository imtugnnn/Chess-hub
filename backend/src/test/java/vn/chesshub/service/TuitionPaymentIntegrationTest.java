package vn.chesshub.service;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.controller.AttendanceSummaryController;
import vn.chesshub.entity.*;
import vn.chesshub.repository.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(properties = {"spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop"}, showSql = false)
@Import({TuitionPaymentService.class, AttendanceSummaryController.class})
class TuitionPaymentIntegrationTest {
  @Autowired UserRepository users;
  @Autowired StudentRepository students;
  @Autowired ChessClassRepository classes;
  @Autowired ClassSessionRepository sessions;
  @Autowired SessionAttendanceRepository attendance;
  @Autowired TuitionPaymentRepository payments;
  @Autowired TuitionPaymentEventRepository events;
  @Autowired TuitionPaymentService service;
  @Autowired AttendanceSummaryController summary;
  @Autowired jakarta.persistence.EntityManager entityManager;
  UUID teacherId, classId, identityId;
  final YearMonth month = YearMonth.of(2030, 1);

  @BeforeEach void setup() {
    User teacher = users.save(new User("Teacher", UUID.randomUUID() + "@example.com", "hash")); teacherId = teacher.getId();
    ChessClass c = new ChessClass(teacher, "Lớp A", "", 0, "blue", new BigDecimal("100000")); c.confirmScope(null);
    Student s = students.save(new Student("An", LocalDate.of(2015, 1, 1), "", "", null, null));
    c.addStudent(s); classes.saveAndFlush(c); classId = c.getId(); identityId = s.getId();
    ClassSession session = sessions.save(new ClassSession(c, month.atDay(7), LocalTime.NOON, LocalTime.of(13, 0)));
    attendance.saveAndFlush(new SessionAttendance(session, c.getActiveMemberships().iterator().next(), "PRESENT"));
  }
  TuitionPaymentService.Command command(UUID op, boolean collected, long version, String amount) {
    return new TuitionPaymentService.Command(collected, version, new BigDecimal(amount));
  }
  @Test void collectionAndOneClickRevokePersistOnlyCurrentStateWithoutHistory() {
    UUID op = UUID.randomUUID();
    var saved = service.save(teacherId, classId, identityId, month, command(op, true, 0, "100000"));
    assertTrue(saved.collected()); assertEquals(1, saved.revision());
    entityManager.flush(); entityManager.clear();
    service.save(teacherId, classId, identityId, month, command(op, true, 0, "100000"));
    assertEquals(0, events.count());
    var row = summary.list(teacherId, month).getFirst().students().getFirst();
    assertEquals(0, new BigDecimal("100000").compareTo(row.payment().amount()));
    assertEquals("Teacher", row.payment().updatedByName());
    var revoked = service.save(teacherId, classId, identityId, month, command(UUID.randomUUID(), false, 1, "100000"));
    assertFalse(revoked.collected()); assertEquals(0, revoked.amount().signum());
    assertEquals(0, events.count()); assertEquals(1, payments.count());
    entityManager.flush(); entityManager.clear();
    var reloaded = summary.list(teacherId, month).getFirst().students().getFirst().payment();
    assertFalse(reloaded.collected()); assertEquals(2, reloaded.revision());
    service.save(teacherId, classId, identityId, month, command(UUID.randomUUID(), false, 1, "100000"));
    assertEquals(2, payments.findAll().getFirst().getRevision());
  }
  @Test void staleRevisionAndChangedTuitionCannotOverwrite() {
    UUID op = UUID.randomUUID(); service.save(teacherId, classId, identityId, month, command(op, true, 0, "100000"));
    assertStatus(409, () -> service.save(teacherId, classId, identityId, month, command(UUID.randomUUID(), false, 0, "100000")));
    assertStatus(409, () -> service.save(teacherId, classId, identityId, month, command(op, false, 0, "100000")));
    var c = classes.findById(classId).orElseThrow(); c.updateFeePerSession(new BigDecimal("200000")); classes.flush();
    assertStatus(409, () -> service.save(teacherId, classId, identityId, month, command(UUID.randomUUID(), true, 1, "100000")));
    assertEquals(0, summary.list(teacherId, month).getFirst().students().getFirst().payment().amount().compareTo(new BigDecimal("100000")));
    service.save(teacherId, classId, identityId, month, command(UUID.randomUUID(), true, 1, "200000"));
    assertEquals(0, events.count());
  }
  @Test void unrelatedTeacherStudentMonthAndZeroDuesCannotBeMarked() {
    assertStatus(404, () -> service.save(UUID.randomUUID(), classId, identityId, month, command(UUID.randomUUID(), true, 0, "100000")));
    assertStatus(404, () -> service.save(teacherId, classId, UUID.randomUUID(), month, command(UUID.randomUUID(), true, 0, "100000")));
    assertStatus(404, () -> service.save(teacherId, classId, identityId, month.plusMonths(1), command(UUID.randomUUID(), true, 0, "100000")));
    var c = classes.findById(classId).orElseThrow(); c.updateFeePerSession(BigDecimal.ZERO); classes.flush();
    assertStatus(400, () -> service.save(teacherId, classId, identityId, month, command(UUID.randomUUID(), true, 0, "0")));
    assertEquals(0, events.count());
  }
  @Test void formerStudentWithCorrectedAttendanceRemainsVisibleForReconciliation() {
    service.save(teacherId, classId, identityId, month, command(UUID.randomUUID(), true, 0, "100000"));
    var c = classes.findById(classId).orElseThrow(); c.getActiveMemberships().forEach(m -> m.setActive(false));
    attendance.deleteAll(); attendance.flush();
    var row = summary.list(teacherId, month).getFirst().students().getFirst();
    assertTrue(row.leftClass()); assertEquals(0, row.tuitionAmount().signum()); assertTrue(row.payment().collected());
    service.save(teacherId, classId, identityId, month, command(UUID.randomUUID(), false, 1, "0"));
    assertEquals(0, events.count());
  }
  @Test void classOnlyMembershipRetainsPaymentAfterProfileEnrichmentWithoutAffectingOtherStudent() {
    var c = classes.findById(classId).orElseThrow();
    var member = c.addMembership("Học sinh chỉ có tên", null); classes.saveAndFlush(c);
    var session = sessions.findAll().getFirst();
    attendance.saveAndFlush(new SessionAttendance(session, member, "LATE"));
    // Payment is a later request, after the membership/attendance transaction has been saved.
    entityManager.flush(); entityManager.clear();
    service.save(teacherId, classId, member.getId(), month, command(UUID.randomUUID(), true, 0, "100000"));
    var rows = summary.list(teacherId, month).getFirst().students();
    assertTrue(rows.stream().filter(r -> r.identityId().equals(member.getId())).findFirst().orElseThrow().payment().collected());
    assertFalse(rows.stream().filter(r -> r.identityId().equals(identityId)).findFirst().orElseThrow().payment().collected());
    Student profile = students.save(new Student("Học sinh chỉ có tên", LocalDate.of(2015, 1, 1), "", "", null, null));
    classes.findById(classId).orElseThrow().getMemberships().stream().filter(m -> m.getId().equals(member.getId())).findFirst().orElseThrow().link(profile);
    entityManager.flush(); entityManager.clear();
    var enriched = summary.list(teacherId, month).getFirst().students().stream().filter(r -> profile.getId().equals(r.studentId())).findFirst().orElseThrow();
    assertEquals(member.getId(), enriched.identityId()); assertTrue(enriched.payment().collected());
    assertEquals(0, events.count());
    service.save(teacherId, classId, enriched.identityId(), month, command(UUID.randomUUID(), false, 1, "100000"));
    assertEquals(0, events.count());
  }
  static void assertStatus(int code, Runnable call) { assertEquals(code, assertThrows(ResponseStatusException.class, call::run).getStatusCode().value()); }
}
