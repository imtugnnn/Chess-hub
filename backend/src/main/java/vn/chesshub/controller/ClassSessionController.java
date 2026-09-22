package vn.chesshub.controller;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
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

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping("/api/v1/teachers/{teacherId}/sessions")
public class ClassSessionController {
  private final ClassSessionRepository sessions;

  public ClassSessionController(ClassSessionRepository sessions) { this.sessions = sessions; }

  @GetMapping
  public List<SessionResponse> list(@PathVariable UUID teacherId,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
    return sessions.findByChessClassTeacherIdAndSessionDateBetweenOrderBySessionDateAscStartTimeAsc(teacherId, from, to)
      .stream().map(SessionResponse::from).toList();
  }

  public record SessionResponse(UUID id, UUID classId, String className, LocalDate date, LocalTime startTime, LocalTime endTime) {
    static SessionResponse from(ClassSession session) {
      return new SessionResponse(session.getId(), session.getChessClass().getId(), session.getChessClass().getName(), session.getSessionDate(), session.getStartTime(), session.getEndTime());
    }
  }
}
