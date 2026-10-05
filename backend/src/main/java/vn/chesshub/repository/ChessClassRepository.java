package vn.chesshub.repository;

import java.util.List;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.chesshub.entity.ChessClass;

public interface ChessClassRepository extends JpaRepository<ChessClass, UUID> {
  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @org.springframework.data.jpa.repository.Query("select c from ChessClass c where c.id = :id and c.teacher.id = :teacherId")
  Optional<ChessClass> findForUpdate(UUID id, UUID teacherId);

  List<ChessClass> findByTeacherIdOrderByName(UUID teacherId);

  boolean existsByTeacherId(UUID teacherId);

  @EntityGraph(attributePaths = "students")
  List<ChessClass> findWithStudentsByTeacherIdOrderByName(UUID teacherId);

  @EntityGraph(attributePaths = "students")
  Optional<ChessClass> findByIdAndTeacherId(UUID id, UUID teacherId);
}
