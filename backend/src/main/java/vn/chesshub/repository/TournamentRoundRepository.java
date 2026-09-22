package vn.chesshub.repository;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.chesshub.entity.TournamentRound;
public interface TournamentRoundRepository extends JpaRepository<TournamentRound, UUID> { List<TournamentRound> findByTournamentIdOrderByRoundNumberAsc(UUID tournamentId); void deleteByTournamentId(UUID tournamentId); }
