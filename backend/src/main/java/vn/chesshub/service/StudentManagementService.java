package vn.chesshub.service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StudentManagementService {
  private final NamedParameterJdbcTemplate db;
  public StudentManagementService(NamedParameterJdbcTemplate db) { this.db = db; }
  private static final String ACCESS = """
    (s.owner_user_id = :userId and s.center_id is null
     or s.center_id is not null and exists (
       select 1 from center_memberships m join users u on u.id = m.user_id
       where m.user_id = :userId and m.center_id = s.center_id
         and m.status = 'ACTIVE' and u.center_id = m.center_id)
     or s.center_id is null and s.owner_user_id is null and exists (
       select 1 from chess_class_students cs join chess_classes c on c.id = cs.chess_class_id
       where cs.student_id = s.id and cs.active and c.teacher_id = :userId))
    """;
  // Existing class APIs only authorize the teacher of the class.
  private static final String CLASSES = "c.teacher_id = :userId";
  private static final String SELECT = """
    select s.*, ctr.name as center_name,
      (s.center_id is null and s.owner_user_id = :userId or s.center_id is not null
        and ctr.owner_user_id = :userId) as can_edit
    from student s left join centers ctr on ctr.id = s.center_id
    """;

  @Transactional(readOnly = true)
  public Options options(UUID userId) {
    var args = Map.of("userId", userId);
    var centers = db.query("""
      select c.id, c.name from centers c join center_memberships m on m.center_id = c.id
      join users u on u.id = m.user_id and u.center_id = c.id
      where m.user_id = :userId and m.status = 'ACTIVE' order by c.name
      """, args, (rs, i) -> new Choice(uuid(rs, "id"), rs.getString("name")));
    var classes = db.query("select c.id, c.name from chess_classes c where " + CLASSES + " order by c.name, c.id",
      args, (rs, i) -> new Choice(uuid(rs, "id"), rs.getString("name")));
    return new Options(centers, classes);
  }

  @Transactional(readOnly = true)
  public Page list(UUID userId, String query, String scope, UUID classId, String enrollment, int page, int size) {
    if (page < 0 || (size != 25 && size != 50)) throw error(HttpStatus.BAD_REQUEST, "Phân trang không hợp lệ.");
    if (query == null || query.length() > 255) throw error(HttpStatus.BAD_REQUEST, "Từ khóa tối đa 255 ký tự.");
    if (!Set.of("all", "enrolled", "unassigned").contains(enrollment)) throw error(HttpStatus.BAD_REQUEST, "Tình trạng học không hợp lệ.");
    var args = new MapSqlParameterSource("userId", userId);
    String where = " where " + ACCESS;
    if ("personal".equals(scope)) where += " and s.center_id is null";
    else if (!"all".equals(scope)) {
      UUID centerId;
      try { centerId = UUID.fromString(scope); } catch (IllegalArgumentException e) { throw error(HttpStatus.BAD_REQUEST, "Trung tâm không hợp lệ."); }
      if (options(userId).centers().stream().noneMatch(c -> c.id().equals(centerId))) throw error(HttpStatus.FORBIDDEN, "Bạn không có quyền xem trung tâm này.");
      where += " and s.center_id = :centerId"; args.addValue("centerId", centerId);
    }
    if (classId != null) {
      if (options(userId).classes().stream().noneMatch(c -> c.id().equals(classId))) throw error(HttpStatus.FORBIDDEN, "Bạn không có quyền xem lớp này.");
      where += " and exists (select 1 from chess_class_students cs where cs.student_id = s.id and cs.active and cs.chess_class_id = :classId)";
      args.addValue("classId", classId);
    }
    String enrolled = "exists (select 1 from chess_class_students cs join chess_classes c on c.id = cs.chess_class_id where cs.student_id = s.id and cs.active and " + CLASSES + ")";
    if ("enrolled".equals(enrollment)) where += " and " + enrolled;
    if ("unassigned".equals(enrollment)) where += " and not " + enrolled;
    String normalized = normalize(query);
    if (!normalized.isEmpty()) {
      String haystack = "translate(lower(coalesce(s.full_name, '') || ' ' || coalesce(s.parent_name, '') || ' ' || coalesce(s.parent_phone_number, '') || ' ' || coalesce(s.phone_number, '')), 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ', 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd')";
      where += " and " + haystack + " like :query escape '!'";
      args.addValue("query", "%" + normalized.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%");
    }
    long total = db.queryForObject("select count(*) from student s" + where, args, Long.class);
    int actualPage = total == 0 ? 0 : (int) Math.min(page, (total - 1) / size);
    args.addValue("limit", size).addValue("offset", (long) actualPage * size);
    var rows = db.query(SELECT + where + " order by lower(s.full_name), s.id limit :limit offset :offset", args, StudentManagementService::student);
    if (!rows.isEmpty()) {
      args.addValue("ids", rows.stream().map(StudentRow::id).toList());
      Map<UUID, List<ClassLink>> links = new HashMap<>();
      db.query("select cs.student_id, c.id, c.name from chess_class_students cs join chess_classes c on c.id = cs.chess_class_id where cs.student_id in (:ids) and cs.active and " + CLASSES + " order by c.name, c.id", args, (org.springframework.jdbc.core.RowCallbackHandler) rs -> {
        links.computeIfAbsent(uuid(rs, "student_id"), id -> new ArrayList<>()).add(new ClassLink(uuid(rs, "id"), rs.getString("name")));
      });
      rows = rows.stream().map(s -> s.withClasses(links.getOrDefault(s.id(), List.of()))).toList();
    }
    return new Page(rows, total, actualPage, size);
  }

  @Transactional(readOnly = true)
  public Detail detail(UUID userId, UUID id, int historyPage) {
    if (historyPage < 0) throw error(HttpStatus.BAD_REQUEST, "Trang lịch sử không hợp lệ.");
    var args = new MapSqlParameterSource("userId", userId).addValue("id", id);
    var row = requireStudent(args, false);
    var classes = db.query("select c.id, c.name from chess_class_students cs join chess_classes c on c.id = cs.chess_class_id where cs.student_id = :id and cs.active and " + CLASSES + " order by c.name, c.id", args, (rs, i) -> new ClassLink(uuid(rs, "id"), rs.getString("name")));
    String from = " from session_attendance a join chess_class_students member on member.id = a.membership_id join class_sessions se on se.id = a.session_id join chess_classes c on c.id = se.class_id where member.student_id = :id and " + CLASSES;
    long total = db.queryForObject("select count(*)" + from, args, Long.class);
    args.addValue("offset", (long) historyPage * 20);
    var history = db.query("select se.id, se.session_date, c.id as class_id, c.name, a.status" + from + " order by se.session_date desc, se.start_time desc, a.id limit 20 offset :offset", args,
      (rs, i) -> new Attendance(uuid(rs, "id"), uuid(rs, "class_id"), rs.getString("name"), rs.getDate("session_date").toLocalDate(), rs.getString("status")));
    return new Detail(row.withClasses(classes), history, total, historyPage);
  }

  @Transactional
  public StudentRow create(UUID userId, Input input) {
    lockUser(userId);
    Input valid = validate(input);
    if (!ChessClassService.hasProfileData(valid)) throw error(HttpStatus.BAD_REQUEST, "Chỉ có tên học sinh thì hãy thêm vào một lớp. Cần ít nhất một thông tin bổ sung để tạo hồ sơ.");
    if (valid.centerId() != null && options(userId).centers().stream().noneMatch(c -> c.id().equals(valid.centerId())))
      throw error(HttpStatus.FORBIDDEN, "Bạn không có quyền tạo học sinh trong trung tâm này.");
    if (valid.centerId() != null) db.queryForList("select id from centers where id = :id for update", Map.of("id", valid.centerId()));
    UUID id = UUID.randomUUID();
    var args = inputArgs(valid).addValue("id", id).addValue("userId", userId).addValue("ownerId", valid.centerId() == null ? userId : null);
    ensureUnique(args);
    try {
      db.update("insert into student (id, full_name, birth_date, parent_name, parent_phone_number, center_id, owner_user_id, phone_number, notes, created_at) values (:id, :name, :birth, :parent, :phone, :centerId, :ownerId, :studentPhone, :notes, current_timestamp)", args);
    } catch (DataIntegrityViolationException e) { throw error(HttpStatus.CONFLICT, "Hồ sơ đã tồn tại trong phạm vi này. Hãy tìm học sinh trước khi tạo mới."); }
    return requireStudent(args, false);
  }

  @Transactional
  public StudentRow update(UUID userId, UUID id, Input input) {
    lockUser(userId);
    var access = new MapSqlParameterSource("userId", userId).addValue("id", id);
    StudentRow existing = requireStudent(access, true);
    if (!existing.canEdit()) throw error(HttpStatus.FORBIDDEN, "Chỉ chủ hồ sơ cá nhân hoặc chủ trung tâm được sửa thông tin.");
    Input valid = validate(input);
    if (!Objects.equals(existing.centerId(), valid.centerId())) throw error(HttpStatus.BAD_REQUEST, "Không thể chuyển phạm vi sở hữu khi sửa hồ sơ.");
    if (valid.centerId() != null) db.queryForList("select id from centers where id = :id for update", Map.of("id", valid.centerId()));
    var args = inputArgs(valid).addValue("id", id).addValue("userId", userId).addValue("ownerId", valid.centerId() == null ? userId : null);
    // Older clients omit these new fields. Empty strings explicitly clear them.
    args.addValue("studentPhone", input.phoneNumber() == null ? existing.phoneNumber() : valid.phoneNumber());
    args.addValue("notes", input.notes() == null ? existing.notes() : valid.notes());
    ensureUnique(args);
    try {
      db.update("update student set full_name = :name, birth_date = :birth, parent_name = :parent, parent_phone_number = :phone, phone_number = :studentPhone, notes = :notes where id = :id", args);
    } catch (DataIntegrityViolationException e) { throw error(HttpStatus.CONFLICT, "Thông tin trùng với một hồ sơ đã có trong phạm vi này."); }
    return requireStudent(access, false);
  }
  private void lockUser(UUID userId) {
    if (db.query("select id from users where id = :userId for update", Map.of("userId", userId), (rs, i) -> uuid(rs, "id")).isEmpty()) throw error(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản.");
  }
  private StudentRow requireStudent(MapSqlParameterSource args, boolean lock) {
    if (lock) db.query("select s.id from student s where s.id = :id and " + ACCESS + " for update", args, (rs, i) -> uuid(rs, "id"));
    return db.query(SELECT + " where s.id = :id and " + ACCESS, args, StudentManagementService::student).stream().findFirst().orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh hoặc bạn không còn quyền truy cập."));
  }
  private void ensureUnique(MapSqlParameterSource args) {
    long count = db.queryForObject("select count(*) from student where id <> :id and lower(trim(full_name)) = lower(:name) and birth_date = :birth and parent_phone_number = :phone and (center_id = :centerId or center_id is null and owner_user_id = :ownerId)", args, Long.class);
    if (count > 0) throw error(HttpStatus.CONFLICT, "Hồ sơ đã tồn tại trong phạm vi này. Hãy tìm học sinh trước khi tạo mới.");
  }
  static Input validate(Input input) {
    if (input == null) throw error(HttpStatus.BAD_REQUEST, "Thông tin học sinh là bắt buộc.");
    String name = required(input.fullName(), "Họ tên học sinh"), parent = optionalParentName(input.parentName());
    String phone = optionalParentPhone(input.parentPhoneNumber());
    if (input.birthDate() != null && input.birthDate().isAfter(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")))) throw error(HttpStatus.BAD_REQUEST, "Ngày sinh không được ở tương lai.");
    return new Input(name, input.birthDate(), parent, phone, input.centerId(), optionalStudentPhone(input.phoneNumber()), optionalNotes(input.notes()));
  }
  static String optionalParentName(String value) {
    return value == null || value.isBlank() ? null : required(value, "Họ tên phụ huynh");
  }
  static String optionalParentPhone(String value) {
    if (value == null || value.isBlank()) return "";
    String phone = value.trim().replaceAll("[ .()-]", "");
    if (!phone.matches("\\d{9,15}")) throw error(HttpStatus.BAD_REQUEST, "Số điện thoại phụ huynh phải có 9–15 chữ số hoặc để trống.");
    return phone;
  }
  static String optionalStudentPhone(String value) {
    if (value == null || value.isBlank()) return null;
    String phone = value.trim().replaceAll("[ .()-]", "");
    if (!phone.matches("\\d{9,15}")) throw error(HttpStatus.BAD_REQUEST, "Số điện thoại học sinh phải có 9–15 chữ số hoặc để trống.");
    return phone;
  }
  static String optionalNotes(String value) {
    if (value == null || value.isBlank()) return null;
    String notes = value.trim();
    if (notes.length() > 4000) throw error(HttpStatus.BAD_REQUEST, "Ghi chú tối đa 4.000 ký tự.");
    return notes;
  }
  private static String required(String value, String label) {
    if (value == null || value.isBlank() || value.trim().length() > 255) throw error(HttpStatus.BAD_REQUEST, label + " phải có 1–255 ký tự.");
    return value.trim().replaceAll("\\s+", " ");
  }
  private static MapSqlParameterSource inputArgs(Input input) {
    return new MapSqlParameterSource("name", input.fullName()).addValue("birth", input.birthDate()).addValue("parent", input.parentName()).addValue("phone", input.parentPhoneNumber()).addValue("centerId", input.centerId()).addValue("studentPhone", input.phoneNumber()).addValue("notes", input.notes());
  }
  static String normalize(String text) { return Normalizer.normalize(text.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD).replaceAll("\\p{M}", "").replace('đ', 'd').replaceAll("\\s+", " "); }
  private static StudentRow student(ResultSet rs, int i) throws SQLException {
    var birth = rs.getDate("birth_date");
    return new StudentRow(uuid(rs, "id"), rs.getString("full_name"), birth == null ? null : birth.toLocalDate(), rs.getString("parent_name"), rs.getString("parent_phone_number"), uuid(rs, "center_id"), rs.getString("center_name"), rs.getBoolean("can_edit"), List.of(), rs.getString("phone_number"), rs.getString("notes"));
  }
  private static UUID uuid(ResultSet rs, String field) throws SQLException { return rs.getObject(field, UUID.class); }
  private static ResponseStatusException error(HttpStatus status, String message) { return new ResponseStatusException(status, message); }
  public record Input(String fullName, LocalDate birthDate, String parentName, String parentPhoneNumber, UUID centerId, String phoneNumber, String notes) {
    public Input(String fullName, LocalDate birthDate, String parentName, String parentPhoneNumber, UUID centerId) { this(fullName, birthDate, parentName, parentPhoneNumber, centerId, null, null); }
  }
  public record Choice(UUID id, String name) { }
  public record ClassLink(UUID id, String name) { }
  public record Options(List<Choice> centers, List<Choice> classes) { }
  public record StudentRow(UUID id, String fullName, LocalDate birthDate, String parentName, String parentPhoneNumber, UUID centerId, String centerName, boolean canEdit, List<ClassLink> classes, String phoneNumber, String notes) {
    StudentRow withClasses(List<ClassLink> value) { return new StudentRow(id, fullName, birthDate, parentName, parentPhoneNumber, centerId, centerName, canEdit, value, phoneNumber, notes); }
  }
  public record Page(List<StudentRow> items, long total, int page, int size) { }
  public record Attendance(UUID sessionId, UUID classId, String className, LocalDate date, String status) { }
  public record Detail(StudentRow student, List<Attendance> history, long historyTotal, int historyPage) { }
}
