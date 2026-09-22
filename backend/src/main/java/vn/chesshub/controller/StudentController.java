package vn.chesshub.controller;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.entity.Student;
import vn.chesshub.repository.StudentRepository;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping("/api/v1/students")
public class StudentController {
  private final StudentRepository students;

  public StudentController(StudentRepository students) { this.students = students; }

  @GetMapping("/search")
  public StudentResponse findByPhone(@RequestParam String phone) {
    String normalizedPhone = phone.replaceAll("[ .()-]", "");
    Student student = students.findByPhoneNumber(normalizedPhone)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh."));
    return StudentResponse.from(student);
  }

  public record StudentResponse(UUID id, String fullName, String phoneNumber, String parentPhoneNumber) {
    static StudentResponse from(Student student) {
      return new StudentResponse(student.getId(), student.getFullName(), student.getPhoneNumber(), student.getParentPhoneNumber());
    }
  }
}
