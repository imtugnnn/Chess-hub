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
import vn.chesshub.entity.Student;
import vn.chesshub.repository.StudentRepository;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping("/api/v1/teachers/{teacherId}/students")
public class StudentController {
  private final StudentRepository students;

  public StudentController(StudentRepository students) { this.students = students; }

  @GetMapping("/name-suggestions")
  public List<NameSuggestionResponse> nameSuggestions(@PathVariable UUID teacherId, @RequestParam String query) {
    String normalizedQuery = query == null ? "" : query.trim();
    if (normalizedQuery.length() < 2) return List.of();
    return students.findNameSuggestionsForTeacher(teacherId, normalizedQuery, PageRequest.of(0, 8)).stream()
      .map(NameSuggestionResponse::from).toList();
  }

  public record NameSuggestionResponse(UUID id, String fullName, LocalDate birthDate, String parentName, String parentPhoneNumber) {
    static NameSuggestionResponse from(Student student) {
      return new NameSuggestionResponse(student.getId(), student.getFullName(), student.getBirthDate(), student.getParentName(), student.getParentPhoneNumber());
    }
  }
}
