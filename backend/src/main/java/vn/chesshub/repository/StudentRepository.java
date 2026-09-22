package vn.chesshub.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.chesshub.entity.Student;

public interface StudentRepository extends JpaRepository<Student, UUID> {
  Optional<Student> findByPhoneNumber(String phoneNumber);
}
