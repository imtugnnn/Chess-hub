package vn.chesshub.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import vn.chesshub.entity.Tournament;

public interface TournamentRepository extends JpaRepository<Tournament, UUID> {
  @EntityGraph(attributePaths = "session.chessClass") java.util.List<Tournament> findBySessionChessClassTeacherIdOrderByCreatedAtDesc(UUID teacherId);
  @EntityGraph(attributePaths = "session.chessClass") java.util.Optional<Tournament> findByIdAndSessionChessClassTeacherId(UUID id, UUID teacherId);
}
