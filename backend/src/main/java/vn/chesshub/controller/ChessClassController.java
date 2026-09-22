package vn.chesshub.controller;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.time.LocalTime;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.chesshub.entity.ChessClass;
import vn.chesshub.repository.ChessClassRepository;
import vn.chesshub.repository.ClassSessionRepository;
import vn.chesshub.service.ChessClassService;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping("/api/v1/teachers/{teacherId}/classes")
public class ChessClassController {
  private final ChessClassRepository classes;
  private final ChessClassService classService;
  private final ClassSessionRepository sessions;

  public ChessClassController(ChessClassRepository classes, ChessClassService classService, ClassSessionRepository sessions) {
    this.classes = classes;
    this.classService = classService;
    this.sessions = sessions;
  }

  @GetMapping
  public List<ClassResponse> listForTeacher(@PathVariable UUID teacherId) {
    return classes.findByTeacherIdOrderByName(teacherId).stream().map(ClassResponse::from).toList();
  }

  @GetMapping("/{classId}")
  public ClassDetailResponse detail(@PathVariable UUID teacherId, @PathVariable UUID classId) {
    ChessClass chessClass = classes.findByIdAndTeacherId(classId, teacherId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học."));
    List<StudentResponse> students = chessClass.getStudents().stream()
      .sorted((left, right) -> left.getFullName().compareToIgnoreCase(right.getFullName()))
      .map(StudentResponse::from).toList();
    List<SessionResponse> plannedSessions = sessions.findByChessClassIdOrderBySessionDateAscStartTimeAsc(classId).stream()
      .map(SessionResponse::from).toList();
    return new ClassDetailResponse(ClassResponse.from(chessClass), students, plannedSessions);
  }

  @PostMapping
  public CreateClassResponse create(@PathVariable UUID teacherId, @RequestBody CreateClassRequest request) {
    ChessClassService.CreatedClass created = classService.create(teacherId,
      new ChessClassService.CreateClassCommand(request.name(), request.students() == null ? List.of() : request.students().stream().map(StudentRequest::toCommand).toList(), ScheduleRequest.toCommand(request.schedule())));
    return new CreateClassResponse(ClassResponse.from(created.chessClass()));
  }

  @PutMapping("/{classId}")
  public ClassResponse update(@PathVariable UUID teacherId, @PathVariable UUID classId, @RequestBody UpdateClassRequest request) {
    return ClassResponse.from(classService.updateDetails(teacherId, classId, request == null ? null : request.name()));
  }

  @PostMapping("/{classId}/students")
  public StudentResponse addStudent(@PathVariable UUID teacherId, @PathVariable UUID classId, @RequestBody StudentRequest request) {
    if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thông tin học sinh là bắt buộc.");
    return StudentResponse.from(classService.addStudent(teacherId, classId, request.toCommand()));
  }

  @PutMapping("/{classId}/schedule")
  public ClassResponse updateSchedule(@PathVariable UUID teacherId, @PathVariable UUID classId, @RequestBody ScheduleRequest request) {
    return ClassResponse.from(classService.updateFutureSchedule(teacherId, classId, ScheduleRequest.toCommand(request)));
  }

  public record ClassResponse(UUID id, String name, String schedule, int studentCount, String tone) {
    static ClassResponse from(ChessClass chessClass) {
      return new ClassResponse(chessClass.getId(), chessClass.getName(), chessClass.getSchedule(), chessClass.getStudentCount(), chessClass.getTone());
    }
  }
  public record CreateClassRequest(String name, List<StudentRequest> students, ScheduleRequest schedule) { }
  public record UpdateClassRequest(String name) { }
  public record StudentRequest(String fullName, String phoneNumber, String parentPhoneNumber) {
    ChessClassService.StudentCommand toCommand() { return new ChessClassService.StudentCommand(fullName, phoneNumber, parentPhoneNumber); }
  }
  public record ScheduleRequest(String mode, List<SessionRequest> sessions, List<Integer> weekdays, LocalDate startDate, LocalDate endDate, LocalTime startTime, LocalTime endTime) {
    static ChessClassService.ScheduleCommand toCommand(ScheduleRequest schedule) {
      if (schedule == null) return null;
      List<ChessClassService.SessionCommand> sessions = schedule.sessions() == null ? List.of() : schedule.sessions().stream()
        .map(session -> new ChessClassService.SessionCommand(session.date(), session.startTime(), session.endTime())).toList();
      return new ChessClassService.ScheduleCommand(schedule.mode(), sessions, schedule.weekdays(), schedule.startDate(), schedule.endDate(), schedule.startTime(), schedule.endTime());
    }
  }
  public record SessionRequest(LocalDate date, LocalTime startTime, LocalTime endTime) { }
  public record CreateClassResponse(ClassResponse chessClass) { }
  public record StudentResponse(UUID id, String fullName, String phoneNumber) {
    static StudentResponse from(vn.chesshub.entity.Student student) {
      return new StudentResponse(student.getId(), student.getFullName(), student.getPhoneNumber());
    }
  }
  public record SessionResponse(UUID id, LocalDate date, LocalTime startTime, LocalTime endTime) {
    static SessionResponse from(vn.chesshub.entity.ClassSession session) {
      return new SessionResponse(session.getId(), session.getSessionDate(), session.getStartTime(), session.getEndTime());
    }
  }
  public record ClassDetailResponse(ClassResponse chessClass, List<StudentResponse> students, List<SessionResponse> sessions) { }
}
