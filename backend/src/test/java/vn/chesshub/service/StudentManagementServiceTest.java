package vn.chesshub.service;

import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@JdbcTest(properties = "spring.flyway.enabled=false")
@Import(StudentManagementService.class)
class StudentManagementServiceTest {
  @Autowired JdbcTemplate db;
  @Autowired StudentManagementService service;
  UUID owner = UUID.randomUUID(), teacher = UUID.randomUUID(), stranger = UUID.randomUUID(), center = UUID.randomUUID();
  UUID personal, shared, classId = UUID.randomUUID(), otherClass = UUID.randomUUID();
  LocalDate birth = LocalDate.of(2015, 2, 3);

  @BeforeEach void setup() {
    db.execute("create table if not exists users (id uuid primary key, center_id uuid)");
    db.execute("create table if not exists centers (id uuid primary key, name varchar(255), owner_user_id uuid)");
    db.execute("create table if not exists center_memberships (center_id uuid, user_id uuid, status varchar(32))");
    db.execute("create table if not exists student (id uuid primary key, full_name varchar(255), birth_date date, parent_name varchar(255), parent_phone_number varchar(255), phone_number varchar(255), notes varchar(4000), center_id uuid, owner_user_id uuid, created_at timestamp)");
    db.execute("create table if not exists chess_classes (id uuid primary key, name varchar(255), teacher_id uuid)");
    db.execute("create table if not exists chess_class_students (chess_class_id uuid, student_id uuid)");
    db.execute("create table if not exists class_sessions (id uuid primary key, class_id uuid, session_date date, start_time time)");
    db.execute("create table if not exists session_attendance (id uuid primary key, student_id uuid, session_id uuid, status varchar(32))");
    db.update("insert into users values (?, ?), (?, ?), (?, null)", owner, center, teacher, center, stranger);
    db.update("insert into centers values (?, 'ChessHub', ?)", center, owner);
    db.update("insert into center_memberships values (?, ?, 'ACTIVE'), (?, ?, 'ACTIVE')", center, owner, center, teacher);
    personal = service.create(teacher, input("Nguyễn Minh An", null)).id();
    shared = service.create(teacher, input("Trần Gia Bảo", center)).id();
    db.update("insert into chess_classes values (?, 'Lớp A', ?), (?, 'Lớp B', ?)", classId, teacher, otherClass, stranger);
    db.update("insert into chess_class_students values (?, ?), (?, ?)", classId, shared, otherClass, shared);
  }
  StudentManagementService.Input input(String name, UUID scope) { return new StudentManagementService.Input(name, birth, "Lê Thu Hà", "090 123 4567", scope); }
  StudentManagementService.Page list(UUID user, String query, String scope, UUID cls, String enrollment, int page) { return service.list(user, query, scope, cls, enrollment, page, 25); }

  @Test void personalAndCenterStudentsRemainVisibleTogetherWithoutDuplicateRows() {
    var result = list(teacher, "", "all", null, "all", 0);
    assertEquals(2, result.total());
    assertEquals(1, result.items().stream().filter(s -> s.id().equals(shared)).count());
    assertEquals(1, result.items().stream().filter(s -> s.id().equals(shared)).findFirst().orElseThrow().classes().size());
    assertEquals(1, list(teacher, "", "personal", null, "all", 0).total());
    assertEquals(1, list(teacher, "", center.toString(), null, "all", 0).total());
    assertEquals(1, list(owner, "", "all", null, "all", 0).total());
    assertEquals(0, list(stranger, "", "all", null, "all", 0).total());
  }
  @Test void accentInsensitiveSearchAndLiteralWildcardsWorkAcrossParentAndPhone() {
    assertEquals(personal, list(teacher, "nguyen minh an", "all", null, "all", 0).items().getFirst().id());
    assertEquals(2, list(teacher, "le thu ha", "all", null, "all", 0).total());
    assertEquals(2, list(teacher, "090123", "all", null, "all", 0).total());
    assertEquals(0, list(teacher, "%", "all", null, "all", 0).total());
    assertEquals(0, list(teacher, "_", "all", null, "all", 0).total());
  }
  @Test void classAndEnrollmentFiltersAreAppliedBeforePagination() {
    assertEquals(shared, list(teacher, "", "all", classId, "enrolled", 0).items().getFirst().id());
    assertEquals(personal, list(teacher, "", "all", null, "unassigned", 0).items().getFirst().id());
    for (int i = 0; i < 27; i++) service.create(teacher, input("Học sinh " + i, null));
    assertEquals(29, list(teacher, "", "all", null, "all", 0).total());
    assertEquals(25, list(teacher, "", "all", null, "all", 0).items().size());
    var last = list(teacher, "", "all", null, "all", 99);
    assertEquals(1, last.page()); assertEquals(4, last.items().size());
  }
  @Test void membersCannotEditCenterProfilesButOwnerCanAndPersonalOwnerStillCan() {
    assertFalse(service.detail(teacher, shared, 0).student().canEdit());
    assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, () -> service.update(teacher, shared, input("Changed", center))).getStatusCode());
    assertTrue(service.detail(owner, shared, 0).student().canEdit());
    service.update(owner, shared, input("Changed", center));
    service.update(teacher, personal, input("Personal changed", null));
    assertEquals("Personal changed", service.detail(teacher, personal, 0).student().fullName());
    assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class, () -> service.update(stranger, personal, input("Foreign", null))).getStatusCode());
  }
  @Test void crossCenterFiltersCreationAndScopeChangesAreRejected() {
    assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, () -> list(stranger, "", center.toString(), null, "all", 0)).getStatusCode());
    assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, () -> service.create(stranger, input("Foreign", center))).getStatusCode());
    assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class, () -> service.update(teacher, personal, input("Changed", center))).getStatusCode());
    assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, () -> list(teacher, "", "all", otherClass, "all", 0)).getStatusCode());
  }
  @Test void leavingCenterImmediatelyRevokesSharedAccessWithoutHidingPersonalProfiles() {
    db.update("update center_memberships set status = 'LEFT' where user_id = ?", teacher);
    assertEquals(1, list(teacher, "", "all", null, "all", 0).total());
    assertTrue(service.options(teacher).centers().isEmpty());
    assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class, () -> service.detail(teacher, shared, 0)).getStatusCode());
  }
  @Test void attendanceHistoryPreservesFormerMembershipAndNeverLeaksOtherTeachers() {
    UUID ownSession = UUID.randomUUID(), foreignSession = UUID.randomUUID();
    db.update("insert into class_sessions values (?, ?, ?, '17:00:00'), (?, ?, ?, '18:00:00')", ownSession, classId, birth, foreignSession, otherClass, birth);
    db.update("insert into session_attendance values (?, ?, ?, 'PRESENT'), (?, ?, ?, 'ABSENT')", UUID.randomUUID(), shared, ownSession, UUID.randomUUID(), shared, foreignSession);
    db.update("delete from chess_class_students where chess_class_id = ?", classId);
    var detail = service.detail(teacher, shared, 0);
    assertTrue(detail.student().classes().isEmpty()); assertEquals(1, detail.historyTotal());
    assertEquals(ownSession, detail.history().getFirst().sessionId());
    assertTrue(service.detail(owner, shared, 0).history().isEmpty());
  }
  @Test void duplicatesAreScopedAndCannotBeIntroducedByEditing() {
    assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class, () -> service.create(teacher, input("nguyễn minh an", null))).getStatusCode());
    assertNotNull(service.create(teacher, input("Nguyễn Minh An", center)));
    UUID another = service.create(teacher, input("Another", null)).id();
    assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class, () -> service.update(teacher, another, input("Nguyễn Minh An", null))).getStatusCode());
  }
  @Test void validationRejectsFutureBirthDatesBadPhonesAndUnboundedPages() {
    assertThrows(ResponseStatusException.class, () -> service.create(teacher, new StudentManagementService.Input("An", LocalDate.now().plusDays(2), "Parent", "0901234567", null)));
    assertThrows(ResponseStatusException.class, () -> service.create(teacher, new StudentManagementService.Input("An", birth, "Parent", "abc", null)));
    assertThrows(ResponseStatusException.class, () -> service.list(teacher, "", "all", null, "all", 0, 10000));
    assertThrows(ResponseStatusException.class, () -> list(teacher, "", "all", null, "all", -1));
  }

  @Test void onlyNameAndBirthDateAreRequiredAndBlankParentPhoneStillDeduplicates() {
    var created = service.create(teacher, new StudentManagementService.Input("Không có phụ huynh", birth, null, null, null));
    assertNull(created.parentName());
    assertEquals("", created.parentPhoneNumber());
    assertEquals(created.id(), service.detail(teacher, created.id(), 0).student().id());
    assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class, () -> service.create(teacher,
      new StudentManagementService.Input("Không có phụ huynh", birth, "", " ", null))).getStatusCode());
    assertThrows(ResponseStatusException.class, () -> service.create(teacher, new StudentManagementService.Input("Missing birth", null, null, null, null)));
    assertThrows(ResponseStatusException.class, () -> service.create(teacher, new StudentManagementService.Input(" ", birth, null, null, null)));
  }

  @Test void optionalStudentPhoneAndMultilineNotesRoundTripThroughCreateListAndUpdate() {
    var created = service.create(teacher, new StudentManagementService.Input("Phone student", birth, "Parent", "0901234567", null, "091 234 5678", " First line\nSecond line "));
    assertEquals("0912345678", created.phoneNumber()); assertEquals("First line\nSecond line", created.notes());
    var listed = list(teacher, "0912345678", "all", null, "all", 0).items().getFirst();
    assertEquals(created.id(), listed.id()); assertEquals(created.notes(), listed.notes());
    var detail = service.detail(teacher, created.id(), 0).student();
    assertEquals(created.phoneNumber(), detail.phoneNumber()); assertEquals(created.notes(), detail.notes());
    service.update(teacher, created.id(), new StudentManagementService.Input("Phone student", birth, "Parent", "0901234567", null, "0923456789", "Updated"));
    assertEquals("Updated", service.detail(teacher, created.id(), 0).student().notes());
    service.update(teacher, created.id(), input("Phone student", null));
    assertEquals("Updated", service.detail(teacher, created.id(), 0).student().notes());
    assertEquals("0923456789", service.detail(teacher, created.id(), 0).student().phoneNumber());
    service.update(teacher, created.id(), new StudentManagementService.Input("Phone student", birth, "Parent", "0901234567", null, " ", "\n "));
    assertNull(service.detail(teacher, created.id(), 0).student().phoneNumber());
    assertNull(service.detail(teacher, created.id(), 0).student().notes());
    assertNull(service.detail(teacher, personal, 0).student().notes());
  }

  @Test void optionalFieldsValidateWithoutRelaxingProfileOwnership() {
    for (String phone : new String[]{"abc", "123", "1234567890123456"})
      assertThrows(ResponseStatusException.class, () -> service.create(teacher, new StudentManagementService.Input("Invalid", birth, "Parent", "0901234567", null, phone, null)));
    assertThrows(ResponseStatusException.class, () -> service.create(teacher, new StudentManagementService.Input("Long note", birth, "Parent", "0901234567", null, null, "x".repeat(4001))));
    assertNotNull(service.create(teacher, new StudentManagementService.Input("Limit note", birth, "Parent", "0901234567", null, "", "x".repeat(4000))));
    assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, () -> service.update(teacher, shared,
      new StudentManagementService.Input("Changed", birth, "Parent", "0901234567", center, "0912345678", "Cannot edit"))).getStatusCode());
  }
}
