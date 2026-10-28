package vn.chesshub.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.service.StudentManagementService;
import vn.chesshub.entity.Student;
import vn.chesshub.repository.StudentRepository;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping("/api/v1/teachers/{teacherId}/students")
public class StudentController {
  private final StudentRepository students;
  private final StudentManagementService management;

  public StudentController(StudentRepository students, StudentManagementService management) { this.students = students; this.management = management; }

  @GetMapping
  public StudentManagementService.Page list(@PathVariable UUID teacherId,
      @RequestParam(defaultValue = "") String query, @RequestParam(defaultValue = "all") String scope,
      @RequestParam(required = false) UUID classId, @RequestParam(defaultValue = "all") String enrollment,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size) {
    return management.list(teacherId, query, scope, classId, enrollment, page, size);
  }
  @GetMapping("/options")
  public StudentManagementService.Options options(@PathVariable UUID teacherId) { return management.options(teacherId); }
  @GetMapping("/{studentId}")
  public StudentManagementService.Detail detail(@PathVariable UUID teacherId, @PathVariable UUID studentId,
      @RequestParam(defaultValue = "0") int historyPage) { return management.detail(teacherId, studentId, historyPage); }
  @PostMapping
  public StudentManagementService.StudentRow create(@PathVariable UUID teacherId, @RequestBody StudentManagementService.Input input) { return management.create(teacherId, input); }
  @PutMapping("/{studentId}")
  public StudentManagementService.StudentRow update(@PathVariable UUID teacherId, @PathVariable UUID studentId, @RequestBody StudentManagementService.Input input) { return management.update(teacherId, studentId, input); }
  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<java.util.Map<String, String>> error(ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).body(java.util.Map.of("message", e.getReason())); }

  @GetMapping("/name-suggestions")
  public List<NameSuggestionResponse> nameSuggestions(@PathVariable UUID teacherId, @RequestParam String query) {
    String normalizedQuery = query == null ? "" : query.trim();
    if (normalizedQuery.length() < 2) return List.of();
    return students.findNameSuggestionsForTeacher(teacherId, normalizedQuery, PageRequest.of(0, 8)).stream()
      .map(NameSuggestionResponse::from).toList();
  }

  public record NameSuggestionResponse(UUID id, String fullName, LocalDate birthDate, String parentName, String parentPhoneNumber, String phoneNumber, String notes) {
    static NameSuggestionResponse from(Student student) {
      return new NameSuggestionResponse(student.getId(), student.getFullName(), student.getBirthDate(), student.getParentName(), student.getParentPhoneNumber(), student.getPhoneNumber(), student.getNotes());
    }
  }
}
