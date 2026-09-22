package vn.chesshub.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import vn.chesshub.entity.TournamentParticipant;

public interface TournamentParticipantRepository extends JpaRepository<TournamentParticipant, UUID> {
  @EntityGraph(attributePaths = "student") List<TournamentParticipant> findByTournamentId(UUID tournamentId);
  void deleteByTournamentId(UUID tournamentId);
}
