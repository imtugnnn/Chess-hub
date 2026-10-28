package vn.chesshub.controller;

import java.util.List;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.chesshub.service.StudentImportService;
import vn.chesshub.service.StudentWorkbookService;

/** Read-only import preparation before a class exists. Account ownership/CSRF are enforced by SecurityConfig. */
@RestController
@RequestMapping("/api/v1/teachers/{teacherId}/classes/students/import")
public class ClassDraftStudentImportController {
  private final StudentImportService imports;
  private final StudentWorkbookService workbooks;
  public ClassDraftStudentImportController(StudentImportService imports, StudentWorkbookService workbooks) { this.imports = imports; this.workbooks = workbooks; }

  @PostMapping(value = "/read", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public StudentWorkbookService.WorkbookData read(@PathVariable UUID teacherId, @RequestParam(required = false) UUID centerId, @RequestParam MultipartFile file, @RequestParam(defaultValue = "0") int sheet) {
    imports.authorizeDraft(teacherId, centerId);
    return workbooks.read(file, sheet);
  }

  @PostMapping("/preview")
  public List<StudentImportService.DraftResult> preview(@PathVariable UUID teacherId, @RequestBody StudentImportService.DraftBatch batch) { return imports.previewDraft(teacherId, batch); }

  @GetMapping("/template")
  public ResponseEntity<byte[]> template(@PathVariable UUID teacherId, @RequestParam(required = false) UUID centerId) {
    imports.authorizeDraft(teacherId, centerId);
    return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
      .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"mau-hoc-sinh.xlsx\"").body(workbooks.template());
  }
}
