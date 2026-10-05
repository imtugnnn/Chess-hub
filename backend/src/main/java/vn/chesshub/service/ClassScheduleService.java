package vn.chesshub.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.entity.ChessClass;
import vn.chesshub.entity.ClassSession;
import vn.chesshub.repository.ChessClassRepository;
import vn.chesshub.repository.ClassSessionRepository;
import vn.chesshub.repository.UserRepository;

@Service
public class ClassScheduleService {
  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
  private final ChessClassRepository classes;
  private final ClassSessionRepository sessions;
  private final UserRepository users;
  private final Clock clock;

  @org.springframework.beans.factory.annotation.Autowired
  public ClassScheduleService(ChessClassRepository classes, ClassSessionRepository sessions, UserRepository users) {
    this(classes, sessions, users, Clock.system(ZONE));
  }
  ClassScheduleService(ChessClassRepository classes, ClassSessionRepository sessions, UserRepository users, Clock clock) {
    this.classes = classes; this.sessions = sessions; this.users = users;
    this.clock = clock;
  }

  @Transactional
  public ClassSession reschedule(UUID teacherId, UUID classId, UUID sessionId, Slot slot) {
    lock(teacherId, classId);
    ClassSession session = sessions.findByIdAndChessClassIdAndChessClassTeacherId(sessionId, classId, teacherId)
      .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy buổi học."));
    validateSlot(slot);
    LocalDateTime now = LocalDateTime.now(clock);
    if (!startedAt(session).isAfter(now) || sessions.hasAttendance(sessionId)) {
      throw error(HttpStatus.CONFLICT, "Buổi đã bắt đầu hoặc đã có điểm danh không được đổi lịch.");
    }
    if (!LocalDateTime.of(slot.date(), slot.startTime()).isAfter(now)) {
      throw error(HttpStatus.BAD_REQUEST, "Lịch mới phải bắt đầu trong tương lai.");
    }
    List<ClassSession> other = sessions.findByChessClassTeacherIdAndSessionDateBetweenOrderBySessionDateAscStartTimeAsc(teacherId, slot.date(), slot.date());
    for (ClassSession existing : other) {
      if (!existing.getId().equals(sessionId) && overlaps(slot, slot(existing))) conflict(existing);
    }
    session.reschedule(slot.date(), slot.startTime(), slot.endTime());
    return session;
  }

  @Transactional
  public Preview preview(UUID teacherId, UUID classId, RecurringRequest request) {
    lock(teacherId, classId);
    return calculate(teacherId, classId, request).preview();
  }

  @Transactional
  public ChessClass apply(UUID teacherId, UUID classId, RecurringRequest request) {
    ChessClass classroom = lock(teacherId, classId);
    Plan plan = calculate(teacherId, classId, request);
    if (request.previewToken() == null || !request.previewToken().equals(plan.preview().token())) {
      throw error(HttpStatus.CONFLICT, "Lịch hoặc dữ liệu buổi học đã thay đổi. Hãy xem trước lại trước khi lưu.");
    }
    sessions.deleteAll(plan.removed());
    // Deletions and replacement inserts must succeed or roll back together.
    sessions.flush();
    sessions.saveAll(plan.added().stream().map(slot -> new ClassSession(classroom, slot.date(), slot.startTime(), slot.endTime())).toList());
    String weekdays = request.weekdays().stream().distinct().sorted().map(day -> day == 7 ? "CN" : "T" + (day + 1))
      .reduce((left, right) -> left + ", " + right).orElse("");
    classroom.updateSchedule(weekdays + " · " + request.startTime() + " – " + request.endTime());
    return classroom;
  }

  private ChessClass lock(UUID teacherId, UUID classId) {
    users.findForScheduleUpdate(teacherId).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên."));
    return classes.findForUpdate(classId, teacherId).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học."));
  }

  private Plan calculate(UUID teacherId, UUID classId, RecurringRequest request) {
    LocalDateTime now = LocalDateTime.now(clock);
    if (request == null || request.startDate() == null || request.endDate() == null || request.weekdays() == null
        || request.weekdays().isEmpty() || request.weekdays().stream().anyMatch(day -> day == null || day < 1 || day > 7)) {
      throw error(HttpStatus.BAD_REQUEST, "Chọn ngày áp dụng, ngày kết thúc và thứ học hợp lệ.");
    }
    if (request.startDate().isBefore(now.toLocalDate()) || request.endDate().isBefore(request.startDate())
        || ChronoUnit.DAYS.between(request.startDate(), request.endDate()) > 730) {
      throw error(HttpStatus.BAD_REQUEST, "Khoảng áp dụng phải từ hôm nay, tối đa hai năm.");
    }
    validateSlot(new Slot(request.startDate(), request.startTime(), request.endTime()));
    List<Slot> generated = new ArrayList<>();
    for (LocalDate date = request.startDate(); !date.isAfter(request.endDate()); date = date.plusDays(1)) {
      if (request.weekdays().contains(date.getDayOfWeek().getValue()) && LocalDateTime.of(date, request.startTime()).isAfter(now)) {
        generated.add(new Slot(date, request.startTime(), request.endTime()));
      }
    }
    if (generated.isEmpty() || generated.size() > 500) throw error(HttpStatus.BAD_REQUEST, "Lịch cần có từ 1 đến 500 buổi chưa bắt đầu.");
    List<ClassSession> teacherSessions = sessions.findByChessClassTeacherIdAndSessionDateBetweenOrderBySessionDateAscStartTimeAsc(
      teacherId, request.startDate(), request.endDate());
    List<Change> kept = new ArrayList<>();
    List<ClassSession> removed = new ArrayList<>();
    List<ClassSession> preserved = new ArrayList<>();
    for (ClassSession session : teacherSessions) {
      if (!session.getChessClass().getId().equals(classId)) continue;
      List<String> reasons = new ArrayList<>();
      if (!startedAt(session).isAfter(now)) reasons.add("Đã bắt đầu");
      if (sessions.hasAttendance(session.getId())) reasons.add("Đã có điểm danh");
      if (session.isScheduleOverride()) reasons.add("Đã sửa riêng");
      if (sessions.hasTeachingMaterials(session.getId())) reasons.add("Có bài giảng");
      if (sessions.hasTournament(session.getId())) reasons.add("Có giải đấu");
      if (reasons.isEmpty() && generated.contains(slot(session))) reasons.add("Lịch không đổi");
      if (reasons.isEmpty()) removed.add(session);
      else { preserved.add(session); kept.add(change(session, String.join(" · ", reasons))); }
    }
    List<Slot> added = generated.stream().filter(slot -> preserved.stream().noneMatch(session -> slot.equals(slot(session)))).toList();
    for (Slot slot : added) {
      for (ClassSession existing : teacherSessions) {
        if (!removed.contains(existing) && overlaps(slot, slot(existing))) conflict(existing);
      }
    }
    List<Change> removedChanges = removed.stream().map(session -> change(session, "Thay bằng lịch mới")).toList();
    List<Change> addedChanges = added.stream().map(slot -> new Change(null, slot.date(), slot.startTime(), slot.endTime(), "Buổi mới")).toList();
    String state = request.startDate() + "|" + request.endDate() + "|" + request.weekdays().stream().distinct().sorted().toList()
      + "|" + request.startTime() + "|" + request.endTime() + "|" + kept + "|" + removedChanges + "|" + addedChanges
      + "|" + teacherSessions.stream().map(session -> session.getId() + ":" + slot(session)).sorted().toList();
    return new Plan(new Preview(kept, removedChanges, addedChanges, fingerprint(state)), removed, added);
  }

  private static String fingerprint(String state) {
    try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(state.getBytes(StandardCharsets.UTF_8))); }
    catch (java.security.NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
  }
  private static void validateSlot(Slot slot) {
    if (slot == null || slot.date() == null || slot.startTime() == null || slot.endTime() == null || !slot.endTime().isAfter(slot.startTime())) {
      throw error(HttpStatus.BAD_REQUEST, "Nhập ngày học và giờ hợp lệ; giờ kết thúc phải sau giờ bắt đầu.");
    }
  }
  private static LocalDateTime startedAt(ClassSession session) { return LocalDateTime.of(session.getSessionDate(), session.getStartTime()); }
  private static Slot slot(ClassSession session) { return new Slot(session.getSessionDate(), session.getStartTime(), session.getEndTime()); }
  private static boolean overlaps(Slot a, Slot b) { return a.date().equals(b.date()) && a.startTime().isBefore(b.endTime()) && b.startTime().isBefore(a.endTime()); }
  private static Change change(ClassSession session, String reason) { return new Change(session.getId(), session.getSessionDate(), session.getStartTime(), session.getEndTime(), reason); }
  private static void conflict(ClassSession existing) { throw error(HttpStatus.CONFLICT, "Trùng lịch lớp " + existing.getChessClass().getName() + " ngày " + existing.getSessionDate() + " lúc " + existing.getStartTime() + " – " + existing.getEndTime() + "."); }
  private static ResponseStatusException error(HttpStatus status, String message) { return new ResponseStatusException(status, message); }
  public record Slot(LocalDate date, LocalTime startTime, LocalTime endTime) { }
  public record RecurringRequest(LocalDate startDate, LocalDate endDate, List<Integer> weekdays, LocalTime startTime, LocalTime endTime, String previewToken) { }
  public record Change(UUID id, LocalDate date, LocalTime startTime, LocalTime endTime, String reason) { }
  public record Preview(List<Change> kept, List<Change> removed, List<Change> added, String token) { }
  private record Plan(Preview preview, List<ClassSession> removed, List<Slot> added) { }
}
