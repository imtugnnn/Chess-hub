package vn.chesshub.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.entity.ClassSession;
import vn.chesshub.entity.Student;
import vn.chesshub.entity.Tournament;
import vn.chesshub.entity.TournamentPairing;
import vn.chesshub.entity.TournamentParticipant;
import vn.chesshub.entity.TournamentRound;
import vn.chesshub.entity.TournamentTieBreak;
import vn.chesshub.repository.ClassSessionRepository;
import vn.chesshub.repository.TournamentPairingRepository;
import vn.chesshub.repository.TournamentParticipantRepository;
import vn.chesshub.repository.TournamentRepository;
import vn.chesshub.repository.TournamentRoundRepository;
import vn.chesshub.repository.TournamentTieBreakRepository;

@Service
public class TournamentService {
  public static final List<String> AVAILABLE_TIE_BREAKS = List.of("WIN_COUNT", "WHITE_GAME_COUNT");
  private static final Set<String> RESULTS = Set.of("WHITE_WIN", "DRAW", "BLACK_WIN");
  private final ClassSessionRepository sessions;
  private final TournamentRepository tournaments;
  private final TournamentParticipantRepository participants;
  private final TournamentTieBreakRepository tieBreaks;
  private final TournamentRoundRepository rounds;
  private final TournamentPairingRepository pairings;

  public TournamentService(ClassSessionRepository sessions, TournamentRepository tournaments, TournamentParticipantRepository participants, TournamentTieBreakRepository tieBreaks, TournamentRoundRepository rounds, TournamentPairingRepository pairings) {
    this.sessions = sessions; this.tournaments = tournaments; this.participants = participants; this.tieBreaks = tieBreaks; this.rounds = rounds; this.pairings = pairings;
  }

  public ClassSession getSession(UUID teacherId, UUID classId, UUID sessionId) { return sessions.findByIdAndChessClassIdAndChessClassTeacherId(sessionId, classId, teacherId).orElseThrow(() -> notFound("Không tìm thấy buổi học.")); }

  @Transactional
  public Tournament create(UUID teacherId, UUID classId, UUID sessionId, List<UUID> participantIds, Integer roundCount, List<String> requestedTieBreaks) {
    ClassSession session = getSession(teacherId, classId, sessionId);
    if (participantIds == null || participantIds.size() < 2 || participantIds.stream().anyMatch(Objects::isNull)) throw bad("Giải Swiss cần ít nhất 2 học sinh.");
    Set<UUID> participantSet = Set.copyOf(participantIds);
    if (participantSet.size() != participantIds.size()) throw bad("Danh sách học sinh không được trùng lặp.");
    int maxRounds = Math.min(9, participantSet.size() - 1);
    if (roundCount == null || roundCount < 1 || roundCount > maxRounds) throw bad("Số vòng phải từ 1 đến " + maxRounds + ".");
    validateTieBreaks(requestedTieBreaks);
    List<Student> classStudents = session.getChessClass().getStudents().stream().filter(student -> participantSet.contains(student.getId())).toList();
    if (classStudents.size() != participantSet.size()) throw bad("Chỉ được chọn học sinh thuộc lớp này.");
    Tournament tournament = tournaments.save(new Tournament(session, roundCount));
    List<Student> seeded = new ArrayList<>(classStudents); Collections.shuffle(seeded);
    List<TournamentParticipant> roster = new ArrayList<>();
    for (int index = 0; index < seeded.size(); index++) roster.add(new TournamentParticipant(tournament, seeded.get(index), index + 1));
    participants.saveAll(roster);
    List<TournamentTieBreak> savedTieBreaks = new ArrayList<>();
    for (int index = 0; index < requestedTieBreaks.size(); index++) savedTieBreaks.add(new TournamentTieBreak(tournament, requestedTieBreaks.get(index), index + 1));
    tieBreaks.saveAll(savedTieBreaks);
    generateNextRound(tournament);
    return tournament;
  }

  public List<TournamentListItem> list(UUID teacherId) { return tournaments.findBySessionChessClassTeacherIdOrderByCreatedAtDesc(teacherId).stream().map(item -> new TournamentListItem(item.getId(), item.getSession().getChessClass().getName(), item.getRoundCount(), item.getStatus())).toList(); }
  @Transactional(readOnly = true) public TournamentDetails details(UUID teacherId, UUID tournamentId) { return details(findTournament(teacherId, tournamentId)); }

  @Transactional
  public void saveResults(UUID teacherId, UUID tournamentId, int roundNumber, List<ResultCommand> updates) {
    TournamentRound round = round(findTournament(teacherId, tournamentId).getId(), roundNumber);
    if (!"RESULTS_OPEN".equals(round.getStatus())) throw bad("Vòng đấu này đã được chốt.");
    if (updates == null || updates.isEmpty()) throw bad("Hãy nhập ít nhất một kết quả.");
    Map<UUID, TournamentPairing> available = pairings.findByRoundIdOrderByBoardNumberAsc(round.getId()).stream().collect(java.util.stream.Collectors.toMap(TournamentPairing::getId, item -> item));
    Set<UUID> seen = new HashSet<>();
    for (ResultCommand update : updates) {
      if (update == null || update.pairingId() == null || !seen.add(update.pairingId())) throw bad("Kết quả trận đấu không hợp lệ.");
      TournamentPairing pairing = available.get(update.pairingId());
      if (pairing == null || "BYE".equals(pairing.getResult()) || !RESULTS.contains(update.result())) throw bad("Kết quả trận đấu không hợp lệ.");
      pairing.recordResult(update.result());
    }
  }

  @Transactional
  public TournamentDetails finalizeRound(UUID teacherId, UUID tournamentId, int roundNumber) {
    Tournament tournament = findTournament(teacherId, tournamentId); TournamentRound round = round(tournamentId, roundNumber);
    if (!"RESULTS_OPEN".equals(round.getStatus())) throw bad("Vòng đấu này đã được chốt.");
    if (pairings.findByRoundIdOrderByBoardNumberAsc(round.getId()).stream().anyMatch(pairing -> "PENDING".equals(pairing.getResult()))) throw bad("Hãy nhập kết quả cho tất cả các bàn trước khi chốt vòng.");
    round.finalizeRound(); if (roundNumber == tournament.getRoundCount()) tournament.complete(); return details(tournament);
  }

  @Transactional
  public TournamentDetails nextRound(UUID teacherId, UUID tournamentId) {
    Tournament tournament = findTournament(teacherId, tournamentId); List<TournamentRound> existing = rounds.findByTournamentIdOrderByRoundNumberAsc(tournamentId);
    if (existing.isEmpty() || !"COMPLETED".equals(existing.getLast().getStatus())) throw bad("Hãy chốt vòng hiện tại trước khi chia cặp vòng tiếp theo.");
    if (existing.size() >= tournament.getRoundCount()) throw bad("Giải đấu đã hoàn thành đủ số vòng.");
    generateNextRound(tournament); return details(tournament);
  }

  @Transactional
  public void delete(UUID teacherId, UUID tournamentId) {
    findTournament(teacherId, tournamentId);
    pairings.deleteByRoundTournamentId(tournamentId);
    rounds.deleteByTournamentId(tournamentId);
    tieBreaks.deleteByTournamentId(tournamentId);
    participants.deleteByTournamentId(tournamentId);
    tournaments.deleteById(tournamentId);
  }

  private void generateNextRound(Tournament tournament) {
    int number = rounds.findByTournamentIdOrderByRoundNumberAsc(tournament.getId()).size() + 1;
    List<TournamentParticipant> roster = participants.findByTournamentId(tournament.getId()); List<TournamentPairing> history = pairings.findByRoundTournamentIdOrderByRoundRoundNumberAscBoardNumberAsc(tournament.getId());
    Map<UUID, StandingStats> stats = standings(roster, history); List<TournamentParticipant> ranked = new ArrayList<>(roster);
    ranked.sort(rankingComparator(stats, tieBreaks.findByTournamentIdOrderBySortOrder(tournament.getId())));
    TournamentParticipant bye = chooseBye(ranked, history); if (bye != null) ranked.remove(bye);
    TournamentRound round = rounds.save(new TournamentRound(tournament, number));
    Set<String> played = history.stream().filter(pairing -> pairing.getBlackParticipant() != null).map(pairing -> pairKey(pairing.getWhiteParticipant(), pairing.getBlackParticipant())).collect(java.util.stream.Collectors.toSet());
    int board = 1;
    while (!ranked.isEmpty()) {
      TournamentParticipant first = ranked.removeFirst();
      TournamentParticipant opponent = ranked.stream().filter(candidate -> !played.contains(pairKey(first, candidate))).min(Comparator.comparingInt((TournamentParticipant candidate) -> Math.abs(stats.get(first.getId()).halfPoints - stats.get(candidate.getId()).halfPoints)).thenComparingInt(candidate -> colorPenalty(first, candidate, stats)).thenComparingInt(TournamentParticipant::getInitialSeed)).orElseThrow(() -> bad("Không thể chia cặp mà không tái đấu."));
      ranked.remove(opponent); TournamentParticipant white = chooseWhite(first, opponent, stats, board); TournamentParticipant black = white == first ? opponent : first;
      pairings.save(new TournamentPairing(round, board++, white, black)); played.add(pairKey(first, opponent));
    }
    if (bye != null) pairings.save(new TournamentPairing(round, board, bye, null));
  }

  private TournamentDetails details(Tournament tournament) {
    List<TournamentParticipant> roster = participants.findByTournamentId(tournament.getId()); List<TournamentPairing> history = pairings.findByRoundTournamentIdOrderByRoundRoundNumberAscBoardNumberAsc(tournament.getId()); Map<UUID, StandingStats> stats = standings(roster, history); List<TournamentTieBreak> criteria = tieBreaks.findByTournamentIdOrderBySortOrder(tournament.getId());
    List<TournamentParticipant> ranked = new ArrayList<>(roster); ranked.sort(rankingComparator(stats, criteria)); List<StandingView> table = new ArrayList<>();
    for (int index = 0; index < ranked.size(); index++) { TournamentParticipant player = ranked.get(index); StandingStats stat = stats.get(player.getId()); table.add(new StandingView(index + 1, player.getId(), player.getStudent().getFullName(), stat.halfPoints / 2.0, stat.wins, stat.draws, stat.losses, stat.whiteGames)); }
    List<RoundView> roundViews = rounds.findByTournamentIdOrderByRoundNumberAsc(tournament.getId()).stream().map(round -> new RoundView(round.getId(), round.getRoundNumber(), round.getStatus(), pairings.findByRoundIdOrderByBoardNumberAsc(round.getId()).stream().map(this::pairingView).toList())).toList();
    return new TournamentDetails(tournament.getId(), tournament.getSession().getChessClass().getName(), tournament.getSession().getSessionDate(), tournament.getRoundCount(), tournament.getStatus(), criteria.stream().map(TournamentTieBreak::getType).toList(), roundViews, table);
  }

  private PairingView pairingView(TournamentPairing pairing) { return new PairingView(pairing.getId(), pairing.getBoardNumber(), participantView(pairing.getWhiteParticipant()), pairing.getBlackParticipant() == null ? null : participantView(pairing.getBlackParticipant()), pairing.getResult()); }
  private ParticipantView participantView(TournamentParticipant participant) { return new ParticipantView(participant.getId(), participant.getStudent().getFullName()); }
  private Tournament findTournament(UUID teacherId, UUID id) { return tournaments.findByIdAndSessionChessClassTeacherId(id, teacherId).orElseThrow(() -> notFound("Không tìm thấy giải đấu.")); }
  private TournamentRound round(UUID tournamentId, int number) { return rounds.findByTournamentIdOrderByRoundNumberAsc(tournamentId).stream().filter(item -> item.getRoundNumber() == number).findFirst().orElseThrow(() -> notFound("Không tìm thấy vòng đấu.")); }
  private void validateTieBreaks(List<String> items) { if (items == null || items.isEmpty() || items.size() > 3 || items.stream().anyMatch(Objects::isNull)) throw bad("Cần chọn từ 1 đến 3 tie-break."); Set<String> unique = Set.copyOf(items); if (unique.size() != items.size() || !AVAILABLE_TIE_BREAKS.containsAll(unique)) throw bad("Tie-break không hợp lệ hoặc bị trùng."); }
  private ResponseStatusException bad(String value) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, value); } private ResponseStatusException notFound(String value) { return new ResponseStatusException(HttpStatus.NOT_FOUND, value); }
  private TournamentParticipant chooseBye(List<TournamentParticipant> ranked, List<TournamentPairing> history) { if (ranked.size() % 2 == 0) return null; Set<UUID> prior = history.stream().filter(pairing -> "BYE".equals(pairing.getResult())).map(pairing -> pairing.getWhiteParticipant().getId()).collect(java.util.stream.Collectors.toSet()); return ranked.reversed().stream().filter(player -> !prior.contains(player.getId())).findFirst().orElse(ranked.getLast()); }
  private String pairKey(TournamentParticipant left, TournamentParticipant right) { return left.getId().compareTo(right.getId()) < 0 ? left.getId() + ":" + right.getId() : right.getId() + ":" + left.getId(); }
  private int colorPenalty(TournamentParticipant left, TournamentParticipant right, Map<UUID, StandingStats> stats) { return Math.abs(stats.get(left.getId()).whiteGames - stats.get(right.getId()).whiteGames); }
  private TournamentParticipant chooseWhite(TournamentParticipant left, TournamentParticipant right, Map<UUID, StandingStats> stats, int board) { int lw = stats.get(left.getId()).whiteGames, rw = stats.get(right.getId()).whiteGames; if (lw != rw) return lw < rw ? left : right; return board % 2 == 1 ? left : right; }
  private Comparator<TournamentParticipant> rankingComparator(Map<UUID, StandingStats> stats, List<TournamentTieBreak> criteria) { Comparator<TournamentParticipant> result = Comparator.comparingInt((TournamentParticipant item) -> stats.get(item.getId()).halfPoints).reversed(); for (TournamentTieBreak criterion : criteria) { if ("WIN_COUNT".equals(criterion.getType())) result = result.thenComparing(Comparator.comparingInt((TournamentParticipant item) -> stats.get(item.getId()).wins).reversed()); if ("WHITE_GAME_COUNT".equals(criterion.getType())) result = result.thenComparing(Comparator.comparingInt((TournamentParticipant item) -> stats.get(item.getId()).whiteGames).reversed()); } return result.thenComparingInt(TournamentParticipant::getInitialSeed).thenComparing(item -> item.getStudent().getFullName()); }
  private Map<UUID, StandingStats> standings(List<TournamentParticipant> roster, List<TournamentPairing> history) { Map<UUID, StandingStats> result = new HashMap<>(); roster.forEach(player -> result.put(player.getId(), new StandingStats())); for (TournamentPairing pairing : history) { StandingStats white = result.get(pairing.getWhiteParticipant().getId()); white.whiteGames++; if ("BYE".equals(pairing.getResult())) { white.halfPoints += 2; continue; } StandingStats black = result.get(pairing.getBlackParticipant().getId()); switch (pairing.getResult()) { case "WHITE_WIN" -> { white.halfPoints += 2; white.wins++; black.losses++; } case "BLACK_WIN" -> { black.halfPoints += 2; black.wins++; white.losses++; } case "DRAW" -> { white.halfPoints++; black.halfPoints++; white.draws++; black.draws++; } default -> { } } } return result; }
  private static class StandingStats { int halfPoints; int wins; int draws; int losses; int whiteGames; }
  public record ResultCommand(UUID pairingId, String result) { }
  public record TournamentListItem(UUID id, String className, int roundCount, String status) { }
  public record TournamentDetails(UUID id, String className, LocalDate sessionDate, int roundCount, String status, List<String> tieBreaks, List<RoundView> rounds, List<StandingView> standings) { }
  public record RoundView(UUID id, int number, String status, List<PairingView> pairings) { }
  public record PairingView(UUID id, int boardNumber, ParticipantView white, ParticipantView black, String result) { }
  public record ParticipantView(UUID id, String fullName) { }
  public record StandingView(int rank, UUID participantId, String fullName, double points, int wins, int draws, int losses, int whiteGameCount) { }
}
