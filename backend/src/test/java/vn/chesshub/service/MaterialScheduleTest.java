package vn.chesshub.service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.entity.*;
import vn.chesshub.repository.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class MaterialScheduleTest {
  @Test void changingTimeKeepsSessionIdAndMaterials() {
    var fixture = new Fixture();
    when(fixture.sessions.hasTeachingMaterials(any())).thenReturn(true);
    fixture.service.updateFutureSchedule(fixture.userId, fixture.classId, fixture.schedule(fixture.date, 11));
    assertEquals(LocalTime.of(11, 0), fixture.existing.getStartTime());
    verify(fixture.sessions).saveAll(List.of(fixture.existing));
    verify(fixture.sessions).deleteAll(List.of());
  }

  @Test void droppingAttachedSessionIsBlockedBeforeDelete() {
    var fixture = new Fixture();
    when(fixture.sessions.hasTeachingMaterials(any())).thenReturn(true);
    assertThrows(ResponseStatusException.class, () -> fixture.service.updateFutureSchedule(fixture.userId, fixture.classId, fixture.schedule(fixture.date.plusDays(1), 11)));
    verify(fixture.sessions, never()).deleteAll(any());
    verify(fixture.sessions, never()).saveAll(any());
  }

  static class Fixture {
    final UUID userId = UUID.randomUUID(), classId = UUID.randomUUID();
    final LocalDate date = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(7);
    final ClassSessionRepository sessions = mock(ClassSessionRepository.class);
    final ChessClassRepository classes = mock(ChessClassRepository.class);
    final ChessClass classroom = new ChessClass(new User("Teacher", "test@example.com", "hash"), "Class", "", 0, "blue");
    final ClassSession existing = new ClassSession(classroom, date, LocalTime.of(9, 0), LocalTime.of(10, 0));
    final UserRepository users = mock(UserRepository.class);
    final ChessClassService service = new ChessClassService(classes, mock(StudentRepository.class), users, sessions);
    Fixture() {
      when(classes.findByIdAndTeacherId(classId, userId)).thenReturn(Optional.of(classroom));
      when(classes.findForUpdate(classId, userId)).thenReturn(Optional.of(classroom));
      when(users.findForScheduleUpdate(userId)).thenReturn(Optional.of(new User("Teacher", "test@example.com", "hash")));
      when(sessions.findByChessClassIdOrderBySessionDateAscStartTimeAsc(classId)).thenReturn(List.of(existing));
    }
    ChessClassService.ScheduleCommand schedule(LocalDate day, int hour) {
      return new ChessClassService.ScheduleCommand("MANUAL", List.of(new ChessClassService.SessionCommand(day, LocalTime.of(hour, 0), LocalTime.of(hour + 1, 0))), List.of(), null, null, null, null);
    }
  }
}
