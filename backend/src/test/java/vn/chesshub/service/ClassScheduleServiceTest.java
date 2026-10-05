package vn.chesshub.service;

import java.time.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.entity.*;
import vn.chesshub.repository.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ClassScheduleServiceTest {
  final UUID teacherId = UUID.randomUUID(), classId = UUID.randomUUID();
  final ChessClassRepository classes = mock(ChessClassRepository.class);
  final ClassSessionRepository sessions = mock(ClassSessionRepository.class);
  final UserRepository users = mock(UserRepository.class);
  final Clock clock = Clock.fixed(Instant.parse("2030-01-07T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
  final ClassScheduleService service = new ClassScheduleService(classes, sessions, users, clock);
  final User teacher = new User("Teacher", "teacher@example.com", "hash");
  final ChessClass classroom = new ChessClass(teacher, "Lớp A", "T2 · 17:00", 0, "blue");
  final List<ClassSession> stored = new ArrayList<>();
  final LocalDate today = LocalDate.of(2030, 1, 7);

  @BeforeEach void setup() {
    ReflectionTestUtils.setField(classroom, "id", classId);
    when(users.findForScheduleUpdate(teacherId)).thenReturn(Optional.of(teacher));
    when(classes.findForUpdate(classId, teacherId)).thenReturn(Optional.of(classroom));
    when(sessions.findByChessClassTeacherIdAndSessionDateBetweenOrderBySessionDateAscStartTimeAsc(eq(teacherId), any(), any()))
      .thenAnswer(call -> stored.stream().filter(s -> !s.getSessionDate().isBefore(call.getArgument(1, LocalDate.class)) && !s.getSessionDate().isAfter(call.getArgument(2, LocalDate.class))).toList());
  }
  ClassSession session(LocalDate date, int hour) {
    ClassSession session = new ClassSession(classroom, date, LocalTime.of(hour, 0), LocalTime.of(hour + 1, 0));
    ReflectionTestUtils.setField(session, "id", UUID.randomUUID()); stored.add(session);
    when(sessions.findByIdAndChessClassIdAndChessClassTeacherId(session.getId(), classId, teacherId)).thenReturn(Optional.of(session));
    return session;
  }
  ClassScheduleService.RecurringRequest request(int hour, String token) {
    return new ClassScheduleService.RecurringRequest(today, today.plusDays(7), List.of(1), LocalTime.of(hour, 0), LocalTime.of(hour + 1, 0), token);
  }
  @Test void editTodayBeforeStartPreservesIdentityAndDescription() {
    ClassSession selected = session(today, 17); ClassSession untouched = session(today.plusDays(1), 17);
    when(sessions.hasTeachingMaterials(selected.getId())).thenReturn(true);
    when(sessions.hasTournament(selected.getId())).thenReturn(true);
    UUID id = selected.getId();
    assertSame(selected, service.reschedule(teacherId, classId, id, new ClassScheduleService.Slot(today, LocalTime.of(18, 0), LocalTime.of(19, 0))));
    assertEquals(id, selected.getId()); assertTrue(selected.isScheduleOverride()); assertEquals(LocalTime.of(17, 0), untouched.getStartTime());
    assertEquals("T2 · 17:00", classroom.getSchedule()); verify(sessions, never()).deleteAll(any());
  }
  @Test void editCanMoveToAnotherDayWithoutReplacingSession() {
    ClassSession selected = session(today, 17);
    service.reschedule(teacherId, classId, selected.getId(), new ClassScheduleService.Slot(today.plusDays(2), LocalTime.of(12, 0), LocalTime.of(13, 0)));
    assertEquals(today.plusDays(2), selected.getSessionDate()); verify(sessions, never()).saveAll(any());
  }
  @Test void rejectsStartedOrAttendedSessionsAndInvalidDestination() {
    ClassSession started = session(today, 9), attended = session(today, 17);
    when(sessions.hasAttendance(attended.getId())).thenReturn(true);
    var destination = new ClassScheduleService.Slot(today.plusDays(1), LocalTime.of(12, 0), LocalTime.of(13, 0));
    assertThrows(ResponseStatusException.class, () -> service.reschedule(teacherId, classId, started.getId(), destination));
    assertThrows(ResponseStatusException.class, () -> service.reschedule(teacherId, classId, attended.getId(), destination));
    ClassSession pending = session(today.plusDays(1), 17);
    assertThrows(ResponseStatusException.class, () -> service.reschedule(teacherId, classId, pending.getId(), new ClassScheduleService.Slot(today, LocalTime.of(8, 0), LocalTime.of(9, 0))));
    assertThrows(ResponseStatusException.class, () -> service.reschedule(teacherId, classId, pending.getId(), new ClassScheduleService.Slot(today, LocalTime.of(18, 0), LocalTime.of(17, 0))));
  }
  @Test void rejectsSameClassAndOtherClassConflictsButAllowsAdjacentSlots() {
    ClassSession selected = session(today, 17), other = session(today, 19);
    assertThrows(ResponseStatusException.class, () -> service.reschedule(teacherId, classId, selected.getId(), new ClassScheduleService.Slot(today, LocalTime.of(19, 30), LocalTime.of(20, 30))));
    service.reschedule(teacherId, classId, selected.getId(), new ClassScheduleService.Slot(today, LocalTime.of(18, 0), LocalTime.of(19, 0)));
    ChessClass secondClass = new ChessClass(teacher, "Lớp B", "", 0, "blue"); ReflectionTestUtils.setField(secondClass, "id", UUID.randomUUID());
    ReflectionTestUtils.setField(other, "chessClass", secondClass);
    var error = assertThrows(ResponseStatusException.class, () -> service.reschedule(teacherId, classId, selected.getId(), new ClassScheduleService.Slot(today, LocalTime.of(19, 0), LocalTime.of(20, 0))));
    assertTrue(error.getReason().contains("Lớp B"));
  }
  @Test void previewRetainsExactSlotsAndApplyOnlyRemovesChangedOrdinarySlots() {
    ClassSession exact = session(today, 17), replaced = session(today.plusDays(7), 16), outside = session(today.plusDays(8), 16);
    var preview = service.preview(teacherId, classId, request(17, null));
    assertEquals(List.of(exact.getId()), preview.kept().stream().map(ClassScheduleService.Change::id).toList());
    assertEquals(List.of(replaced.getId()), preview.removed().stream().map(ClassScheduleService.Change::id).toList());
    assertEquals(1, preview.added().size());
    service.apply(teacherId, classId, request(17, preview.token()));
    verify(sessions).deleteAll(List.of(replaced)); verify(sessions).flush();
    verify(sessions).saveAll(argThat(list -> { var added = (List<ClassSession>) list; return added.size() == 1 && added.getFirst().getSessionDate().equals(today.plusDays(7)); }));
    assertEquals(LocalTime.of(16, 0), outside.getStartTime());
  }
  @Test void protectsOverrideMaterialTournamentAttendanceAndStartedSlots() {
    ClassSession a = session(today, 8), b = session(today.plusDays(1), 8), c = session(today.plusDays(2), 8), d = session(today.plusDays(3), 8), e = session(today.plusDays(4), 8);
    b.reschedule(b.getSessionDate(), b.getStartTime(), b.getEndTime());
    when(sessions.hasTeachingMaterials(c.getId())).thenReturn(true);
    when(sessions.hasTournament(d.getId())).thenReturn(true);
    when(sessions.hasAttendance(e.getId())).thenReturn(true);
    var preview = service.preview(teacherId, classId, request(17, null));
    assertEquals(5, preview.kept().size()); assertTrue(preview.removed().isEmpty());
    assertTrue(preview.kept().stream().anyMatch(item -> item.id().equals(a.getId()) && item.reason().contains("Đã bắt đầu")));
  }
  @Test void exactProtectedSlotIsNotAddedTwiceAndPartialOverlapIsRejected() {
    ClassSession attached = session(today, 17); when(sessions.hasTeachingMaterials(attached.getId())).thenReturn(true);
    assertEquals(1, service.preview(teacherId, classId, request(17, null)).added().size());
    attached.updateTimes(LocalTime.of(17, 30), LocalTime.of(18, 30));
    assertThrows(ResponseStatusException.class, () -> service.preview(teacherId, classId, request(17, null)));
  }
  @Test void stalePreviewAfterAttachmentAttendanceOrTimeEditCannotDeleteAnything() {
    ClassSession existing = session(today, 16);
    var preview = service.preview(teacherId, classId, request(17, null));
    when(sessions.hasTeachingMaterials(existing.getId())).thenReturn(true);
    assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.apply(teacherId, classId, request(17, preview.token()))).getStatusCode().value());
    verify(sessions, never()).deleteAll(any()); verify(sessions, never()).saveAll(any());
    when(sessions.hasTeachingMaterials(existing.getId())).thenReturn(false);
    when(sessions.hasAttendance(existing.getId())).thenReturn(true);
    assertThrows(ResponseStatusException.class, () -> service.apply(teacherId, classId, request(17, preview.token())));
    when(sessions.hasAttendance(existing.getId())).thenReturn(false);
    existing.updateTimes(LocalTime.of(15, 0), LocalTime.of(16, 0));
    assertThrows(ResponseStatusException.class, () -> service.apply(teacherId, classId, request(17, preview.token())));
  }
  @Test void changedRequestOrMissingTokenRequiresPreviewAgain() {
    var preview = service.preview(teacherId, classId, request(17, null));
    assertThrows(ResponseStatusException.class, () -> service.apply(teacherId, classId, request(18, preview.token())));
    assertThrows(ResponseStatusException.class, () -> service.apply(teacherId, classId, request(17, null)));
    verify(sessions, never()).deleteAll(any());
  }
  @Test void rejectsInvalidRangeWeekdaysAndForeignOwnership() {
    assertThrows(ResponseStatusException.class, () -> service.preview(teacherId, classId, new ClassScheduleService.RecurringRequest(today.minusDays(1), today, List.of(1), LocalTime.NOON, LocalTime.of(13, 0), null)));
    assertThrows(ResponseStatusException.class, () -> service.preview(teacherId, classId, new ClassScheduleService.RecurringRequest(today, today.plusYears(3), List.of(1), LocalTime.NOON, LocalTime.of(13, 0), null)));
    assertThrows(ResponseStatusException.class, () -> service.preview(teacherId, classId, new ClassScheduleService.RecurringRequest(today, today.plusDays(1), List.of(9), LocalTime.NOON, LocalTime.of(13, 0), null)));
    assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.preview(teacherId, UUID.randomUUID(), request(17, null))).getStatusCode().value());
  }
}
