package vn.chesshub.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.entity.*;
import vn.chesshub.repository.*;

@Service
public class StudentImportService {
  public record Field(String key, String label, List<String> aliases) { }
  public static final List<Field> FIELDS = List.of(
    new Field("fullName", "Họ tên học sinh", List.of("họ tên", "họ và tên", "tên bé", "tên học sinh", "học sinh", "full name")),
    new Field("birthDate", "Ngày sinh", List.of("ngày tháng năm sinh", "dob", "birth date")),
    new Field("parentName", "Tên phụ huynh", List.of("họ tên phụ huynh", "phụ huynh")),
    new Field("parentPhoneNumber", "SĐT phụ huynh", List.of("số điện thoại phụ huynh", "sđt ph", "điện thoại phụ huynh")),
    new Field("phoneNumber", "SĐT học sinh", List.of("số điện thoại học sinh", "điện thoại", "sđt")),
    new Field("notes", "Ghi chú", List.of("ghi chu", "note")));
  public record Row(int rowNumber, Map<String, String> values, UUID studentId, UUID membershipId, boolean confirmNew, Integer reuseRowNumber, Map<String, String> issues) {
    public Row(int rowNumber, Map<String, String> values, UUID studentId, UUID membershipId, boolean confirmNew, Integer reuseRowNumber) {
      this(rowNumber, values, studentId, membershipId, confirmNew, reuseRowNumber, Map.of());
    }
  }
  public record Batch(UUID importId, List<Row> rows) { }
  public record DraftBatch(UUID centerId, List<Row> rows) { }
  public record DraftResult(int rowNumber, String action, String message, UUID studentId, List<Candidate> candidates, ChessClassService.StudentCommand student) { }
  public record Candidate(UUID membershipId, UUID studentId, String fullName, LocalDate birthDate, String parentPhoneNumber, boolean active) { }
  public record Result(int rowNumber, String action, String message, UUID membershipId, UUID studentId, List<Candidate> candidates, boolean success, boolean profileCreated, boolean enrolled) {
    public Result(int rowNumber, String action, String message, UUID membershipId, UUID studentId, List<Candidate> candidates, boolean success) {
      this(rowNumber, action, message, membershipId, studentId, candidates, success, false, false);
    }
  }
  private final ChessClassRepository classes;
  private final ChessClassService classroom;
  private final JdbcTemplate db;
  private final ObjectMapper json;
  private final EntityManager entities;
  private final TransactionTemplate transaction;
  public StudentImportService(ChessClassRepository classes, ChessClassService classroom, JdbcTemplate db, ObjectMapper json, EntityManager entities, PlatformTransactionManager manager) {
    this.classes = classes; this.classroom = classroom; this.db = db; this.json = json; this.entities = entities;
    transaction = new TransactionTemplate(manager);
    transaction.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
  }
  @Transactional(readOnly = true)
  public void authorize(UUID userId, UUID classId) { classroom.requireScope(requireClass(userId, classId)); }

  private ChessClass requireClass(UUID userId, UUID classId) {
    return classes.findByIdAndTeacherId(classId, userId).orElseThrow(() -> bad(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học."));
  }
  private void checkRows(List<Row> rows) {
    if (rows == null || rows.isEmpty() || rows.size() > 1000) throw bad(HttpStatus.BAD_REQUEST, "Danh sách cần có 1–1.000 dòng.");
    Set<Integer> numbers = new HashSet<>();
    for (Row r : rows) if (r == null || r.rowNumber() < 1 || !numbers.add(r.rowNumber()) || r.values() == null || r.values().size() > 6)
      throw bad(HttpStatus.BAD_REQUEST, "Số dòng hoặc dữ liệu nhập không hợp lệ.");
  }
  private String value(Row row, String key) { return Objects.toString(row.values().get(key), "").trim(); }
  public ChessClassService.StudentCommand command(Row row) {
    if (row.issues() != null && !row.issues().isEmpty()) throw bad(HttpStatus.BAD_REQUEST, String.join(" ", row.issues().values()));
    if (row.values().values().stream().anyMatch(v -> StudentWorkbookService.FORMULA.equals(v)))
      throw bad(HttpStatus.BAD_REQUEST, "Ô công thức cần được thay bằng giá trị trước khi nhập.");
    String birth = value(row, "birthDate");
    LocalDate date = null;
    if (!birth.isEmpty()) {
      try {
        date = birth.matches("\\d{4}-\\d{2}-\\d{2}") ? LocalDate.parse(birth) : LocalDate.parse(birth, DateTimeFormatter.ofPattern("d/M/uuuu").withResolverStyle(ResolverStyle.STRICT));
      } catch (RuntimeException e) { throw bad(HttpStatus.BAD_REQUEST, "Ngày sinh không hợp lệ. Dùng dd/MM/yyyy hoặc yyyy-MM-dd."); }
    }
    return new ChessClassService.StudentCommand(value(row, "fullName"), date, value(row, "parentName"), value(row, "parentPhoneNumber"), value(row, "phoneNumber"), value(row, "notes"), row.studentId(), row.membershipId(), row.confirmNew());
  }
  @Transactional(readOnly = true)
  public List<Result> preview(UUID userId, UUID classId, List<Row> rows) {
    checkRows(rows); var c = requireClass(userId, classId); classroom.requireScope(c);
    List<Result> results = new ArrayList<>();
    for (Row r : rows) results.add(inspect(c, r, rows));
    return results;
  }
  @Transactional(readOnly = true)
  public void authorizeDraft(UUID userId, UUID centerId) { classroom.draftForImport(userId, centerId); }

  @Transactional(readOnly = true)
  public List<DraftResult> previewDraft(UUID userId, DraftBatch batch) {
    if (batch == null) throw bad(HttpStatus.BAD_REQUEST, "Thiếu danh sách nhập.");
    checkRows(batch.rows());
    var draft = classroom.draftForImport(userId, batch.centerId());
    List<DraftResult> results = new ArrayList<>();
    for (Row row : batch.rows()) {
      Result found = inspect(draft, row, batch.rows(), true);
      ChessClassService.StudentCommand student = null;
      if (Set.of("CLASS_ONLY", "CREATE_PROFILE", "REUSE").contains(found.action())) {
        student = command(row);
        if ("REUSE".equals(found.action())) {
          var values = classroom.validateStudent(student, draft.getCenterId());
          var profiles = classroom.candidates(draft, values.fullName());
          Student existing = profiles.stream().filter(p -> row.studentId() != null ? row.studentId().equals(p.getId()) : values.birthDate() != null && values.birthDate().equals(p.getBirthDate()) && values.parentPhoneNumber().equals(p.getParentPhoneNumber()))
            .findFirst().orElseThrow(() -> bad(HttpStatus.CONFLICT, "Hồ sơ đã thay đổi. Hãy kiểm tra lại danh sách."));
          student = new ChessClassService.StudentCommand(existing.getFullName(), existing.getBirthDate(), existing.getParentName(), existing.getParentPhoneNumber(), existing.getPhoneNumber(), existing.getNotes(), existing.getId());
        }
      }
      results.add(new DraftResult(row.rowNumber(), found.action(), found.message(), student == null ? null : student.studentId(), found.candidates(), student));
    }
    return results;
  }

  private Result inspect(ChessClass c, Row r, List<Row> rows) { return inspect(c, r, rows, false); }
  private Result inspect(ChessClass c, Row r, List<Row> rows, boolean searchNameOnly) {
    try {
      var command = command(r);
      var v = classroom.validateStudent(command, c.getCenterId());
      classroom.rejectActiveDuplicate(c, v.fullName(), null);
      boolean repeated = rows.stream().anyMatch(p -> p.rowNumber() < r.rowNumber() && ChessClassService.sameStudentName(value(p, "fullName"), v.fullName()));
      if (repeated || r.reuseRowNumber() != null) return result(r, "ERROR", "Học sinh bị trùng trong danh sách nhập. Hãy kiểm tra lại dòng này.");
      List<Candidate> choices = new ArrayList<>();
      var members = classroom.nameMatches(c, v.fullName());
      for (var m : members) choices.add(new Candidate(m.getId(), m.getStudentId(), m.getFullName(), m.getBirthDate(), m.getParentPhoneNumber(), m.isActive()));
      List<Student> profiles = searchNameOnly || ChessClassService.hasProfileData(v) || r.studentId() != null ? classroom.candidates(c, v.fullName()) : List.of();
      for (var p : profiles) if (choices.stream().noneMatch(x -> p.getId().equals(x.studentId())))
        choices.add(new Candidate(null, p.getId(), p.getFullName(), p.getBirthDate(), p.getParentPhoneNumber(), false));
      if (r.membershipId() != null) {
        var member = c.getMemberships().stream().filter(m -> r.membershipId().equals(m.getId())).findFirst().orElseThrow(() -> bad(HttpStatus.BAD_REQUEST, "Thành viên không thuộc lớp."));
        if (member.isActive()) throw bad(HttpStatus.CONFLICT, "Học sinh đã có trong lớp.");
        if (r.studentId() != null && profiles.stream().noneMatch(p -> r.studentId().equals(p.getId())))
          throw bad(HttpStatus.BAD_REQUEST, "Hồ sơ không thuộc phạm vi hoặc không khớp tên.");
        return result(r, "REUSE", member.getStudent() == null && ChessClassService.hasProfileData(v) ? "Bổ sung hồ sơ cho thành viên đã rời lớp" : "Dùng lại thành viên trong lớp");
      }
      if (r.studentId() != null) {
        if (profiles.stream().noneMatch(p -> r.studentId().equals(p.getId()))) throw bad(HttpStatus.BAD_REQUEST, "Hồ sơ không thuộc phạm vi hoặc không khớp tên.");
        if (c.getActiveMemberships().stream().anyMatch(m -> r.studentId().equals(m.getStudentId()))) throw bad(HttpStatus.CONFLICT, "Học sinh đã có trong lớp.");
        return result(r, "REUSE", "Dùng hồ sơ có sẵn");
      }
      if (v.birthDate() != null && profiles.stream().anyMatch(p -> v.birthDate().equals(p.getBirthDate()) && v.parentPhoneNumber().equals(p.getParentPhoneNumber())))
        return result(r, "REUSE", "Dùng hồ sơ có sẵn");
      if (!members.isEmpty() || v.birthDate() == null && !profiles.isEmpty())
        return new Result(r.rowNumber(), "RESOLVE", "Có hồ sơ trùng tên. Hãy chọn hồ sơ có sẵn hoặc kiểm tra lại thông tin học sinh.", null, null, choices, false);
      return result(r, ChessClassService.hasProfileData(v) ? "CREATE_PROFILE" : "CLASS_ONLY", ChessClassService.hasProfileData(v) ? "Tạo hồ sơ và thêm vào lớp" : "Chỉ thêm vào lớp");
    } catch (ResponseStatusException e) { return result(r, "ERROR", e.getReason()); }
  }
  private Result result(Row r, String action, String message) { return new Result(r.rowNumber(), action, message, null, null, List.of(), false); }

  /** Each row and its durable receipt commit together. Failed rows remain editable. */
  public List<Result> commit(UUID userId, UUID classId, Batch batch) {
    if (batch == null || batch.importId() == null) throw bad(HttpStatus.BAD_REQUEST, "Thiếu mã lần nhập.");
    checkRows(batch.rows());
    List<Result> results = new ArrayList<>();
    for (Row r : batch.rows().stream().sorted(Comparator.comparingInt(Row::rowNumber)).toList()) {
      try {
        Result saved = transaction.execute(status -> {
          db.queryForList("select id from users where id = ? for update", userId);
          var c = classes.findForUpdate(classId, userId).orElseThrow(() -> bad(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học."));
          classroom.requireScope(c);
          String hash = hash(r);
          var receipts = db.queryForList("select class_id, user_id, payload_hash, result_json from student_import_rows where import_id = ? and row_number = ?", batch.importId(), r.rowNumber());
          if (!receipts.isEmpty()) {
            var receipt = receipts.getFirst();
            if (!classId.equals(receipt.get("class_id")) || !userId.equals(receipt.get("user_id")) || !hash.equals(receipt.get("payload_hash")))
              throw bad(HttpStatus.CONFLICT, "Dòng này đã nhập với dữ liệu khác. Hãy bắt đầu lần nhập mới.");
            try { return json.readValue((String) receipt.get("result_json"), Result.class); }
            catch (Exception e) { throw new IllegalStateException(e); }
          }
          Result inspection = inspect(c, r, batch.rows());
          if (Set.of("ERROR", "RESOLVE").contains(inspection.action())) return inspection;
          var command = command(r);
          Set<UUID> activeBefore = c.getActiveMemberships().stream().map(ClassMembership::getId).collect(java.util.stream.Collectors.toSet());
          Set<UUID> profilesBefore = classroom.candidates(c, command.fullName()).stream().map(Student::getId).collect(java.util.stream.Collectors.toSet());
          if (command.studentId() != null) profilesBefore.add(command.studentId());
          var member = classroom.enroll(userId, classId, command);
          entities.flush();
          boolean created = member.getStudentId() != null && !profilesBefore.contains(member.getStudentId());
          boolean enrolled = !activeBefore.contains(member.getId());
          String message = !created && !enrolled ? "Đã có trong lớp; bỏ qua thêm mới" : created && !enrolled ? "Đã bổ sung hồ sơ; giữ nguyên lịch sử trong lớp" : inspection.message();
          Result done = new Result(r.rowNumber(), inspection.action(), message, member.getId(), member.getStudentId(), List.of(), true, created, enrolled);
          try { db.update("insert into student_import_rows (import_id, row_number, class_id, user_id, payload_hash, result_json) values (?, ?, ?, ?, ?, ?)", batch.importId(), r.rowNumber(), classId, userId, hash, json.writeValueAsString(done)); }
          catch (com.fasterxml.jackson.core.JsonProcessingException e) { throw new IllegalStateException(e); }
          return done;
        });
        results.add(saved);
      } catch (ResponseStatusException e) { results.add(result(r, "ERROR", e.getReason())); }
      catch (org.springframework.dao.DataIntegrityViolationException e) { results.add(result(r, "ERROR", "Dữ liệu đã thay đổi hoặc trùng hồ sơ. Hãy kiểm tra lại dòng này.")); }
      catch (org.hibernate.exception.ConstraintViolationException e) { results.add(result(r, "ERROR", "Không lưu được thành viên lớp. Dòng này đã được hoàn tác; hãy kiểm tra lại dữ liệu.")); }
    }
    return results;
  }
  private String hash(Row row) {
    try {
      var canonical = new Row(row.rowNumber(), new TreeMap<>(row.values()), row.studentId(), row.membershipId(), row.confirmNew(), row.reuseRowNumber(), row.issues() == null ? Map.of() : new TreeMap<>(row.issues()));
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsString(canonical).getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) { throw new IllegalStateException(e); }
  }
  private static ResponseStatusException bad(HttpStatus status, String message) { return new ResponseStatusException(status, message); }
}
