package vn.chesshub.controller;

import java.time.LocalDate;
import java.time.LocalTime;
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
import vn.chesshub.entity.ClassSession;
import vn.chesshub.repository.ClassSessionRepository;
import vn.chesshub.repository.SessionAttendanceRepository;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping("/api/v1/teachers/{teacherId}/sessions")
public class ClassSessionController {
  private final ClassSessionRepository sessions;
  private final SessionAttendanceRepository attendance;

  public ClassSessionController(ClassSessionRepository sessions, SessionAttendanceRepository attendance) {
    this.sessions = sessions;
    this.attendance = attendance;
  }

  @GetMapping
  public List<SessionResponse> list(@PathVariable UUID teacherId,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
    List<ClassSession> plannedSessions = sessions.findByChessClassTeacherIdAndSessionDateBetweenOrderBySessionDateAscStartTimeAsc(teacherId, from, to);
    Map<UUID, Long> attendanceCounts = attendance.findBySessionChessClassTeacherIdAndSessionSessionDateBetween(teacherId, from, to).stream()
      .collect(java.util.stream.Collectors.groupingBy(item -> item.getSession().getId(), java.util.stream.Collectors.counting()));
    return plannedSessions.stream().map(session -> SessionResponse.from(session, attendanceCounts.getOrDefault(session.getId(), 0L).intValue())).toList();
  }

  public record SessionResponse(UUID id, UUID classId, String className, LocalDate date, LocalTime startTime, LocalTime endTime,
      int studentCount, int attendanceCount) {
    static SessionResponse from(ClassSession session, int attendanceCount) {
      return new SessionResponse(session.getId(), session.getChessClass().getId(), session.getChessClass().getName(), session.getSessionDate(), session.getStartTime(), session.getEndTime(),
        session.getChessClass().getStudents().size(), attendanceCount);
    }
  }
}
