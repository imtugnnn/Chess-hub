package vn.chesshub.controller;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.chesshub.entity.ClassSession;
import vn.chesshub.entity.SessionAttendance;
import vn.chesshub.entity.Student;
import vn.chesshub.repository.SessionAttendanceRepository;
import vn.chesshub.service.TournamentService;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping({"/api/v1/teachers/{teacherId}/classes/{classId}/sessions/{sessionId}/tournaments", "/api/v1/teachers/{teacherId}/classes/{classId}/tournaments"})
public class TournamentController {
  private static final Set<String> PRESELECTED_ATTENDANCE = Set.of("PRESENT", "LATE");
  private final TournamentService tournamentService;
  private final SessionAttendanceRepository attendance;

  public TournamentController(TournamentService tournamentService, SessionAttendanceRepository attendance) {
    this.tournamentService = tournamentService;
    this.attendance = attendance;
  }

  @GetMapping("/creation")
  public CreationResponse creation(@PathVariable UUID teacherId, @PathVariable UUID classId, @PathVariable(required = false) UUID sessionId) {
    if (sessionId == null) {
      var classroom = tournamentService.getClass(teacherId, classId);
      List<StudentResponse> students = classroom.getActiveMemberships().stream()
        .sorted((left, right) -> left.getFullName().compareToIgnoreCase(right.getFullName()))
        .map(student -> new StudentResponse(student.getId(), student.getFullName(), student.getParentPhoneNumber(), null, true)).toList();
      return new CreationResponse(null, students, TournamentService.AVAILABLE_TIE_BREAKS, new ClassResponse(classroom.getId(), classroom.getName()));
    }
    ClassSession session = tournamentService.getSession(teacherId, classId, sessionId);
    Map<UUID, String> attendanceByStudent = attendance.findBySessionId(sessionId).stream()
      .collect(java.util.stream.Collectors.toMap(item -> item.getMembership().getId(), SessionAttendance::getStatus));
    List<StudentResponse> students = session.getChessClass().getActiveMemberships().stream()
      .sorted((left, right) -> left.getFullName().compareToIgnoreCase(right.getFullName()))
      .map(student -> StudentResponse.from(student, attendanceByStudent.get(student.getId())))
      .toList();
    return new CreationResponse(SessionResponse.from(session), students, TournamentService.AVAILABLE_TIE_BREAKS);
  }

  @PostMapping
  public TournamentResponse create(@PathVariable UUID teacherId, @PathVariable UUID classId, @PathVariable(required = false) UUID sessionId,
      @RequestBody CreateTournamentRequest request) {
    var tournament = tournamentService.create(teacherId, classId, sessionId,
      request == null ? null : request.name(), request == null ? null : request.participantIds(), request == null ? null : request.participantNames(), request == null ? null : request.tieBreaks());
    return new TournamentResponse(tournament.getId(), tournament.getRoundCount(), tournament.getStatus());
  }

  public record CreateTournamentRequest(List<UUID> participantIds, Integer roundCount, List<String> tieBreaks, String name, List<String> participantNames) { }
  public record CreationResponse(SessionResponse session, List<StudentResponse> students, List<String> availableTieBreaks, ClassResponse chessClass) {
    public CreationResponse(SessionResponse session, List<StudentResponse> students, List<String> availableTieBreaks) { this(session, students, availableTieBreaks, null); }
  }
  public record ClassResponse(UUID id, String name) { }
  public record SessionResponse(UUID id, String className, LocalDate date, LocalTime startTime, LocalTime endTime) {
    static SessionResponse from(ClassSession session) {
      return new SessionResponse(session.getId(), session.getChessClass().getName(), session.getSessionDate(), session.getStartTime(), session.getEndTime());
    }
  }
  public record StudentResponse(UUID id, String fullName, String parentPhoneNumber, String attendanceStatus, boolean preselected) {
    static StudentResponse from(vn.chesshub.entity.ClassMembership student, String attendanceStatus) {
      return new StudentResponse(student.getId(), student.getFullName(), student.getParentPhoneNumber(), attendanceStatus,
        attendanceStatus != null && PRESELECTED_ATTENDANCE.contains(attendanceStatus));
    }
  }
  public record TournamentResponse(UUID id, int roundCount, String status) { }
}
