package vn.chesshub.controller;

import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.DeleteMapping;
import vn.chesshub.service.TournamentService;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping("/api/v1/teachers/{teacherId}/tournaments")
public class TeacherTournamentController {
  private final TournamentService tournaments;
  public TeacherTournamentController(TournamentService tournaments) { this.tournaments = tournaments; }
  @GetMapping public List<TournamentService.TournamentListItem> list(@PathVariable UUID teacherId) { return tournaments.list(teacherId); }
  @GetMapping("/{tournamentId}") public TournamentService.TournamentDetails detail(@PathVariable UUID teacherId, @PathVariable UUID tournamentId) { return tournaments.details(teacherId, tournamentId); }
  @PutMapping("/{tournamentId}/rounds/{roundNumber}/results") public TournamentService.TournamentDetails results(@PathVariable UUID teacherId, @PathVariable UUID tournamentId, @PathVariable int roundNumber, @RequestBody ResultsRequest request) { tournaments.saveResults(teacherId, tournamentId, roundNumber, request == null ? null : request.results()); return tournaments.details(teacherId, tournamentId); }
  @PostMapping("/{tournamentId}/rounds/{roundNumber}/finalize") public TournamentService.TournamentDetails finalizeRound(@PathVariable UUID teacherId, @PathVariable UUID tournamentId, @PathVariable int roundNumber) { return tournaments.finalizeRound(teacherId, tournamentId, roundNumber); }
  @PostMapping("/{tournamentId}/rounds/next") public TournamentService.TournamentDetails nextRound(@PathVariable UUID teacherId, @PathVariable UUID tournamentId) { return tournaments.nextRound(teacherId, tournamentId); }
  @DeleteMapping("/{tournamentId}") public void delete(@PathVariable UUID teacherId, @PathVariable UUID tournamentId) { tournaments.delete(teacherId, tournamentId); }
  public record ResultsRequest(List<TournamentService.ResultCommand> results) { }
}
