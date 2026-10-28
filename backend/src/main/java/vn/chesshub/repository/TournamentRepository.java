package vn.chesshub.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import vn.chesshub.entity.Tournament;

public interface TournamentRepository extends JpaRepository<Tournament, UUID> {
  @EntityGraph(attributePaths = {"chessClass", "session.chessClass"}) java.util.List<Tournament> findByTeacherIdOrderByCreatedAtDesc(UUID teacherId);
  @EntityGraph(attributePaths = {"chessClass", "session.chessClass"}) java.util.Optional<Tournament> findByIdAndTeacherId(UUID id, UUID teacherId);
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from Tournament t where t.id = :id and t.teacherId = :teacherId")
  java.util.Optional<Tournament> findOwnedForUpdate(@Param("id") UUID id, @Param("teacherId") UUID teacherId);
}
