package vn.chesshub.repository;

import java.util.List;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.chesshub.entity.ChessClass;

public interface ChessClassRepository extends JpaRepository<ChessClass, UUID> {
  List<ChessClass> findByTeacherIdOrderByName(UUID teacherId);

  @EntityGraph(attributePaths = "students")
  Optional<ChessClass> findByIdAndTeacherId(UUID id, UUID teacherId);
}
