package vn.chesshub.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.*;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.controller.*;
import vn.chesshub.entity.*;
import vn.chesshub.repository.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(properties = {"spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop"}, showSql = false)
@Import({ChessClassService.class, StudentImportService.class, AttendanceController.class, AttendanceSummaryController.class, TournamentService.class, StudentImportIntegrationTest.JsonConfig.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class StudentImportIntegrationTest {
  @TestConfiguration static class JsonConfig { @Bean ObjectMapper mapper() { return new ObjectMapper().findAndRegisterModules(); } }
  @Autowired UserRepository users;
  @Autowired StudentRepository profiles;
  @Autowired ChessClassRepository classes;
  @Autowired ClassSessionRepository sessions;
  @Autowired JdbcTemplate db;
  @Autowired StudentImportService imports;
  @Autowired TournamentService tournaments;
  @Autowired ChessClassService classroom;
  @Autowired AttendanceController attendance;
  @Autowired AttendanceSummaryController summary;
  @Autowired PlatformTransactionManager manager;
  UUID userId, classId, sessionId;
  TransactionTemplate tx;
  @BeforeEach void setup() {
    tx = new TransactionTemplate(manager);
    db.execute("create table if not exists centers (id uuid primary key)");
    db.execute("create table if not exists center_memberships (center_id uuid, user_id uuid, status varchar(32))");
    db.execute("create table if not exists student_import_rows (import_id uuid, row_number integer, class_id uuid, user_id uuid, payload_hash varchar(64), result_json text, primary key(import_id, row_number))");
    tx.executeWithoutResult(status -> {
      User teacher = users.save(new User("Teacher", UUID.randomUUID() + "@example.com", "hash")); userId = teacher.getId();
      ChessClass c = new ChessClass(teacher, "Lớp thử", "", 0, "blue"); c.confirmScope(null); classId = classes.save(c).getId();
      sessionId = sessions.save(new ClassSession(c, LocalDate.now(), LocalTime.NOON, LocalTime.of(13, 0))).getId();
    });
  }
  StudentImportService.Row row(int n, String name, String... data) {
    Map<String,String> values = new HashMap<>(); values.put("fullName", name);
    for (int i = 0; i < data.length; i += 2) values.put(data[i], data[i + 1]);
    return new StudentImportService.Row(n, values, null, null, false, null);
  }
  StudentImportService.Result commit(StudentImportService.Row row) { return imports.commit(userId, classId, new StudentImportService.Batch(UUID.randomUUID(), List.of(row))).getFirst(); }
  long count() { return db.queryForObject("select count(*) from student where owner_user_id = ?", Long.class, userId); }

  @Test void draftPreviewDoesNotPersistClassesProfilesMembersOrReceipts() {
    long beforeClasses = classes.count(), beforeProfiles = count();
    int beforeMembers = db.queryForObject("select count(*) from chess_class_students", Integer.class);
    int beforeReceipts = db.queryForObject("select count(*) from student_import_rows", Integer.class);
    var found = imports.previewDraft(userId, new StudentImportService.DraftBatch(null, List.of(row(2, "Draft Name"), row(3, "Draft Profile", "birthDate", "12/03/2017"))));
    assertEquals("CLASS_ONLY", found.get(0).action());
    assertEquals("CREATE_PROFILE", found.get(1).action());
    assertEquals(LocalDate.of(2017, 3, 12), found.get(1).student().birthDate());
    assertEquals(beforeClasses, classes.count()); assertEquals(beforeProfiles, count());
    assertEquals(beforeMembers, db.queryForObject("select count(*) from chess_class_students", Integer.class));
    assertEquals(beforeReceipts, db.queryForObject("select count(*) from student_import_rows", Integer.class));
  }

  @Test void draftPreviewChecksStagedDuplicatesDatesFormulasAndPhoneWarnings() {
    var numericPhone = new StudentImportService.Row(9, Map.of("fullName", "Numeric Phone", "parentPhoneNumber", "901234567"), null, null, false, null, Map.of("parentPhoneNumber", "SĐT có thể mất số 0 đầu."));
    var found = imports.previewDraft(userId, new StudentImportService.DraftBatch(null, List.of(row(1, "Staged"), row(5, " staged "), row(6, "Invalid Date", "birthDate", "31/02/2017"), row(7, "Formula", "notes", StudentWorkbookService.FORMULA), row(8, "Future", "birthDate", "2999-01-01"), numericPhone)));
    assertEquals("CLASS_ONLY", found.getFirst().action());
    assertTrue(found.subList(1, found.size()).stream().allMatch(result -> result.action().equals("ERROR")));
    assertTrue(found.get(1).message().contains("trùng"));
    assertTrue(found.subList(1, found.size()).stream().allMatch(result -> result.student() == null));
    var duplicates = List.of(row(1, "One"), row(1, "Two"));
    assertThrows(ResponseStatusException.class, () -> imports.previewDraft(userId, new StudentImportService.DraftBatch(null, duplicates)));
  }

  @Test void draftPreviewResolvesNameOnlyExistingProfilesAndPreservesCanonicalIdentity() {
    var saved = commit(row(2, "Existing Draft", "birthDate", "2017-03-12", "parentName", "Parent", "parentPhoneNumber", "0901234567"));
    var unresolved = imports.previewDraft(userId, new StudentImportService.DraftBatch(null, List.of(row(2, "Existing Draft")))).getFirst();
    assertEquals("RESOLVE", unresolved.action()); assertEquals(saved.studentId(), unresolved.candidates().getFirst().studentId());
    var selected = new StudentImportService.Row(2, Map.of("fullName", "Existing Draft"), saved.studentId(), null, false, null);
    var found = imports.previewDraft(userId, new StudentImportService.DraftBatch(null, List.of(selected))).getFirst();
    assertEquals("REUSE", found.action()); assertEquals(saved.studentId(), found.student().studentId());
    assertEquals("Parent", found.student().parentName()); assertEquals(LocalDate.of(2017, 3, 12), found.student().birthDate());
    var automatic = imports.previewDraft(userId, new StudentImportService.DraftBatch(null, List.of(row(2, "Existing Draft", "birthDate", "12/03/2017", "parentPhoneNumber", "0901234567")))).getFirst();
    assertEquals(saved.studentId(), automatic.student().studentId());
    UUID other = tx.execute(status -> users.save(new User("Other", UUID.randomUUID() + "@example.com", "hash")).getId());
    assertEquals("ERROR", imports.previewDraft(other, new StudentImportService.DraftBatch(null, List.of(selected))).getFirst().action());
    assertThrows(ResponseStatusException.class, () -> imports.authorizeDraft(userId, UUID.randomUUID()));
  }

  @Test void nameOnlyMembersCanPlayInClassAndSessionTournamentsWithoutProfiles() {
    var an = commit(row(2, "An")); var binh = commit(row(3, "Bình"));
    var tournament = tournaments.create(userId, classId, sessionId, "Giải thử", List.of(an.membershipId(), binh.membershipId()), List.of(), List.of("WIN_COUNT"));
    assertNotNull(tournament.getId()); assertEquals(0, count());
    assertEquals(2, db.queryForObject("select count(*) from tournament_participants where tournament_id = ? and student_id is null", Integer.class, tournament.getId()));
  }
  @Test void formulasAndOversizedOrDuplicateBatchesAreRejected() {
    assertEquals("ERROR", imports.preview(userId, classId, List.of(row(2, "An", "notes", StudentWorkbookService.FORMULA))).getFirst().action());
    var r = row(2, "An");
    assertThrows(ResponseStatusException.class, () -> imports.preview(userId, classId, List.of(r, r)));
    assertThrows(ResponseStatusException.class, () -> imports.preview(userId, classId, java.util.stream.IntStream.range(1, 1002).mapToObj(i -> row(i, "An")).toList()));
  }
  @Test void nameOnlyMemberCanAttendAndBeEnrichedWithoutLosingHistory() {
    var result = commit(row(2, "An")); assertTrue(result.success()); assertNull(result.studentId()); assertEquals(0, count());
    attendance.save(userId, classId, sessionId, new AttendanceController.AttendanceRequest(List.of(new AttendanceController.AttendanceRecord(result.membershipId(), null, "PRESENT"))));
    var enriched = classroom.supplement(userId, classId, new ChessClassService.StudentCommand("An", null, "Mẹ An", null, null, null, null, result.membershipId(), false));
    assertEquals(result.membershipId(), enriched.getId()); assertNotNull(enriched.getStudentId()); assertEquals(1, count());
    var old = attendance.list(userId, classId, sessionId).getFirst();
    assertEquals(result.membershipId(), old.membershipId()); assertEquals(enriched.getStudentId(), old.studentId()); assertEquals("PRESENT", old.status());
    classroom.removeStudent(userId, classId, result.membershipId());
    assertTrue(attendance.list(userId, classId, sessionId).getFirst().leftClass());
    assertEquals(1, summary.list(userId, YearMonth.now()).getFirst().students().size());
  }
  @Test void eachAdditionalFieldCreatesAProfileWithoutRequiringBirthDate() {
    for (String[] pair : List.of(new String[]{"birthDate", "03/02/2016"}, new String[]{"parentName", "Mẹ"}, new String[]{"parentPhoneNumber", "0901234567"}, new String[]{"phoneNumber", "0912345678"}, new String[]{"notes", "Học mới"})) {
      var result = commit(row(2, "An " + pair[0], pair)); assertTrue(result.success(), result.message()); assertTrue(result.profileCreated()); assertNotNull(result.studentId());
    }
    assertEquals(5, count());
  }
  @Test void invalidRowsDoNotPreventValidRowsAndNeverBecomeNameOnlyMembers() {
    var batch = new StudentImportService.Batch(UUID.randomUUID(), List.of(row(2, "An"), row(3, "Bình", "birthDate", "31/02/2016"), row(4, "Chi", "phoneNumber", "abc"), row(5, " "), row(6, "Dũng", "birthDate", LocalDate.now().plusYears(1).toString())));
    var results = imports.commit(userId, classId, batch);
    assertTrue(results.getFirst().success()); assertEquals(4, results.stream().filter(r -> !r.success()).count());
    assertEquals(0, count()); assertEquals(1, db.queryForObject("select count(*) from chess_class_students where chess_class_id = ?", Integer.class, classId));
  }
  @Test void retryReceiptsPreventNameOnlyDuplicatesAndRejectChangedSuccessfulRows() {
    UUID id = UUID.randomUUID(); var first = row(2, "An"); var batch = new StudentImportService.Batch(id, List.of(first));
    var saved = imports.commit(userId, classId, batch).getFirst();
    assertEquals(saved, imports.commit(userId, classId, batch).getFirst());
    assertEquals("ERROR", imports.commit(userId, classId, new StudentImportService.Batch(id, List.of(row(2, "Bình")))).getFirst().action());
    assertEquals(1, db.queryForObject("select count(*) from chess_class_students where chess_class_id = ?", Integer.class, classId));
    assertEquals("ERROR", imports.preview(userId, classId, List.of(first)).getFirst().action());
  }
  @Test void repeatedNameIsAnErrorAndOldReuseChoiceCannotBypassIt() {
    var first = row(2, "An"); var second = row(3, "An");
    assertEquals("ERROR", imports.preview(userId, classId, List.of(first, second)).get(1).action());
    second = new StudentImportService.Row(3, second.values(), null, null, false, 2);
    var results = imports.commit(userId, classId, new StudentImportService.Batch(UUID.randomUUID(), List.of(first, second)));
    assertTrue(results.getFirst().success()); assertFalse(results.get(1).success()); assertEquals(1, db.queryForObject("select count(*) from chess_class_students where chess_class_id = ?", Integer.class, classId));
  }
  @Test void duplicateNamesAreErrorsEvenWhenOldClientConfirmsNewPerson() {
    commit(row(2, "An")); var r = row(2, "An");
    assertEquals("ERROR", imports.preview(userId, classId, List.of(r)).getFirst().action());
    assertFalse(commit(new StudentImportService.Row(r.rowNumber(), r.values(), null, null, true, null)).success());
    assertEquals(1, db.queryForObject("select count(*) from chess_class_students where chess_class_id = ?", Integer.class, classId));
  }
  @Test void exactProfileIsReusedWithoutOverwritingAndMissingBirthRequiresChoice() {
    var r = row(2, "An", "birthDate", "2016-02-03", "parentPhoneNumber", "0901234567", "notes", "Ghi chú cũ");
    var saved = commit(r); assertTrue(saved.success());
    assertFalse(commit(r).success());
    classId = tx.execute(status -> {
      var other = new ChessClass(users.findById(userId).orElseThrow(), "Lớp khác", "", 0, "blue"); other.confirmScope(null); return classes.save(other).getId();
    });
    assertEquals("RESOLVE", imports.preview(userId, classId, List.of(row(2, "An", "notes", "Mới"))).getFirst().action());
    var reused = commit(row(2, "an", "birthDate", "03/02/2016", "parentPhoneNumber", "090 123 4567", "notes", "Mới"));
    assertTrue(reused.success()); assertFalse(reused.profileCreated()); assertTrue(reused.enrolled()); assertEquals(saved.studentId(), reused.studentId());
    assertEquals("Ghi chú cũ", profiles.findById(saved.studentId()).orElseThrow().getNotes());
  }
  @Test void manualDuplicatesCannotBypassValidationByProfileOrMembershipId() {
    var saved = commit(row(2, "Nguyễn Minh An", "notes", "Cũ"));
    var duplicate = new ChessClassService.StudentCommand("  NGUYỄN   Minh An ", LocalDate.of(2018, 1, 1), null, null, null, null, null, null, true);
    assertEquals("Học sinh đã có trong lớp.", assertThrows(ResponseStatusException.class, () -> classroom.enroll(userId, classId, duplicate)).getReason());
    assertThrows(ResponseStatusException.class, () -> classroom.enroll(userId, classId, new ChessClassService.StudentCommand(null, null, null, null, null, null, saved.studentId())));
    assertThrows(ResponseStatusException.class, () -> classroom.enroll(userId, classId, new ChessClassService.StudentCommand("Nguyễn Minh An", null, null, null, null, null, null, saved.membershipId(), true)));
    assertEquals(1, count());
  }
  @Test void duplicateNamesInNewClassRollbackTheEntireCreation() {
    long before = classes.count();
    var schedule = new ChessClassService.ScheduleCommand("MANUAL", List.of(new ChessClassService.SessionCommand(LocalDate.now().plusDays(10), LocalTime.of(9, 0), LocalTime.of(10, 0))), null, null, null, null, null);
    var command = new ChessClassService.CreateClassCommand("Trùng tên", java.math.BigDecimal.ZERO, List.of(new ChessClassService.StudentCommand("An", null, null, null), new ChessClassService.StudentCommand(" an ", null, null, null, null, null, null, null, true)), schedule);
    assertThrows(ResponseStatusException.class, () -> classroom.create(userId, command));
    assertEquals(before, classes.count()); assertEquals(0, count());
  }
  @Test void scopeBelongsToClassNotTeachersCurrentCenterAndRevocationBlocksWrites() {
    UUID center = UUID.randomUUID(), other = UUID.randomUUID();
    db.update("insert into centers values (?)", center);
    db.update("insert into center_memberships values (?, ?, 'ACTIVE')", center, userId);
    db.update("update chess_classes set center_id = ?, scope_confirmed = true where id = ?", center, classId);
    db.update("update users set center_id = ? where id = ?", other, userId);
    var result = commit(row(2, "An", "notes", "Trung tâm")); assertTrue(result.success());
    var p = profiles.findById(result.studentId()).orElseThrow(); assertEquals(center, p.getCenterId()); assertNull(p.getOwnerUserId());
    db.update("update center_memberships set status = 'LEFT' where user_id = ?", userId);
    assertFalse(commit(row(3, "Bình")).success());
  }
  @Test void unconfirmedLegacyClassRequiresOwnerConfirmationAndDoesNotMoveProfiles() {
    var saved = commit(row(2, "An", "notes", "Cũ"));
    db.update("update chess_classes set scope_confirmed = false where id = ?", classId);
    assertThrows(ResponseStatusException.class, () -> imports.preview(userId, classId, List.of(row(3, "Bình"))));
    UUID center = UUID.randomUUID(); db.update("insert into centers values (?)", center); db.update("insert into center_memberships values (?, ?, 'ACTIVE')", center, userId);
    classroom.confirmScope(userId, classId, center);
    assertEquals(userId, profiles.findById(saved.studentId()).orElseThrow().getOwnerUserId());
  }
  @Test void foreignClassOrProfileCannotBeUsedAndRowTransactionRollsBackNewProfile() {
    UUID stranger = tx.execute(status -> users.save(new User("Other", UUID.randomUUID() + "@example.com", "hash")).getId());
    assertThrows(ResponseStatusException.class, () -> imports.authorize(stranger, classId));
    UUID foreign = tx.execute(status -> profiles.save(new Student("Foreign", null, null, "", null, stranger, null, "Other")).getId());
    var r = row(2, "Foreign", "notes", "Wrong scope");
    assertFalse(commit(new StudentImportService.Row(2, r.values(), foreign, null, false, null)).success());
    // Fail the membership insert after profile creation; that row must roll back both profile and receipt.
    db.execute("alter table chess_class_students add constraint import_test_reject_name check (full_name <> 'Rollback')");
    try {
      assertFalse(commit(row(3, "Rollback", "notes", "Must roll back")).success());
      assertEquals(0, count());
    } finally { db.execute("alter table chess_class_students drop constraint import_test_reject_name"); }
  }
}
