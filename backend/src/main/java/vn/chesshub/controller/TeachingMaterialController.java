package vn.chesshub.controller;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.chesshub.service.TeachingMaterialService;
import vn.chesshub.service.TeachingMaterialService.Material;

@RestController
@RequestMapping("/api/v1/teachers/{teacherId}")
public class TeachingMaterialController {
  private final TeachingMaterialService materials;
  public TeachingMaterialController(TeachingMaterialService materials) { this.materials = materials; }

  @GetMapping("/materials")
  public List<Material> search(@PathVariable UUID teacherId, @RequestParam(defaultValue = "") String query,
      @RequestParam(defaultValue = "all") String library) { return materials.search(teacherId, query, library); }

  @PostMapping(value = "/materials", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public Material create(@PathVariable UUID teacherId, @RequestParam(defaultValue = "") String title, @RequestParam(defaultValue = "") String description,
      @RequestParam(required = false) String url, @RequestParam(required = false) UUID centerId, @RequestParam(required = false) MultipartFile file) {
    return materials.create(teacherId, centerId, title, description, url, file);
  }

  @PutMapping(value = "/materials/{materialId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public Material update(@PathVariable UUID teacherId, @PathVariable UUID materialId, @RequestParam(defaultValue = "") String title,
      @RequestParam(defaultValue = "") String description, @RequestParam(required = false) String url, @RequestParam(required = false) MultipartFile file) {
    return materials.update(teacherId, materialId, title, description, url, file);
  }

  @DeleteMapping("/materials/{materialId}")
  public ResponseEntity<Void> delete(@PathVariable UUID teacherId, @PathVariable UUID materialId) {
    materials.delete(teacherId, materialId); return ResponseEntity.noContent().build();
  }

  @GetMapping("/materials/{materialId}/file")
  public ResponseEntity<byte[]> file(@PathVariable UUID teacherId, @PathVariable UUID materialId) {
    var file = materials.download(teacherId, materialId);
    var disposition = MediaType.APPLICATION_PDF_VALUE.equals(file.contentType())
      ? ContentDisposition.inline() : ContentDisposition.attachment();
    return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "private, no-store")
      .header("X-Content-Type-Options", "nosniff")
      .header(HttpHeaders.CONTENT_DISPOSITION, disposition.filename(file.name(), StandardCharsets.UTF_8).build().toString())
      .contentType(MediaType.parseMediaType(file.contentType())).body(file.data());
  }

  @GetMapping("/classes/{classId}/sessions/{sessionId}/materials")
  public List<Material> list(@PathVariable UUID teacherId, @PathVariable UUID classId, @PathVariable UUID sessionId) {
    return materials.forSession(teacherId, classId, sessionId);
  }

  @PostMapping("/classes/{classId}/sessions/{sessionId}/materials/{materialId}")
  public List<Material> attach(@PathVariable UUID teacherId, @PathVariable UUID classId, @PathVariable UUID sessionId, @PathVariable UUID materialId) {
    return materials.attach(teacherId, classId, sessionId, materialId);
  }

  @PostMapping(value = "/classes/{classId}/sessions/{sessionId}/materials", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public List<Material> createForSession(@PathVariable UUID teacherId, @PathVariable UUID classId, @PathVariable UUID sessionId,
      @RequestParam(defaultValue = "") String title, @RequestParam(defaultValue = "") String description, @RequestParam(required = false) String url,
      @RequestParam(required = false) MultipartFile file) {
    return materials.createForSession(teacherId, classId, sessionId, title, description, url, file);
  }

  @DeleteMapping("/classes/{classId}/sessions/{sessionId}/materials/{materialId}")
  public ResponseEntity<Void> detach(@PathVariable UUID teacherId, @PathVariable UUID classId, @PathVariable UUID sessionId, @PathVariable UUID materialId) {
    materials.detach(teacherId, classId, sessionId, materialId); return ResponseEntity.noContent().build();
  }
}
