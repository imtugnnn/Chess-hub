package vn.chesshub.controller;

import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.time.LocalTime;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.chesshub.entity.ChessClass;
import vn.chesshub.repository.ChessClassRepository;
import vn.chesshub.repository.ClassSessionRepository;
import vn.chesshub.service.ChessClassService;
import vn.chesshub.service.ClassScheduleService;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping("/api/v1/teachers/{teacherId}/classes")
public class ChessClassController {
  private final ChessClassRepository classes;
  private final ChessClassService classService;
  private final ClassSessionRepository sessions;
  private final ClassScheduleService scheduleService;

  public ChessClassController(ChessClassRepository classes, ChessClassService classService, ClassSessionRepository sessions, ClassScheduleService scheduleService) {
    this.classes = classes;
    this.classService = classService;
    this.sessions = sessions;
    this.scheduleService = scheduleService;
  }

  @GetMapping
  public List<ClassResponse> listForTeacher(@PathVariable UUID teacherId) {
    return classes.findByTeacherIdOrderByName(teacherId).stream().map(ClassResponse::from).toList();
  }

  @GetMapping("/{classId}")
  public ClassDetailResponse detail(@PathVariable UUID teacherId, @PathVariable UUID classId) {
    ChessClass chessClass = classes.findByIdAndTeacherId(classId, teacherId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học."));
    List<StudentResponse> students = chessClass.getActiveMemberships().stream()
      .sorted((left, right) -> left.getFullName().compareToIgnoreCase(right.getFullName()))
      .map(StudentResponse::from).toList();
    List<SessionResponse> plannedSessions = sessions.findByChessClassIdOrderBySessionDateAscStartTimeAsc(classId).stream()
      .map(session -> SessionResponse.from(session, sessions.hasAttendance(session.getId()))).toList();
    return new ClassDetailResponse(ClassResponse.from(chessClass), students, plannedSessions);
  }

  @PostMapping
  public CreateClassResponse create(@PathVariable UUID teacherId, @RequestBody CreateClassRequest request) {
    ChessClassService.CreatedClass created = classService.create(teacherId,
      new ChessClassService.CreateClassCommand(request.name(), request.feePerSession(), request.students() == null ? List.of() : request.students().stream().map(StudentRequest::toCommand).toList(), ScheduleRequest.toCommand(request.schedule()), request.centerId()));
    return new CreateClassResponse(ClassResponse.from(created.chessClass()));
  }

  @PutMapping("/{classId}")
  public ClassResponse update(@PathVariable UUID teacherId, @PathVariable UUID classId, @RequestBody UpdateClassRequest request) {
    return ClassResponse.from(classService.updateDetails(teacherId, classId, request == null ? null : request.name(), request == null ? null : request.feePerSession()));
  }

  @PostMapping("/{classId}/students")
  public StudentResponse addStudent(@PathVariable UUID teacherId, @PathVariable UUID classId, @RequestBody StudentRequest request) {
    if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thông tin học sinh là bắt buộc.");
    return StudentResponse.from(classService.enroll(teacherId, classId, request.toCommand()));
  }

  @PostMapping("/{classId}/students/{studentId}")
  public StudentResponse addExistingStudent(@PathVariable UUID teacherId, @PathVariable UUID classId, @PathVariable UUID studentId) {
    return StudentResponse.from(classService.enroll(teacherId, classId, new ChessClassService.StudentCommand(null, null, null, null, null, null, studentId)));
  }

  @PutMapping("/{classId}/schedule")
  public ClassResponse updateSchedule(@PathVariable UUID teacherId, @PathVariable UUID classId, @RequestBody ScheduleRequest request) {
    if (request != null && "RECURRING".equals(request.mode())) {
      return ClassResponse.from(scheduleService.apply(teacherId, classId, request.toRecurring()));
    }
    return ClassResponse.from(classService.updateFutureSchedule(teacherId, classId, ScheduleRequest.toCommand(request)));
  }

  @PostMapping("/{classId}/schedule/preview")
  public ClassScheduleService.Preview previewSchedule(@PathVariable UUID teacherId, @PathVariable UUID classId, @RequestBody ScheduleRequest request) {
    if (request == null || !"RECURRING".equals(request.mode())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chọn lịch lặp để xem trước.");
    return scheduleService.preview(teacherId, classId, request.toRecurring());
  }

  @PatchMapping("/{classId}/sessions/{sessionId}")
  public SessionResponse reschedule(@PathVariable UUID teacherId, @PathVariable UUID classId, @PathVariable UUID sessionId, @RequestBody ClassScheduleService.Slot request) {
    return SessionResponse.from(scheduleService.reschedule(teacherId, classId, sessionId, request), false);
  }

  @DeleteMapping("/{classId}/students/{studentId}")
  public org.springframework.http.ResponseEntity<Void> removeStudent(@PathVariable UUID teacherId, @PathVariable UUID classId, @PathVariable UUID studentId) {
    classService.removeStudent(teacherId, classId, studentId);
    return org.springframework.http.ResponseEntity.noContent().build();
  }

  @PostMapping("/{classId}/scope")
  public ClassResponse scope(@PathVariable UUID teacherId, @PathVariable UUID classId, @RequestBody ScopeRequest request) {
    if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hãy chọn phạm vi của lớp.");
    return ClassResponse.from(classService.confirmScope(teacherId, classId, request.centerId()));
  }
  @PutMapping("/{classId}/memberships/{membershipId}")
  public StudentResponse supplement(@PathVariable UUID teacherId, @PathVariable UUID classId, @PathVariable UUID membershipId, @RequestBody StudentRequest request) {
    if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thông tin học sinh là bắt buộc.");
    var c = request.toCommand();
    return StudentResponse.from(classService.supplement(teacherId, classId, new ChessClassService.StudentCommand(c.fullName(), c.birthDate(), c.parentName(), c.parentPhoneNumber(), c.phoneNumber(), c.notes(), c.studentId(), membershipId, c.confirmNew())));
  }
  public record ScopeRequest(UUID centerId) { }

  public record ClassResponse(UUID id, String name, String schedule, int studentCount, String tone, BigDecimal feePerSession, UUID centerId, boolean scopeConfirmed) {
    static ClassResponse from(ChessClass chessClass) {
      return new ClassResponse(chessClass.getId(), chessClass.getName(), chessClass.getSchedule(), chessClass.getStudentCount(), chessClass.getTone(), chessClass.getFeePerSession(), chessClass.getCenterId(), chessClass.isScopeConfirmed());
    }
  }
  public record CreateClassRequest(String name, BigDecimal feePerSession, List<StudentRequest> students, ScheduleRequest schedule, UUID centerId) { }
  public record UpdateClassRequest(String name, BigDecimal feePerSession) { }
  public record StudentRequest(String fullName, LocalDate birthDate, String parentName, String parentPhoneNumber, String phoneNumber, String notes, UUID studentId, UUID membershipId, boolean confirmNew) {
    ChessClassService.StudentCommand toCommand() { return new ChessClassService.StudentCommand(fullName, birthDate, parentName, parentPhoneNumber, phoneNumber, notes, studentId, membershipId, confirmNew); }
  }
  public record ScheduleRequest(String mode, List<SessionRequest> sessions, List<Integer> weekdays, LocalDate startDate, LocalDate endDate, LocalTime startTime, LocalTime endTime, String previewToken) {
    ClassScheduleService.RecurringRequest toRecurring() { return new ClassScheduleService.RecurringRequest(startDate, endDate, weekdays, startTime, endTime, previewToken); }
    static ChessClassService.ScheduleCommand toCommand(ScheduleRequest schedule) {
      if (schedule == null) return null;
      List<ChessClassService.SessionCommand> sessions = schedule.sessions() == null ? List.of() : schedule.sessions().stream()
        .map(session -> new ChessClassService.SessionCommand(session.date(), session.startTime(), session.endTime())).toList();
      return new ChessClassService.ScheduleCommand(schedule.mode(), sessions, schedule.weekdays(), schedule.startDate(), schedule.endDate(), schedule.startTime(), schedule.endTime());
    }
  }
  public record SessionRequest(LocalDate date, LocalTime startTime, LocalTime endTime) { }
  public record CreateClassResponse(ClassResponse chessClass) { }
  public record StudentResponse(UUID id, UUID membershipId, UUID studentId, String fullName, LocalDate birthDate, String parentName, String parentPhoneNumber, String phoneNumber, String notes) {
    static StudentResponse from(vn.chesshub.entity.ClassMembership student) {
      return new StudentResponse(student.getId(), student.getId(), student.getStudentId(), student.getFullName(), student.getBirthDate(), student.getParentName(), student.getParentPhoneNumber(), student.getPhoneNumber(), student.getNotes());
    }
  }
  public record SessionResponse(UUID id, LocalDate date, LocalTime startTime, LocalTime endTime, boolean hasAttendance, boolean scheduleOverride) {
    static SessionResponse from(vn.chesshub.entity.ClassSession session, boolean hasAttendance) {
      return new SessionResponse(session.getId(), session.getSessionDate(), session.getStartTime(), session.getEndTime(), hasAttendance, session.isScheduleOverride());
    }
  }
  public record ClassDetailResponse(ClassResponse chessClass, List<StudentResponse> students, List<SessionResponse> sessions) { }
}
