package vn.chesshub.service;

import java.time.DayOfWeek;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.Optional;
import java.util.Map;
import java.util.LinkedHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.entity.ChessClass;
import vn.chesshub.entity.ClassSession;
import vn.chesshub.entity.Student;
import vn.chesshub.entity.User;
import vn.chesshub.repository.ChessClassRepository;
import vn.chesshub.repository.ClassSessionRepository;
import vn.chesshub.repository.StudentRepository;
import vn.chesshub.repository.UserRepository;

@Service
public class ChessClassService {
  private final ChessClassRepository classes;
  private final StudentRepository students;
  private final UserRepository users;
  private final ClassSessionRepository sessions;

  public ChessClassService(ChessClassRepository classes, StudentRepository students, UserRepository users, ClassSessionRepository sessions) {
    this.classes = classes;
    this.students = students;
    this.users = users;
    this.sessions = sessions;
  }

  @Transactional
  public CreatedClass create(UUID teacherId, CreateClassCommand command) {
    String className = required(command.name(), "Tên lớp");
    User teacher = users.findById(teacherId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên."));
    List<Student> classStudents = resolveStudents(teacher, command.students());
    List<SessionSlot> plannedSessions = createSessions(command.schedule());
    validateNoScheduleConflicts(teacherId, plannedSessions, null);
    ChessClass chessClass = new ChessClass(teacher, className, scheduleSummary(command.schedule(), plannedSessions), 0, "blue", validFee(command.feePerSession()));
    classStudents.forEach(chessClass::addStudent);
    ChessClass savedClass = classes.save(chessClass);
    sessions.saveAll(plannedSessions.stream()
      .map(session -> new ClassSession(savedClass, session.date(), session.startTime(), session.endTime())).toList());
    return new CreatedClass(savedClass);
  }

  @Transactional
  public ChessClass updateDetails(UUID teacherId, UUID classId, String name, BigDecimal feePerSession) {
    ChessClass chessClass = findClass(teacherId, classId);
    chessClass.updateName(required(name, "Tên lớp"));
    chessClass.updateFeePerSession(validFee(feePerSession));
    return chessClass;
  }

  @Transactional
  public Student addStudent(UUID teacherId, UUID classId, StudentCommand command) {
    ChessClass chessClass = findClass(teacherId, classId);
    Student student = resolveStudents(users.findById(teacherId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên.")), List.of(command)).getFirst();
    if (chessClass.getStudents().stream().anyMatch(existing -> existing.getId().equals(student.getId()))) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Học sinh này đã thuộc lớp.");
    }
    chessClass.addStudent(student);
    return student;
  }

  @Transactional
  public ChessClass updateFutureSchedule(UUID teacherId, UUID classId, ScheduleCommand schedule) {
    ChessClass chessClass = findClass(teacherId, classId);
    LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    List<SessionSlot> replacements = createSessions(schedule).stream().filter(slot -> slot.date().isAfter(today)).toList();
    if (replacements.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lịch mới cần có ít nhất một buổi học trong tương lai.");
    validateNoScheduleConflicts(teacherId, replacements, classId);
    sessions.deleteByChessClassIdAndSessionDateAfter(classId, today);
    sessions.saveAll(replacements.stream().map(slot -> new ClassSession(chessClass, slot.date(), slot.startTime(), slot.endTime())).toList());
    chessClass.updateSchedule(scheduleSummary(schedule, replacements));
    return chessClass;
  }

  private ChessClass findClass(UUID teacherId, UUID classId) {
    return classes.findByIdAndTeacherId(classId, teacherId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học."));
  }

  private List<Student> resolveStudents(User teacher, List<StudentCommand> studentCommands) {
    if (studentCommands == null || studentCommands.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hãy thêm ít nhất một học sinh.");
    UUID centerId = teacher.getCenterId() != null && users.hasActiveCenterMembershipInCenter(teacher.getId(), teacher.getCenterId())
      ? teacher.getCenterId() : null;
    Map<String, Student> resolved = new LinkedHashMap<>();
    for (StudentCommand command : studentCommands) {
      if (command == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thông tin học sinh không hợp lệ.");
      String name = required(command.fullName(), "Họ tên học sinh");
      LocalDate birthDate = requiredDate(command.birthDate(), "Ngày sinh");
      String parentName = required(command.parentName(), "Họ tên phụ huynh");
      String parentPhone = normalizedPhone(command.parentPhoneNumber(), "Số điện thoại phụ huynh");
      String identity = name.toLowerCase() + "|" + birthDate + "|" + parentPhone;
      if (resolved.containsKey(identity)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Một học sinh chỉ được thêm một lần.");
      Student student = findStudentInScope(teacher, centerId, name, birthDate, parentPhone)
        .orElseGet(() -> students.save(new Student(name, birthDate, parentName, parentPhone,
          centerId, centerId == null ? teacher.getId() : null)));
      resolved.put(identity, student);
    }
    return List.copyOf(resolved.values());
  }

  private Optional<Student> findStudentInScope(User teacher, UUID centerId, String name, LocalDate birthDate, String parentPhone) {
    return centerId == null
      ? students.findByOwnerUserIdAndFullNameAndBirthDateAndParentPhoneNumber(teacher.getId(), name, birthDate, parentPhone)
      : students.findByCenterIdAndFullNameAndBirthDateAndParentPhoneNumber(centerId, name, birthDate, parentPhone);
  }

  private static String required(String value, String fieldName) {
    if (value == null || value.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " là bắt buộc.");
    }
    return value.trim();
  }

  private static String normalizedPhone(String value, String fieldName) {
    String phone = required(value, fieldName).replaceAll("[ .()-]", "");
    if (!phone.matches("\\d{9,15}")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " chưa hợp lệ.");
    }
    return phone;
  }

  private static LocalDate requiredDate(LocalDate value, String fieldName) {
    if (value == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " là bắt buộc.");
    return value;
  }

  private static BigDecimal validFee(BigDecimal value) {
    if (value == null || value.signum() < 0 || value.scale() > 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Học phí mỗi buổi phải là số tiền nguyên không âm.");
    }
    return value;
  }

  private static List<SessionSlot> createSessions(ScheduleCommand schedule) {
    if (schedule == null || schedule.mode() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng chọn lịch học.");
    }
    if ("MANUAL".equals(schedule.mode())) {
      if (schedule.sessions() == null || schedule.sessions().isEmpty()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hãy thêm ít nhất một buổi học.");
      }
      return schedule.sessions().stream().map(ChessClassService::validateSession)
        .sorted(Comparator.comparing(SessionSlot::date).thenComparing(SessionSlot::startTime)).toList();
    }
    if ("RECURRING".equals(schedule.mode())) {
      if (schedule.weekdays() == null || schedule.weekdays().isEmpty() || schedule.startDate() == null || schedule.endDate() == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chọn thứ học, ngày bắt đầu và ngày kết thúc.");
      }
      if (schedule.endDate().isBefore(schedule.startDate())) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày kết thúc phải sau ngày bắt đầu.");
      }
      LocalTime startTime = requiredTime(schedule.startTime(), "Giờ bắt đầu");
      LocalTime endTime = requiredTime(schedule.endTime(), "Giờ kết thúc");
      if (!endTime.isAfter(startTime)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giờ kết thúc phải sau giờ bắt đầu.");
      }
      Set<Integer> weekdays = Set.copyOf(schedule.weekdays());
      if (weekdays.stream().anyMatch(day -> day < 1 || day > 7)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thứ học không hợp lệ.");
      }
      List<SessionSlot> generated = new ArrayList<>();
      for (LocalDate date = schedule.startDate(); !date.isAfter(schedule.endDate()); date = date.plusDays(1)) {
        if (weekdays.contains(date.getDayOfWeek().getValue())) generated.add(new SessionSlot(date, startTime, endTime));
        if (generated.size() > 500) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoảng thời gian tạo lịch quá dài.");
      }
      if (generated.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không có buổi học nào trong khoảng ngày đã chọn.");
      return generated;
    }
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chế độ lịch học không hợp lệ.");
  }

  private static SessionSlot validateSession(SessionCommand session) {
    if (session == null || session.date() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày học là bắt buộc.");
    LocalTime startTime = requiredTime(session.startTime(), "Giờ bắt đầu");
    LocalTime endTime = requiredTime(session.endTime(), "Giờ kết thúc");
    if (!endTime.isAfter(startTime)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giờ kết thúc phải sau giờ bắt đầu.");
    return new SessionSlot(session.date(), startTime, endTime);
  }

  private static LocalTime requiredTime(LocalTime time, String fieldName) {
    if (time == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " là bắt buộc.");
    return time;
  }

  private void validateNoScheduleConflicts(UUID teacherId, List<SessionSlot> plannedSessions, UUID excludedClassId) {
    LocalDate firstDate = plannedSessions.stream().map(SessionSlot::date).min(Comparator.naturalOrder()).orElseThrow();
    LocalDate lastDate = plannedSessions.stream().map(SessionSlot::date).max(Comparator.naturalOrder()).orElseThrow();
    List<SessionSlot> existingSessions = sessions
      .findByChessClassTeacherIdAndSessionDateBetweenOrderBySessionDateAscStartTimeAsc(teacherId, firstDate, lastDate)
      .stream()
      .filter(session -> excludedClassId == null || !session.getChessClass().getId().equals(excludedClassId))
      .map(session -> new SessionSlot(session.getSessionDate(), session.getStartTime(), session.getEndTime()))
      .toList();

    for (int index = 0; index < plannedSessions.size(); index++) {
      SessionSlot planned = plannedSessions.get(index);
      boolean conflictsWithExisting = existingSessions.stream().anyMatch(existing -> overlaps(planned, existing));
      boolean conflictsWithinRequest = plannedSessions.subList(0, index).stream().anyMatch(other -> overlaps(planned, other));
      if (conflictsWithExisting || conflictsWithinRequest) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
          "Thời gian dạy bị trùng với một buổi học khác vào ngày " + planned.date() + ".");
      }
    }
  }

  private static boolean overlaps(SessionSlot first, SessionSlot second) {
    return first.date().equals(second.date())
      && first.startTime().isBefore(second.endTime())
      && second.startTime().isBefore(first.endTime());
  }

  private static String scheduleSummary(ScheduleCommand schedule, List<SessionSlot> sessions) {
    String time = sessions.getFirst().startTime() + " – " + sessions.getFirst().endTime();
    if ("RECURRING".equals(schedule.mode())) {
      return schedule.weekdays().stream().sorted().map(ChessClassService::weekdayLabel).reduce((left, right) -> left + ", " + right).orElse("") + " · " + time;
    }
    return sessions.size() + " buổi · " + time;
  }

  private static String weekdayLabel(int day) {
    return switch (DayOfWeek.of(day)) {
      case MONDAY -> "T2";
      case TUESDAY -> "T3";
      case WEDNESDAY -> "T4";
      case THURSDAY -> "T5";
      case FRIDAY -> "T6";
      case SATURDAY -> "T7";
      case SUNDAY -> "CN";
    };
  }

  public record CreateClassCommand(String name, BigDecimal feePerSession, List<StudentCommand> students, ScheduleCommand schedule) { }
  public record StudentCommand(String fullName, LocalDate birthDate, String parentName, String parentPhoneNumber) { }
  public record ScheduleCommand(String mode, List<SessionCommand> sessions, List<Integer> weekdays, LocalDate startDate, LocalDate endDate, LocalTime startTime, LocalTime endTime) { }
  public record SessionCommand(LocalDate date, LocalTime startTime, LocalTime endTime) { }
  public record CreatedClass(ChessClass chessClass) { }
  private record SessionSlot(LocalDate date, LocalTime startTime, LocalTime endTime) { }
}
