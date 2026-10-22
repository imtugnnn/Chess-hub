package vn.chesshub.controller;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.entity.*;
import vn.chesshub.repository.*;
import vn.chesshub.service.ChessClassService;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class StudentRemovalHistoryTest {
  final UUID teacherId = UUID.randomUUID(), classId = UUID.randomUUID(), sessionId = UUID.randomUUID();
  final ChessClassRepository classes = mock(ChessClassRepository.class);
  final ClassSessionRepository sessions = mock(ClassSessionRepository.class);
  final SessionAttendanceRepository attendance = mock(SessionAttendanceRepository.class);
  final StudentRepository students = mock(StudentRepository.class);
  final UserRepository users = mock(UserRepository.class);
  final ChessClass classroom = new ChessClass(new User("Teacher", "teacher@example.com", "hash"), "Lớp A", "", 0, "blue", BigDecimal.valueOf(100000));
  final ClassSession session = new ClassSession(classroom, LocalDate.of(2030, 1, 7), LocalTime.NOON, LocalTime.of(13, 0));
  final Student an = student("An"), binh = student("Bình");
  final SessionAttendance present = new SessionAttendance(session, an, "PRESENT");
  final AttendanceController controller = new AttendanceController(sessions, attendance, students, classes);
  final ChessClassService service = new ChessClassService(classes, students, users, sessions);

  static Student student(String name) {
    Student student = new Student(name, LocalDate.of(2015, 1, 1), "Phụ huynh", "0901234567", null, null);
    ReflectionTestUtils.setField(student, "id", UUID.randomUUID()); return student;
  }
  @BeforeEach void setup() {
    ReflectionTestUtils.setField(classroom, "id", classId); ReflectionTestUtils.setField(session, "id", sessionId);
    classroom.confirmScope(null);
    classroom.addStudent(an); classroom.addStudent(binh);
    when(classes.findForUpdate(classId, teacherId)).thenReturn(Optional.of(classroom));
    when(sessions.findByIdAndChessClassIdAndChessClassTeacherId(sessionId, classId, teacherId)).thenReturn(Optional.of(session));
    when(attendance.findBySessionId(sessionId)).thenReturn(List.of(present));
    when(students.findById(an.getId())).thenReturn(Optional.of(an)); when(students.findById(binh.getId())).thenReturn(Optional.of(binh));
    when(attendance.saveAll(any())).thenAnswer(call -> call.getArgument(0));
  }
  @Test void removingStudentOnlyChangesMembershipAndCount() {
    ChessClass other = new ChessClass(classroom.getTeacher(), "Lớp B", "", 0, "blue"); other.addStudent(an);
    service.removeStudent(teacherId, classId, an.getId());
    assertEquals(Set.of(binh), classroom.getStudents()); assertEquals(1, classroom.getStudentCount());
    assertEquals(Set.of(an), other.getStudents()); assertEquals("PRESENT", present.getStatus());
    verifyNoInteractions(students, attendance, sessions);
    service.removeStudent(teacherId, classId, an.getId()); assertEquals(1, classroom.getStudentCount());
  }
  @Test void existingAttendanceReturnsRemovedStudentProfileAndCanBeCorrected() {
    service.removeStudent(teacherId, classId, an.getId());
    var record = controller.list(teacherId, classId, sessionId).getFirst();
    assertEquals("An", record.fullName()); assertEquals("PRESENT", record.status()); assertTrue(record.leftClass());
    var saved = controller.save(teacherId, classId, sessionId, new AttendanceController.AttendanceRequest(List.of(new AttendanceController.AttendanceRecord(an.getId(), "LATE"))));
    assertEquals("LATE", saved.getFirst().status()); assertTrue(saved.getFirst().leftClass());
  }
  @Test void removedStudentCannotBeAddedToAnotherSession() {
    service.removeStudent(teacherId, classId, an.getId()); when(attendance.findBySessionId(sessionId)).thenReturn(List.of());
    assertThrows(ResponseStatusException.class, () -> controller.save(teacherId, classId, sessionId,
      new AttendanceController.AttendanceRequest(List.of(new AttendanceController.AttendanceRecord(an.getId(), "PRESENT")))));
    verify(attendance, never()).saveAll(any());
  }
  @Test void cannotRemoveOrMarkAttendanceInForeignClass() {
    UUID outsider = UUID.randomUUID();
    assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.removeStudent(outsider, classId, an.getId())).getStatusCode().value());
    assertThrows(ResponseStatusException.class, () -> controller.save(outsider, classId, sessionId, new AttendanceController.AttendanceRequest(List.of())));
    assertEquals(2, classroom.getStudentCount()); verify(attendance, never()).saveAll(any());
  }
  @Test void monthReportIncludesRemovedPresentAndAbsentStudentsWithoutChangingTuition() {
    service.removeStudent(teacherId, classId, an.getId());
    Student absent = student("Chi"); SessionAttendance absence = new SessionAttendance(session, absent, "ABSENT");
    when(sessions.findByChessClassTeacherIdAndSessionDateBetweenOrderBySessionDateAscStartTimeAsc(teacherId, LocalDate.of(2030, 1, 1), LocalDate.of(2030, 1, 31))).thenReturn(List.of(session));
    when(attendance.findBySessionChessClassTeacherIdAndSessionSessionDateBetween(teacherId, LocalDate.of(2030, 1, 1), LocalDate.of(2030, 1, 31))).thenReturn(List.of(present, absence));
    when(classes.findWithStudentsByTeacherIdOrderByName(teacherId)).thenReturn(List.of(classroom));
    var report = new AttendanceSummaryController(classes, sessions, attendance, mock(TuitionPaymentRepository.class)).list(teacherId, YearMonth.of(2030, 1)).getFirst();
    assertEquals(3, report.students().size());
    var removed = report.students().stream().filter(item -> item.studentId().equals(an.getId())).findFirst().orElseThrow();
    assertTrue(removed.leftClass()); assertEquals(1, removed.attendedDays()); assertEquals(BigDecimal.valueOf(100000), removed.tuitionAmount());
    var absentReport = report.students().stream().filter(item -> item.studentId().equals(absent.getId())).findFirst().orElseThrow();
    assertTrue(absentReport.leftClass()); assertEquals(0, absentReport.attendedDays()); assertEquals(BigDecimal.ZERO, absentReport.tuitionAmount());
    assertEquals(1, report.sessionCount());
  }
  @Test void reAddingSameProfileRestoresMembershipWithoutCreatingStudent() {
    service.removeStudent(teacherId, classId, an.getId());
    User owner = classroom.getTeacher(); ReflectionTestUtils.setField(owner, "id", teacherId);
    when(users.findById(teacherId)).thenReturn(Optional.of(owner));
    when(users.findForScheduleUpdate(teacherId)).thenReturn(Optional.of(owner));
    when(students.scopeCandidates(null, teacherId, an.getFullName())).thenReturn(List.of(an));
    when(students.findByOwnerUserIdAndFullNameAndBirthDateAndParentPhoneNumber(teacherId, an.getFullName(), an.getBirthDate(), an.getParentPhoneNumber())).thenReturn(Optional.of(an));
    Student restored = service.addStudent(teacherId, classId, new ChessClassService.StudentCommand(an.getFullName(), an.getBirthDate(), an.getParentName(), an.getParentPhoneNumber()));
    assertSame(an, restored); assertEquals(2, classroom.getStudentCount()); assertEquals("PRESENT", present.getStatus());
    assertFalse(controller.list(teacherId, classId, sessionId).getFirst().leftClass()); verify(students, never()).save(any());
  }
  @Test void invalidStatusAndDuplicateRowsNeverPersist() {
    assertThrows(ResponseStatusException.class, () -> controller.save(teacherId, classId, sessionId,
      new AttendanceController.AttendanceRequest(List.of(new AttendanceController.AttendanceRecord(an.getId(), "INVALID")))));
    var row = new AttendanceController.AttendanceRecord(binh.getId(), "PRESENT");
    assertThrows(ResponseStatusException.class, () -> controller.save(teacherId, classId, sessionId, new AttendanceController.AttendanceRequest(List.of(row, row))));
    verify(attendance, never()).saveAll(any());
  }
}
