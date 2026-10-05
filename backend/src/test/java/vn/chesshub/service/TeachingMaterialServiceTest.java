package vn.chesshub.service;

import java.io.ByteArrayOutputStream;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.entity.ClassSession;
import vn.chesshub.repository.ClassSessionRepository;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class TeachingMaterialServiceTest {
  private final NamedParameterJdbcTemplate db = mock(NamedParameterJdbcTemplate.class);
  private final ClassSessionRepository sessions = mock(ClassSessionRepository.class);
  private final TeachingMaterialService service = new TeachingMaterialService(db, sessions);
  private final UUID user = UUID.randomUUID();
  private final UUID id = UUID.randomUUID();
  private final UUID classId = UUID.randomUUID();
  private final UUID session = UUID.randomUUID();

  @Test void linksRejectExecutableSchemesAndCredentials() {
    for (String value : List.of("javascript:alert(1)", "http://example.com", "https://", "https://user:pass@example.com", "file:///tmp/test"))
      assertThrows(ResponseStatusException.class, () -> TeachingMaterialService.source(value, null));
    assertEquals("https://www.canva.com/design/abc/view", TeachingMaterialService.source(" https://www.canva.com/design/abc/view ", null).url());
    assertThrows(ResponseStatusException.class, () -> TeachingMaterialService.source(null, null));
  }

  @Test void fileUploadsCheckSizeAndActualContentAndNormalizeNames() throws Exception {
    var pdf = new MockMultipartFile("file", "C:\\private\\lesson.pdf", "text/html", "%PDF-1.7 test".getBytes());
    var result = TeachingMaterialService.source(null, pdf);
    assertEquals("lesson.pdf", result.fileName());
    assertEquals("application/pdf", result.contentType());
    assertThrows(ResponseStatusException.class, () -> TeachingMaterialService.source("https://example.com", pdf));
    assertThrows(ResponseStatusException.class, () -> TeachingMaterialService.source(null, new MockMultipartFile("file", "fake.pdf", "application/pdf", "<html>test".getBytes())));
    assertThrows(ResponseStatusException.class, () -> TeachingMaterialService.source(null, new MockMultipartFile("file", "test.html", "text/html", "%PDF-1.7".getBytes())));
    assertThrows(ResponseStatusException.class, () -> TeachingMaterialService.source(null, new MockMultipartFile("file", "huge.pdf", "application/pdf", new byte[20 * 1024 * 1024 + 1])));
    var bytes = new ByteArrayOutputStream();
    try (var zip = new ZipOutputStream(bytes)) {
      for (String entry : List.of("[Content_Types].xml", "ppt/presentation.xml")) {
        zip.putNextEntry(new ZipEntry(entry)); zip.write("<xml/>".getBytes()); zip.closeEntry();
      }
    }
    assertEquals("test.pptx", TeachingMaterialService.source(null, new MockMultipartFile("file", "test.pptx", "", bytes.toByteArray())).fileName());
    assertThrows(ResponseStatusException.class, () -> TeachingMaterialService.source(null, new MockMultipartFile("file", "fake.pptx", "", "%PDF-1.7".getBytes())));
  }

  @Test void onlyCenterOwnerCanCreateDefaultMaterial() {
    UUID center = UUID.randomUUID();
    when(db.queryForObject(anyString(), anyMap(), eq(Boolean.class))).thenReturn(false);
    assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
      () -> service.create(user, center, "Title", "", "https://example.com", null)).getStatusCode());
    verify(db, never()).update(anyString(), any(org.springframework.jdbc.core.namedparam.SqlParameterSource.class));
  }

  @Test void memberCanReadButCannotEditOrDeleteCenterDefault() throws Exception {
    material(null, UUID.randomUUID(), false, false);
    assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, () -> service.update(user, id, "Changed", "", null, null)).getStatusCode());
    assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, () -> service.delete(user, id)).getStatusCode());
    verify(db, never()).update(anyString(), anyMap());
  }

  @Test void personalOwnerAndCenterOwnerCanDeleteTheirMaterials() throws Exception {
    material(user, null, false, false);
    service.delete(user, id);
    verify(db).update(contains("deleted_at"), eq(Map.of("id", id)));
    reset(db);
    UUID center = UUID.randomUUID();
    material(null, center, true, false);
    when(db.queryForObject(anyString(), anyMap(), eq(Boolean.class))).thenReturn(true);
    service.delete(user, id);
    verify(db).update(contains("deleted_at"), eq(Map.of("id", id)));
  }

  @Test void missingAccessAndForeignSessionCannotBeAttached() {
    when(sessions.findByIdAndChessClassIdAndChessClassTeacherId(session, classId, user)).thenReturn(Optional.empty());
    assertThrows(ResponseStatusException.class, () -> service.attach(user, classId, session, id));
    verifyNoInteractions(db);
    when(sessions.findByIdAndChessClassIdAndChessClassTeacherId(session, classId, user)).thenReturn(Optional.of(mock(ClassSession.class)));
    when(db.query(anyString(), anyMap(), any(RowMapper.class))).thenReturn(List.of());
    assertThrows(ResponseStatusException.class, () -> service.attach(user, classId, session, id));
    verify(db, never()).update(anyString(), anyMap());
  }

  @Test void removedLibraryMaterialCannotBeAttachedAgainButExistingLessonCanDownload() throws Exception {
    when(sessions.findByIdAndChessClassIdAndChessClassTeacherId(session, classId, user)).thenReturn(Optional.of(mock(ClassSession.class)));
    material(user, null, false, true);
    when(db.queryForObject(anyString(), anyMap(), eq(Integer.class))).thenReturn(1);
    assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class, () -> service.attach(user, classId, session, id)).getStatusCode());
    verify(db, never()).update(anyString(), anyMap());
    when(db.queryForObject(anyString(), anyMap(), eq(Integer.class))).thenReturn(0);
    assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class, () -> service.download(user, id)).getStatusCode());
  }

  @SuppressWarnings("unchecked")
  private void material(UUID owner, UUID center, boolean isCenterOwner, boolean deleted) throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.getObject("id", UUID.class)).thenReturn(id);
    when(rs.getObject("owner_user_id", UUID.class)).thenReturn(owner);
    when(rs.getObject("center_id", UUID.class)).thenReturn(center);
    when(rs.getString("title")).thenReturn("Lesson");
    when(rs.getBoolean("is_center_owner")).thenReturn(isCenterOwner);
    when(rs.getTimestamp("updated_at")).thenReturn(Timestamp.from(Instant.now()));
    if (deleted) when(rs.getTimestamp("deleted_at")).thenReturn(Timestamp.from(Instant.now()));
    when(db.query(anyString(), anyMap(), any(RowMapper.class))).thenAnswer(call -> List.of(((RowMapper<?>) call.getArgument(2)).mapRow(rs, 0)));
  }
}
