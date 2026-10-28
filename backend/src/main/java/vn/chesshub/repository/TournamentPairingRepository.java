package vn.chesshub.repository;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.chesshub.entity.TournamentPairing;
public interface TournamentPairingRepository extends JpaRepository<TournamentPairing, UUID> {
  @EntityGraph(attributePaths = {"whiteParticipant.student", "blackParticipant.student", "round"}) List<TournamentPairing> findByRoundIdOrderByBoardNumberAsc(UUID roundId);
  @EntityGraph(attributePaths = {"whiteParticipant.student", "blackParticipant.student", "round"}) List<TournamentPairing> findByRoundTournamentIdOrderByRoundRoundNumberAscBoardNumberAsc(UUID tournamentId);
  void deleteByRoundTournamentId(UUID tournamentId);
}
