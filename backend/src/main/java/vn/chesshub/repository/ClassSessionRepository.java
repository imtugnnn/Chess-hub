package vn.chesshub.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import vn.chesshub.entity.ClassSession;

public interface ClassSessionRepository extends JpaRepository<ClassSession, UUID> {
  @EntityGraph(attributePaths = "chessClass")
  List<ClassSession> findByChessClassTeacherIdAndSessionDateBetweenOrderBySessionDateAscStartTimeAsc(UUID teacherId, LocalDate from, LocalDate to);

  List<ClassSession> findByChessClassIdOrderBySessionDateAscStartTimeAsc(UUID classId);

  void deleteByChessClassIdAndSessionDateAfter(UUID classId, LocalDate date);

  @EntityGraph(attributePaths = "chessClass.students")
  Optional<ClassSession> findByIdAndChessClassIdAndChessClassTeacherId(UUID id, UUID classId, UUID teacherId);
}
