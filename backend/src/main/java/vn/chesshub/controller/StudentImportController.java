package vn.chesshub.controller;

import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.chesshub.service.*;

@RestController
@RequestMapping("/api/v1/teachers/{teacherId}/classes/{classId}/students/import")
public class StudentImportController {
  private final StudentImportService imports;
  private final StudentWorkbookService workbooks;
  public StudentImportController(StudentImportService imports, StudentWorkbookService workbooks) { this.imports = imports; this.workbooks = workbooks; }
  @PostMapping(value = "/read", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public StudentWorkbookService.WorkbookData read(@PathVariable UUID teacherId, @PathVariable UUID classId, @RequestParam MultipartFile file, @RequestParam(defaultValue = "0") int sheet) {
    imports.authorize(teacherId, classId); return workbooks.read(file, sheet);
  }
  @PostMapping("/preview")
  public List<StudentImportService.Result> preview(@PathVariable UUID teacherId, @PathVariable UUID classId, @RequestBody StudentImportService.Batch batch) {
    if (batch == null) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu danh sách nhập.");
    return imports.preview(teacherId, classId, batch.rows());
  }
  @PostMapping("/commit")
  public List<StudentImportService.Result> commit(@PathVariable UUID teacherId, @PathVariable UUID classId, @RequestBody StudentImportService.Batch batch) { return imports.commit(teacherId, classId, batch); }
  @GetMapping("/template")
  public ResponseEntity<byte[]> template(@PathVariable UUID teacherId, @PathVariable UUID classId) { imports.authorize(teacherId, classId); return excel(workbooks.template(), "mau-hoc-sinh.xlsx"); }
  public record ErrorExport(List<StudentImportService.Row> rows, List<StudentImportService.Result> results) { }
  @PostMapping("/errors")
  public ResponseEntity<byte[]> errors(@PathVariable UUID teacherId, @PathVariable UUID classId, @RequestBody ErrorExport request) {
    imports.authorize(teacherId, classId);
    if (request == null || request.rows() == null || request.results() == null || request.rows().size() > 1000 || request.results().size() > 1000
        || request.rows().stream().anyMatch(r -> r == null || r.values() == null) || request.results().stream().anyMatch(Objects::isNull))
      throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Danh sách xuất không hợp lệ.");
    return excel(workbooks.export(request.rows(), request.results()), "hoc-sinh-can-sua.xlsx");
  }
  private ResponseEntity<byte[]> excel(byte[] bytes, String name) {
    return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
      .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + name + "\"").body(bytes);
  }
}
