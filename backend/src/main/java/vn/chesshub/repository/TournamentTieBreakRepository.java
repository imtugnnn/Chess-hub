package vn.chesshub.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.chesshub.entity.TournamentTieBreak;

public interface TournamentTieBreakRepository extends JpaRepository<TournamentTieBreak, UUID> {
  List<TournamentTieBreak> findByTournamentIdOrderBySortOrder(UUID tournamentId);
  void deleteByTournamentId(UUID tournamentId);
}
