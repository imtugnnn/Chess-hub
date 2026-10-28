package vn.chesshub.service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RecurringScheduleTest {
  private ChessClassService.ScheduleCommand schedule(List<ChessClassService.SessionCommand> overrides) {
    return new ChessClassService.ScheduleCommand("RECURRING", overrides, List.of(1, 3),
      LocalDate.parse("2026-10-05"), LocalDate.parse("2026-10-14"), LocalTime.of(17, 0), LocalTime.of(18, 30));
  }

  private ChessClassService.SessionCommand slot(String date, int start, int end) {
    return new ChessClassService.SessionCommand(LocalDate.parse(date), LocalTime.of(start, 0), LocalTime.of(end, 0));
  }

  private List<?> generate(ChessClassService.ScheduleCommand schedule) {
    return ReflectionTestUtils.invokeMethod(ChessClassService.class, "createSessions", schedule);
  }

  @Test void appliesOverrideOnlyToItsDateAndKeepsOtherSessions() {
    List<?> sessions = generate(schedule(List.of(slot("2026-10-07", 19, 20))));
    assertEquals(4, sessions.size());
    assertEquals(LocalTime.of(17, 0), ReflectionTestUtils.invokeMethod(sessions.get(0), "startTime"));
    assertEquals(LocalTime.of(19, 0), ReflectionTestUtils.invokeMethod(sessions.get(1), "startTime"));
    assertEquals(LocalTime.of(20, 0), ReflectionTestUtils.invokeMethod(sessions.get(1), "endTime"));
    assertEquals(LocalTime.of(17, 0), ReflectionTestUtils.invokeMethod(sessions.get(2), "startTime"));
  }

  @Test void existingRecurringRequestsStillUseCommonTime() {
    assertEquals(4, generate(schedule(null)).size());
  }

  @Test void rejectsOverridesOutsideRangeOrOnUnselectedWeekday() {
    assertThrows(ResponseStatusException.class, () -> generate(schedule(List.of(slot("2026-10-19", 19, 20)))));
    assertThrows(ResponseStatusException.class, () -> generate(schedule(List.of(slot("2026-10-06", 19, 20)))));
  }

  @Test void rejectsDuplicateDatesAndReversedTimes() {
    var override = slot("2026-10-07", 19, 20);
    assertThrows(ResponseStatusException.class, () -> generate(schedule(List.of(override, override))));
    assertThrows(ResponseStatusException.class, () -> generate(schedule(List.of(slot("2026-10-07", 20, 19)))));
  }
}
