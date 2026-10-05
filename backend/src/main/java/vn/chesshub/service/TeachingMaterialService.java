package vn.chesshub.service;

import java.io.IOException;
import java.net.URI;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.repository.ClassSessionRepository;

@Service
@Transactional(readOnly = true)
public class TeachingMaterialService {
  private static final long MAX_FILE_SIZE = 20 * 1024 * 1024;
  private static final String COLUMNS = "m.id, m.owner_user_id, m.center_id, m.title, m.description, m.source_url, m.file_name, m.content_type, octet_length(m.file_data) as file_size, m.deleted_at, m.updated_at, EXISTS (SELECT 1 FROM centers c WHERE c.id = m.center_id AND c.owner_user_id = :userId) as is_center_owner";
  private static final String ACCESS = """
    (m.owner_user_id = :userId OR EXISTS (SELECT 1 FROM centers c WHERE c.id = m.center_id AND c.owner_user_id = :userId) OR EXISTS (
      SELECT 1 FROM center_memberships cm WHERE cm.center_id = m.center_id
      AND cm.user_id = :userId AND cm.status = 'ACTIVE'))
    """;
  private final NamedParameterJdbcTemplate db;
  private final ClassSessionRepository sessions;

  public TeachingMaterialService(NamedParameterJdbcTemplate db, ClassSessionRepository sessions) {
    this.db = db;
    this.sessions = sessions;
  }

  public List<Material> search(UUID userId, String query) {
    return search(userId, query, "all");
  }

  public List<Material> search(UUID userId, String query, String library) {
    String term = query == null ? "" : query.trim();
    if (term.length() > 255) throw error(HttpStatus.BAD_REQUEST, "Từ khóa quá dài.");
    // Escape LIKE wildcards: searching '%' should search for that character.
    String pattern = "%" + term.toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
    String filter = switch (library) {
      case "mine" -> " AND m.owner_user_id = :userId";
      case "center" -> " AND m.center_id IS NOT NULL";
      case "all" -> "";
      default -> throw error(HttpStatus.BAD_REQUEST, "Danh sách bài giảng không hợp lệ.");
    };
    return db.query("SELECT " + COLUMNS + " FROM teaching_materials m WHERE m.deleted_at IS NULL AND " + ACCESS + filter
      + " AND (lower(m.title) LIKE :query ESCAPE '!' OR lower(m.description) LIKE :query ESCAPE '!') ORDER BY m.updated_at DESC, m.id LIMIT 100",
      Map.of("userId", userId, "query", pattern), (rs, row) -> material(rs, userId));
  }

  @Transactional
  public Material create(UUID userId, UUID centerId, String title, String description, String url, MultipartFile file) {
    if (centerId != null) requireCenterOwner(userId, centerId);
    var source = source(url, file);
    UUID id = UUID.randomUUID();
    var args = new org.springframework.jdbc.core.namedparam.MapSqlParameterSource()
      .addValue("id", id).addValue("owner", centerId == null ? userId : null).addValue("center", centerId)
      .addValue("title", title(title)).addValue("description", description(description))
      .addValue("url", source.url()).addValue("name", source.fileName()).addValue("type", source.contentType())
      .addValue("data", source.data(), java.sql.Types.BINARY);
    db.update("""
      INSERT INTO teaching_materials(id, owner_user_id, center_id, title, description, source_url, file_name, content_type, file_data)
      VALUES (:id, :owner, :center, :title, :description, :url, :name, :type, :data)
      """, args);
    return find(userId, id);
  }

  @Transactional
  public Material update(UUID userId, UUID id, String title, String description, String url, MultipartFile file) {
    Material existing = find(userId, id, true);
    requireEditor(userId, existing);
    var args = new org.springframework.jdbc.core.namedparam.MapSqlParameterSource()
      .addValue("id", id).addValue("title", title(title)).addValue("description", description(description));
    String replacement = "";
    if ((file != null && !file.isEmpty()) || (url != null && !url.isBlank())) {
      var source = source(url, file);
      args.addValue("url", source.url()).addValue("name", source.fileName()).addValue("type", source.contentType())
        .addValue("data", source.data(), java.sql.Types.BINARY);
      replacement = ", source_url = :url, file_name = :name, content_type = :type, file_data = :data";
    }
    db.update("UPDATE teaching_materials SET title = :title, description = :description, updated_at = CURRENT_TIMESTAMP"
      + replacement + " WHERE id = :id", args);
    return find(userId, id);
  }

  @Transactional
  public void delete(UUID userId, UUID id) {
    Material existing = find(userId, id, true);
    requireEditor(userId, existing);
    // Keep attachments in existing lessons; remove the material from library search.
    db.update("UPDATE teaching_materials SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id", Map.of("id", id));
  }

  public Download download(UUID userId, UUID id) {
    Material existing = find(userId, id);
    if (existing.fileName() == null) throw error(HttpStatus.BAD_REQUEST, "Bài giảng này là liên kết.");
    byte[] data = db.queryForObject("SELECT file_data FROM teaching_materials WHERE id = :id", Map.of("id", id), byte[].class);
    return new Download(existing.fileName(), existing.contentType(), data);
  }

  public List<Material> forSession(UUID userId, UUID classId, UUID sessionId) {
    requireSession(userId, classId, sessionId);
    return db.query("SELECT " + COLUMNS + " FROM teaching_materials m JOIN session_materials sm ON sm.material_id = m.id"
      + " WHERE sm.session_id = :sessionId AND " + ACCESS + " ORDER BY sm.added_at, m.id",
      Map.of("userId", userId, "sessionId", sessionId), (rs, row) -> material(rs, userId));
  }

  @Transactional
  public List<Material> attach(UUID userId, UUID classId, UUID sessionId, UUID materialId) {
    requireSession(userId, classId, sessionId);
    lockClass(userId, classId);
    requireSession(userId, classId, sessionId);
    Material existing = find(userId, materialId, true);
    if (existing.deleted()) throw error(HttpStatus.CONFLICT, "Bài giảng đã xóa khỏi thư viện.");
    db.update("INSERT INTO session_materials(session_id, material_id) VALUES (:session, :material) ON CONFLICT DO NOTHING",
      Map.of("session", sessionId, "material", materialId));
    return forSession(userId, classId, sessionId);
  }

  @Transactional
  public List<Material> createForSession(UUID userId, UUID classId, UUID sessionId, String title, String description, String url, MultipartFile file) {
    requireSession(userId, classId, sessionId);
    lockClass(userId, classId);
    requireSession(userId, classId, sessionId);
    Material created = create(userId, null, title, description, url, file);
    return attach(userId, classId, sessionId, created.id());
  }

  @Transactional
  public void detach(UUID userId, UUID classId, UUID sessionId, UUID materialId) {
    requireSession(userId, classId, sessionId);
    lockClass(userId, classId);
    requireSession(userId, classId, sessionId);
    db.update("DELETE FROM session_materials WHERE session_id = :session AND material_id = :material", Map.of("session", sessionId, "material", materialId));
  }

  private Material find(UUID userId, UUID id) {
    return find(userId, id, false);
  }

  private Material find(UUID userId, UUID id, boolean lock) {
    var matches = db.query("SELECT " + COLUMNS + " FROM teaching_materials m WHERE m.id = :id AND " + ACCESS + (lock ? " FOR UPDATE OF m" : ""),
      Map.of("id", id, "userId", userId), (rs, row) -> material(rs, userId));
    if (matches.isEmpty()) throw error(HttpStatus.NOT_FOUND, "Không tìm thấy bài giảng hoặc bạn không có quyền truy cập.");
    Material result = matches.getFirst();
    if (result.deleted()) {
      Integer count = db.queryForObject("""
        SELECT count(*) FROM session_materials sm JOIN class_sessions s ON s.id = sm.session_id
        JOIN chess_classes c ON c.id = s.class_id WHERE sm.material_id = :id AND c.teacher_id = :userId
        """, Map.of("id", id, "userId", userId), Integer.class);
      if (count == null || count == 0) throw error(HttpStatus.NOT_FOUND, "Bài giảng đã xóa khỏi thư viện.");
    }
    return result;
  }

  private Material material(ResultSet rs, UUID userId) throws SQLException {
    UUID owner = rs.getObject("owner_user_id", UUID.class);
    UUID center = rs.getObject("center_id", UUID.class);
    boolean editable = owner != null ? owner.equals(userId) : rs.getBoolean("is_center_owner");
    boolean deleted = rs.getTimestamp("deleted_at") != null;
    return new Material(rs.getObject("id", UUID.class), center, rs.getString("title"), rs.getString("description"),
      rs.getString("source_url"), rs.getString("file_name"), rs.getString("content_type"), rs.getLong("file_size"),
      editable && !deleted, deleted, rs.getTimestamp("updated_at").toInstant());
  }

  private boolean isCenterOwner(UUID userId, UUID centerId) {
    return Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS (SELECT 1 FROM centers WHERE id = :center AND owner_user_id = :userId)", Map.of("center", centerId, "userId", userId), Boolean.class));
  }

  private void requireCenterOwner(UUID userId, UUID centerId) {
    if (!isCenterOwner(userId, centerId)) throw error(HttpStatus.FORBIDDEN, "Chỉ chủ trung tâm được quản lý bài giảng mặc định.");
  }

  private void requireEditor(UUID userId, Material material) {
    if (!material.canEdit()) throw error(HttpStatus.FORBIDDEN, "Bạn không có quyền sửa hoặc xóa bài giảng này.");
    if (material.centerId() != null) requireCenterOwner(userId, material.centerId());
  }

  private void requireSession(UUID userId, UUID classId, UUID sessionId) {
    sessions.findByIdAndChessClassIdAndChessClassTeacherId(sessionId, classId, userId)
      .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy buổi học."));
  }

  private void lockClass(UUID userId, UUID classId) {
    db.queryForList("SELECT id FROM chess_classes WHERE id = :classId AND teacher_id = :userId FOR UPDATE",
      Map.of("classId", classId, "userId", userId), UUID.class);
  }

  static String title(String value) {
    String cleaned = value == null ? "" : value.trim();
    if (cleaned.length() > 255) throw error(HttpStatus.BAD_REQUEST, "Tên bài giảng tối đa 255 ký tự.");
    return cleaned;
  }

  private static String description(String value) {
    String cleaned = value == null ? "" : value.trim();
    if (cleaned.length() > 4000) throw error(HttpStatus.BAD_REQUEST, "Mô tả tối đa 4000 ký tự.");
    return cleaned;
  }

  static Source source(String url, MultipartFile file) {
    boolean hasFile = file != null && !file.isEmpty();
    boolean hasUrl = url != null && !url.isBlank();
    if (hasFile == hasUrl) throw error(HttpStatus.BAD_REQUEST, "Chọn một liên kết hoặc một tệp bài giảng.");
    if (hasUrl) {
      String cleaned = url.trim();
      try {
        URI parsed = URI.create(cleaned);
        if (cleaned.length() > 2048 || !"https".equalsIgnoreCase(parsed.getScheme()) || parsed.getHost() == null || parsed.getUserInfo() != null)
          throw new IllegalArgumentException();
      } catch (IllegalArgumentException invalid) { throw error(HttpStatus.BAD_REQUEST, "Liên kết phải là URL HTTPS hợp lệ."); }
      return new Source(cleaned, null, null, null);
    }
    if (file.getSize() > MAX_FILE_SIZE) throw error(HttpStatus.BAD_REQUEST, "Tệp tối đa 20 MB.");
    String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().replace('\\', '/');
    name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "");
    if (name.isBlank() || name.length() > 255) throw error(HttpStatus.BAD_REQUEST, "Tên tệp không hợp lệ.");
    String extension = name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    String type = switch (extension) {
      case "pdf" -> "application/pdf";
      case "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      case "ppt" -> "application/vnd.ms-powerpoint";
      default -> throw error(HttpStatus.BAD_REQUEST, "Chỉ hỗ trợ PDF, PPT và PPTX.");
    };
    try {
      byte[] data = file.getBytes();
      if (data.length > MAX_FILE_SIZE || !validFile(extension, data)) throw error(HttpStatus.BAD_REQUEST, "Nội dung tệp không đúng định dạng.");
      return new Source(null, name, type, data);
    } catch (IOException failure) { throw error(HttpStatus.BAD_REQUEST, "Không đọc được tệp bài giảng."); }
  }

  private static boolean validFile(String extension, byte[] data) throws IOException {
    if (extension.equals("pdf")) return data.length >= 5 && new String(data, 0, 5, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-");
    if (extension.equals("ppt")) return data.length >= 8 && java.util.Arrays.equals(java.util.Arrays.copyOf(data, 8), new byte[] {(byte)0xd0, (byte)0xcf, 0x11, (byte)0xe0, (byte)0xa1, (byte)0xb1, 0x1a, (byte)0xe1});
    // Inspect central-directory headers without inflating entries.
    return data.length > 4 && data[0] == 0x50 && data[1] == 0x4b && data[2] == 3 && data[3] == 4
      && containsZipEntry(data, "[Content_Types].xml") && containsZipEntry(data, "ppt/presentation.xml");
  }

  private static boolean containsZipEntry(byte[] data, String entry) {
    for (int i = 0; i + 46 <= data.length; i++) {
      if (data[i] != 0x50 || data[i + 1] != 0x4b || data[i + 2] != 1 || data[i + 3] != 2) continue;
      int length = (data[i + 28] & 255) | ((data[i + 29] & 255) << 8);
      if (i + 46 + length <= data.length && entry.equals(new String(data, i + 46, length, java.nio.charset.StandardCharsets.UTF_8))) return true;
    }
    return false;
  }

  private static ResponseStatusException error(HttpStatus status, String message) { return new ResponseStatusException(status, message); }
  public record Material(UUID id, UUID centerId, String title, String description, String sourceUrl, String fileName, String contentType, long fileSize, boolean canEdit, boolean deleted, Instant updatedAt) { }
  public record Download(String name, String contentType, byte[] data) { }
  record Source(String url, String fileName, String contentType, byte[] data) { }
}
