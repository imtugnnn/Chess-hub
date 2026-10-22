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
import vn.chesshub.entity.ClassMembership;
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
    users.findForScheduleUpdate(teacherId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên."));
    String className = required(command.name(), "Tên lớp");
    User teacher = users.findById(teacherId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên."));
    List<SessionSlot> plannedSessions = createSessions(command.schedule());
    validateNoScheduleConflicts(teacherId, plannedSessions, null);
    ChessClass chessClass = new ChessClass(teacher, className, scheduleSummary(command.schedule(), plannedSessions), 0, "blue", validFee(command.feePerSession()));
    validateCenter(teacherId, command.centerId());
    if (command.centerId() != null) users.lockStudentScope(command.centerId());
    chessClass.confirmScope(command.centerId());
    ChessClass savedClass = classes.save(chessClass);
    if (command.students() != null) for (var row : command.students()) enrollIn(savedClass, row, false);
    sessions.saveAll(plannedSessions.stream()
      .map(session -> new ClassSession(savedClass, session.date(), session.startTime(), session.endTime())).toList());
    return new CreatedClass(savedClass);
  }

  @Transactional
  public ChessClass updateDetails(UUID teacherId, UUID classId, String name, BigDecimal feePerSession) {
    ChessClass chessClass = classes.findForUpdate(classId, teacherId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học."));
    chessClass.updateName(required(name, "Tên lớp"));
    chessClass.updateFeePerSession(validFee(feePerSession));
    return chessClass;
  }

  @Transactional
  public Student addStudent(UUID teacherId, UUID classId, StudentCommand command) {
    return enroll(teacherId, classId, command).getStudent();
  }

  @Transactional
  public ClassMembership enroll(UUID teacherId, UUID classId, StudentCommand command) {
    return enrollWith(teacherId, classId, command, false);
  }

  @Transactional
  public ClassMembership supplement(UUID teacherId, UUID classId, StudentCommand command) {
    if (command == null || command.membershipId() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu thành viên cần bổ sung thông tin.");
    return enrollWith(teacherId, classId, command, true);
  }

  private ClassMembership enrollWith(UUID teacherId, UUID classId, StudentCommand command, boolean supplement) {
    users.findForScheduleUpdate(teacherId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên."));
    ChessClass classroom = classes.findForUpdate(classId, teacherId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học."));
    requireScope(classroom);
    if (classroom.getCenterId() != null) users.lockStudentScope(classroom.getCenterId());
    return enrollIn(classroom, command, supplement);
  }

  @Transactional
  public ChessClass confirmScope(UUID teacherId, UUID classId, UUID centerId) {
    users.findForScheduleUpdate(teacherId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên."));
    ChessClass classroom = classes.findForUpdate(classId, teacherId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học."));
    validateCenter(teacherId, centerId);
    if (classroom.isScopeConfirmed() && !java.util.Objects.equals(centerId, classroom.getCenterId()))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Lớp đã xác nhận phạm vi. Không thể tự chuyển quyền sở hữu dữ liệu.");
    classroom.confirmScope(centerId); return classroom;
  }

  public void requireScope(ChessClass classroom) {
    if (!classroom.isScopeConfirmed()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Hãy xác nhận lớp cá nhân hoặc trung tâm trước khi thêm học sinh.");
    validateCenter(classroom.getTeacher().getId(), classroom.getCenterId());
  }
  @Transactional(readOnly = true)
  public ChessClass draftForImport(UUID teacherId, UUID centerId) {
    User teacher = users.findById(teacherId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên."));
    validateCenter(teacherId, centerId);
    ChessClass draft = new ChessClass(teacher, "", "", 0, "blue", BigDecimal.ZERO);
    draft.confirmScope(centerId);
    return draft; // Transient only: preview must never create a class or student.
  }

  private void validateCenter(UUID teacherId, UUID centerId) {
    if (centerId != null && !users.hasActiveCenterMembershipInCenter(teacherId, centerId))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không còn quyền thêm học sinh vào trung tâm của lớp.");
  }

  public StudentManagementService.Input validateStudent(StudentCommand command, UUID centerId) {
    if (command == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thông tin học sinh là bắt buộc.");
    return StudentManagementService.validate(new StudentManagementService.Input(command.fullName(), command.birthDate(), command.parentName(), command.parentPhoneNumber(), centerId, command.phoneNumber(), command.notes()));
  }
  public static boolean hasProfileData(StudentManagementService.Input v) {
    return v.birthDate() != null || v.parentName() != null || !v.parentPhoneNumber().isEmpty() || v.phoneNumber() != null || v.notes() != null;
  }
  public List<Student> candidates(ChessClass classroom, String name) {
    return students.scopeCandidates(classroom.getCenterId(), classroom.getTeacher().getId(), name);
  }
  public List<ClassMembership> nameMatches(ChessClass classroom, String name) {
    return classroom.getMemberships().stream().filter(m -> sameStudentName(m.getFullName(), name)).toList();
  }
  public static boolean sameStudentName(String left, String right) {
    return left != null && right != null && left.trim().replaceAll("\\s+", " ").equalsIgnoreCase(right.trim().replaceAll("\\s+", " "));
  }
  public void rejectActiveDuplicate(ChessClass classroom, String name, UUID exceptMemberId) {
    if (classroom.getActiveMemberships().stream().anyMatch(m -> !m.getId().equals(exceptMemberId) && sameStudentName(m.getFullName(), name)))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Học sinh đã có trong lớp.");
  }
  private ClassMembership enrollIn(ChessClass classroom, StudentCommand command, boolean supplement) {
    if (command == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thông tin học sinh là bắt buộc.");
    ClassMembership selected = command.membershipId() == null ? null : classroom.getMemberships().stream()
      .filter(m -> m.getId().equals(command.membershipId())).findFirst()
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thành viên không thuộc lớp này."));
    if (selected != null && selected.isActive() && !supplement)
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Học sinh đã có trong lớp.");
    UUID exceptMemberId = supplement && selected != null ? selected.getId() : null;
    Student profile = null;
    if (command.studentId() != null) {
      profile = students.findById(command.studentId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ."));
      if (!(classroom.getCenterId() == null ? profile.getCenterId() == null && classroom.getTeacher().getId().equals(profile.getOwnerUserId()) : classroom.getCenterId().equals(profile.getCenterId())))
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Hồ sơ không thuộc phạm vi của lớp.");
    } else if (selected != null && selected.getStudent() != null) {
      profile = selected.getStudent(); // Explicitly reuse without updating its data or ownership.
    } else {
      var v = validateStudent(command, classroom.getCenterId());
      rejectActiveDuplicate(classroom, v.fullName(), exceptMemberId);
      List<Student> matches = hasProfileData(v) ? candidates(classroom, v.fullName()) : List.of();
      if (v.birthDate() != null) profile = matches.stream().filter(p -> v.birthDate().equals(p.getBirthDate()) && v.parentPhoneNumber().equals(p.getParentPhoneNumber())).findFirst().orElse(null);
      if (profile == null && selected == null && ((v.birthDate() == null && !matches.isEmpty()) || !nameMatches(classroom, v.fullName()).isEmpty()))
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Có hồ sơ trùng tên. Hãy chọn hồ sơ có sẵn hoặc kiểm tra lại thông tin học sinh.");
      if (profile == null && hasProfileData(v)) profile = students.save(new Student(v.fullName(), v.birthDate(), v.parentName(), v.parentPhoneNumber(), classroom.getCenterId(), classroom.getCenterId() == null ? classroom.getTeacher().getId() : null, v.phoneNumber(), v.notes()));
      if (selected == null && profile == null) return classroom.addMembership(v.fullName(), null);
    }
    if (profile != null) rejectActiveDuplicate(classroom, profile.getFullName(), exceptMemberId);
    if (selected != null) {
      Student finalProfile = profile;
      if (finalProfile != null && classroom.getMemberships().stream().anyMatch(m -> m != selected && finalProfile.getId().equals(m.getStudentId())))
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Hồ sơ đã có thành viên khác trong lớp. Hãy chọn dùng lại thành viên đó.");
      if (profile != null) selected.link(profile);
      selected.setActive(true); classroom.recount(); return selected;
    }
    return classroom.addMembership(profile.getFullName(), profile);
  }

  @Transactional
  public void removeStudent(UUID teacherId, UUID classId, UUID studentId) {
    ChessClass classroom = classes.findForUpdate(classId, teacherId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học."));
    classroom.removeStudent(studentId);
  }

  @Transactional
  public ChessClass updateFutureSchedule(UUID teacherId, UUID classId, ScheduleCommand schedule) {
    users.findForScheduleUpdate(teacherId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên."));
    ChessClass chessClass = classes.findForUpdate(classId, teacherId)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học."));
    LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    List<SessionSlot> replacements = createSessions(schedule).stream().filter(slot -> slot.date().isAfter(today)).toList();
    if (replacements.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lịch mới cần có ít nhất một buổi học trong tương lai.");
    validateNoScheduleConflicts(teacherId, replacements, classId);
    List<ClassSession> remaining = new ArrayList<>(sessions.findByChessClassIdOrderBySessionDateAscStartTimeAsc(classId).stream()
      .filter(session -> session.getSessionDate().isAfter(today)).toList());
    List<ClassSession> updated = new ArrayList<>();
    // Reuse the exact slot first, then a remaining slot on the same date, to retain attachments.
    for (SessionSlot slot : replacements) {
      ClassSession existing = remaining.stream().filter(session -> session.getSessionDate().equals(slot.date())
        && session.getStartTime().equals(slot.startTime()) && session.getEndTime().equals(slot.endTime())).findFirst().orElse(null);
      if (existing != null) { remaining.remove(existing); updated.add(existing); }
    }
    for (SessionSlot slot : replacements) {
      if (updated.stream().anyMatch(session -> session.getSessionDate().equals(slot.date())
        && session.getStartTime().equals(slot.startTime()) && session.getEndTime().equals(slot.endTime()))) continue;
      ClassSession existing = remaining.stream().filter(session -> session.getSessionDate().equals(slot.date())
        && !session.isScheduleOverride() && !sessions.hasAttendance(session.getId()) && !sessions.hasTournament(session.getId())).findFirst().orElse(null);
      if (existing != null) { remaining.remove(existing); existing.updateTimes(slot.startTime(), slot.endTime()); updated.add(existing); }
      else updated.add(new ClassSession(chessClass, slot.date(), slot.startTime(), slot.endTime()));
    }
    if (remaining.stream().anyMatch(session -> session.isScheduleOverride() || sessions.hasTeachingMaterials(session.getId())
        || sessions.hasAttendance(session.getId()) || sessions.hasTournament(session.getId()))) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Lịch mới bỏ buổi đã sửa riêng hoặc có dữ liệu. Hãy dùng chức năng xem trước lịch lặp.");
    }
    sessions.deleteAll(remaining);
    sessions.saveAll(updated);
    chessClass.updateSchedule(scheduleSummary(schedule, replacements));
    return chessClass;
  }

  @Transactional
  public Student addExistingStudent(UUID teacherId, UUID classId, UUID studentId) {
    return enroll(teacherId, classId, new StudentCommand(null, null, null, null, null, null, studentId)).getStudent();
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
      Map<LocalDate, SessionSlot> overrides = new LinkedHashMap<>();
      if (schedule.sessions() != null) {
        for (SessionCommand command : schedule.sessions()) {
          SessionSlot slot = validateSession(command);
          if (slot.date().isBefore(schedule.startDate()) || slot.date().isAfter(schedule.endDate())
              || !weekdays.contains(slot.date().getDayOfWeek().getValue())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Buổi chỉnh giờ phải thuộc lịch định kỳ đã chọn.");
          }
          if (overrides.putIfAbsent(slot.date(), slot) != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Một buổi học được chỉnh giờ nhiều lần.");
          }
        }
      }
      List<SessionSlot> generated = new ArrayList<>();
      for (LocalDate date = schedule.startDate(); !date.isAfter(schedule.endDate()); date = date.plusDays(1)) {
        if (weekdays.contains(date.getDayOfWeek().getValue())) generated.add(overrides.getOrDefault(date, new SessionSlot(date, startTime, endTime)));
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
    if (sessions.stream().anyMatch(session -> !session.startTime().equals(sessions.getFirst().startTime())
        || !session.endTime().equals(sessions.getFirst().endTime()))) time = "Giờ theo từng buổi";
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

  public record CreateClassCommand(String name, BigDecimal feePerSession, List<StudentCommand> students, ScheduleCommand schedule, UUID centerId) {
    public CreateClassCommand(String name, BigDecimal fee, List<StudentCommand> students, ScheduleCommand schedule) { this(name, fee, students, schedule, null); }
  }
  public record StudentCommand(String fullName, LocalDate birthDate, String parentName, String parentPhoneNumber, String phoneNumber, String notes, UUID studentId, UUID membershipId, boolean confirmNew) {
    public StudentCommand(String name, LocalDate birth, String parent, String phone, String studentPhone, String notes, UUID studentId) { this(name, birth, parent, phone, studentPhone, notes, studentId, null, false); }
    public StudentCommand(String fullName, LocalDate birthDate, String parentName, String parentPhoneNumber, String phoneNumber, String notes) { this(fullName, birthDate, parentName, parentPhoneNumber, phoneNumber, notes, null); }
    public StudentCommand(String fullName, LocalDate birthDate, String parentName, String parentPhoneNumber) { this(fullName, birthDate, parentName, parentPhoneNumber, null, null); }
  }
  public record ScheduleCommand(String mode, List<SessionCommand> sessions, List<Integer> weekdays, LocalDate startDate, LocalDate endDate, LocalTime startTime, LocalTime endTime) { }
  public record SessionCommand(LocalDate date, LocalTime startTime, LocalTime endTime) { }
  public record CreatedClass(ChessClass chessClass) { }
  private record SessionSlot(LocalDate date, LocalTime startTime, LocalTime endTime) { }
}
