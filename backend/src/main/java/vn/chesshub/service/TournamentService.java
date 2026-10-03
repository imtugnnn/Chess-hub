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
import vn.chesshub.entity.ChessClass;
import vn.chesshub.entity.Student;
import vn.chesshub.entity.Tournament;
import vn.chesshub.entity.TournamentPairing;
import vn.chesshub.entity.TournamentParticipant;
import vn.chesshub.entity.TournamentRound;
import vn.chesshub.entity.TournamentTieBreak;
import vn.chesshub.repository.ClassSessionRepository;
import vn.chesshub.repository.ChessClassRepository;
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
  private final ChessClassRepository classes;
  private final TournamentRepository tournaments;
  private final TournamentParticipantRepository participants;
  private final TournamentTieBreakRepository tieBreaks;
  private final TournamentRoundRepository rounds;
  private final TournamentPairingRepository pairings;

  public TournamentService(ClassSessionRepository sessions, TournamentRepository tournaments, TournamentParticipantRepository participants, TournamentTieBreakRepository tieBreaks, TournamentRoundRepository rounds, TournamentPairingRepository pairings, ChessClassRepository classes) {
    this.sessions = sessions; this.tournaments = tournaments; this.participants = participants; this.tieBreaks = tieBreaks; this.rounds = rounds; this.pairings = pairings; this.classes = classes;
  }

  public ClassSession getSession(UUID teacherId, UUID classId, UUID sessionId) { return sessions.findByIdAndChessClassIdAndChessClassTeacherId(sessionId, classId, teacherId).orElseThrow(() -> notFound("Không tìm thấy buổi học.")); }
  public ChessClass getClass(UUID teacherId, UUID classId) { return classes.findByIdAndTeacherId(classId, teacherId).orElseThrow(() -> notFound("Không tìm thấy lớp học.")); }

  @Transactional
  public Tournament create(UUID teacherId, UUID classId, UUID sessionId, List<UUID> participantIds, Integer roundCount, List<String> requestedTieBreaks) {
    return create(teacherId, classId, sessionId, null, participantIds, List.of(), requestedTieBreaks);
  }

  @Transactional
  public Tournament create(UUID teacherId, UUID classId, UUID sessionId, String name, List<UUID> participantIds, List<String> participantNames, List<String> requestedTieBreaks) {
    ClassSession session = sessionId == null ? null : getSession(teacherId, classId, sessionId);
    ChessClass classroom = session == null ? getClass(teacherId, classId) : session.getChessClass();
    if (participantIds == null) participantIds = List.of();
    if (participantIds.stream().anyMatch(Objects::isNull)) throw bad("Danh sách học sinh không hợp lệ.");
    Set<UUID> participantSet = Set.copyOf(participantIds);
    if (participantSet.size() != participantIds.size()) throw bad("Danh sách học sinh không được trùng lặp.");
    List<Student> classStudents = classroom.getStudents().stream().filter(student -> participantSet.contains(student.getId())).toList();
    if (classStudents.size() != participantSet.size()) throw bad("Chỉ được chọn học sinh thuộc lớp này.");
    return createRoster(teacherId, classroom, session, name == null ? classroom.getName() : name, classStudents, participantNames, requestedTieBreaks);
  }

  @Transactional
  public Tournament createStandalone(UUID teacherId, String name, List<String> participantNames, List<String> requestedTieBreaks) {
    return createRoster(teacherId, null, null, name, List.of(), participantNames, requestedTieBreaks);
  }

  private Tournament createRoster(UUID teacherId, ChessClass classroom, ClassSession session, String name, List<Student> students, List<String> names, List<String> requestedTieBreaks) {
    String title = validateName(name, "Tên giải đấu");
    List<String> guestNames = names == null ? List.of() : names.stream().map(value -> validateName(value, "Tên người chơi")).toList();
    if (students.size() + guestNames.size() < 2) throw bad("Giải Swiss cần ít nhất 2 người chơi.");
    validateTieBreaks(requestedTieBreaks);
    Tournament tournament = tournaments.save(new Tournament(teacherId, classroom, session, title));
    List<TournamentParticipant> roster = new ArrayList<>();
    // Names belong to this tournament; guests do not need student records.
    List<Object> seeded = new ArrayList<>(students); seeded.addAll(guestNames); Collections.shuffle(seeded);
    for (int index = 0; index < seeded.size(); index++) {
      Object player = seeded.get(index);
      roster.add(player instanceof Student student ? new TournamentParticipant(tournament, student, index + 1) : new TournamentParticipant(tournament, (String) player, index + 1));
    }
    participants.saveAll(roster);
    List<TournamentTieBreak> savedTieBreaks = new ArrayList<>();
    for (int index = 0; index < requestedTieBreaks.size(); index++) savedTieBreaks.add(new TournamentTieBreak(tournament, requestedTieBreaks.get(index), index + 1));
    tieBreaks.saveAll(savedTieBreaks);
    generateNextRound(tournament);
    return tournament;
  }

  @Transactional(readOnly = true)
  public List<TournamentListItem> list(UUID teacherId) { return tournaments.findByTeacherIdOrderByCreatedAtDesc(teacherId).stream().map(item -> new TournamentListItem(item.getId(), item.getChessClass() == null ? null : item.getChessClass().getId(), item.getChessClass() == null ? null : item.getChessClass().getName(), item.getRoundCount(), item.getStatus(), item.getName())).toList(); }
  @Transactional(readOnly = true) public TournamentDetails details(UUID teacherId, UUID tournamentId) { return details(findTournament(teacherId, tournamentId)); }

  @Transactional
  public void saveResults(UUID teacherId, UUID tournamentId, int roundNumber, List<ResultCommand> updates) {
    TournamentRound round = round(findTournamentForUpdate(teacherId, tournamentId).getId(), roundNumber);
    if (!"RESULTS_OPEN".equals(round.getStatus())) throw bad("Vòng đấu này đã được chốt.");
    if (updates == null || updates.isEmpty()) throw bad("Hãy nhập ít nhất một kết quả.");
    Map<UUID, TournamentPairing> available = pairings.findByRoundIdOrderByBoardNumberAsc(round.getId()).stream().collect(java.util.stream.Collectors.toMap(TournamentPairing::getId, item -> item));
    Set<UUID> seen = new HashSet<>();
    for (ResultCommand update : updates) {
      if (update == null || update.pairingId() == null || !seen.add(update.pairingId())) throw bad("Kết quả trận đấu không hợp lệ.");
      TournamentPairing pairing = available.get(update.pairingId());
      if (pairing == null || "BYE".equals(pairing.getResult()) || update.result() == null || !RESULTS.contains(update.result())) throw bad("Kết quả trận đấu không hợp lệ.");
      pairing.recordResult(update.result());
    }
  }

  @Transactional
  public TournamentDetails finalizeRound(UUID teacherId, UUID tournamentId, int roundNumber) {
    Tournament tournament = findTournamentForUpdate(teacherId, tournamentId); TournamentRound round = round(tournamentId, roundNumber);
    if (!"RESULTS_OPEN".equals(round.getStatus())) throw bad("Vòng đấu này đã được chốt.");
    if (pairings.findByRoundIdOrderByBoardNumberAsc(round.getId()).stream().anyMatch(pairing -> "PENDING".equals(pairing.getResult()))) throw bad("Hãy nhập kết quả cho tất cả các bàn trước khi chốt vòng.");
    round.finalizeRound(); return details(tournament);
  }

  @Transactional
  public TournamentDetails nextRound(UUID teacherId, UUID tournamentId) {
    Tournament tournament = findTournamentForUpdate(teacherId, tournamentId); List<TournamentRound> existing = rounds.findByTournamentIdOrderByRoundNumberAsc(tournamentId);
    if (existing.isEmpty() || !"COMPLETED".equals(existing.getLast().getStatus())) throw bad("Hãy chốt vòng hiện tại trước khi chia cặp vòng tiếp theo.");
    generateNextRound(tournament); return details(tournament);
  }

  @Transactional
  public TournamentDetails complete(UUID teacherId, UUID tournamentId) {
    Tournament tournament = findTournamentForUpdate(teacherId, tournamentId);
    List<TournamentRound> existing = rounds.findByTournamentIdOrderByRoundNumberAsc(tournamentId);
    if (existing.isEmpty() || !"COMPLETED".equals(existing.getLast().getStatus())) throw bad("Hãy chốt vòng hiện tại trước khi kết thúc giải.");
    tournament.complete(); return details(tournament);
  }

  @Transactional
  public void delete(UUID teacherId, UUID tournamentId) {
    findTournamentForUpdate(teacherId, tournamentId);
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
    Map<String, Integer> meetings = new HashMap<>();
    history.stream().filter(pairing -> pairing.getBlackParticipant() != null).forEach(pairing -> meetings.merge(pairKey(pairing.getWhiteParticipant(), pairing.getBlackParticipant()), 1, Integer::sum));
    List<PlayerPair> matches = new ArrayList<>();
    // Bounded search avoids greedy dead ends. Exhausting fresh opponents does not end a tournament.
    if (!match(ranked, matches, stats, meetings, false, new int[]{20000})) {
      matches.clear();
      if (!match(ranked, matches, stats, meetings, true, new int[]{20000})) {
        matches.clear();
        for (int index = 0; index < ranked.size(); index += 2) matches.add(new PlayerPair(ranked.get(index), ranked.get(index + 1)));
      }
    }
    TournamentRound round = rounds.save(new TournamentRound(tournament, number));
    int board = 1;
    for (PlayerPair pair : matches) {
      TournamentParticipant white = chooseWhite(pair.left(), pair.right(), stats, board);
      pairings.save(new TournamentPairing(round, board++, white, white == pair.left() ? pair.right() : pair.left()));
    }
    if (bye != null) pairings.save(new TournamentPairing(round, board, bye, null));
    tournament.recordRound(number);
  }

  private boolean match(List<TournamentParticipant> remaining, List<PlayerPair> result, Map<UUID, StandingStats> stats, Map<String, Integer> meetings, boolean allowRepeats, int[] budget) {
    if (remaining.isEmpty()) return true;
    if (--budget[0] < 0) return false;
    TournamentParticipant first = remaining.getFirst();
    List<TournamentParticipant> candidates = remaining.subList(1, remaining.size()).stream()
      .filter(candidate -> allowRepeats || !meetings.containsKey(pairKey(first, candidate)))
      .filter(candidate -> hasLegalColorAssignment(first, candidate, stats))
      .sorted(Comparator.comparingInt((TournamentParticipant candidate) -> meetings.getOrDefault(pairKey(first, candidate), 0))
        .thenComparingInt(candidate -> Math.abs(stats.get(first.getId()).halfPoints - stats.get(candidate.getId()).halfPoints))
        .thenComparingInt(candidate -> colorPenalty(first, candidate, stats)).thenComparingInt(TournamentParticipant::getInitialSeed)).toList();
    for (TournamentParticipant candidate : candidates) {
      List<TournamentParticipant> next = new ArrayList<>(remaining); next.remove(first); next.remove(candidate);
      result.add(new PlayerPair(first, candidate));
      if (match(next, result, stats, meetings, allowRepeats, budget)) return true;
      result.removeLast();
      if (budget[0] < 0) break;
    }
    return false;
  }

  private record PlayerPair(TournamentParticipant left, TournamentParticipant right) { }

  private TournamentDetails details(Tournament tournament) {
    List<TournamentParticipant> roster = participants.findByTournamentId(tournament.getId()); List<TournamentPairing> history = pairings.findByRoundTournamentIdOrderByRoundRoundNumberAscBoardNumberAsc(tournament.getId()); Map<UUID, StandingStats> stats = standings(roster, history); List<TournamentTieBreak> criteria = tieBreaks.findByTournamentIdOrderBySortOrder(tournament.getId());
    List<TournamentParticipant> ranked = new ArrayList<>(roster); ranked.sort(rankingComparator(stats, criteria)); List<StandingView> table = new ArrayList<>();
    for (int index = 0; index < ranked.size(); index++) { TournamentParticipant player = ranked.get(index); StandingStats stat = stats.get(player.getId()); table.add(new StandingView(index + 1, player.getId(), player.getFullName(), stat.halfPoints / 2.0, stat.wins, stat.draws, stat.losses, stat.whiteGames)); }
    List<RoundView> roundViews = rounds.findByTournamentIdOrderByRoundNumberAsc(tournament.getId()).stream().map(round -> new RoundView(round.getId(), round.getRoundNumber(), round.getStatus(), pairings.findByRoundIdOrderByBoardNumberAsc(round.getId()).stream().map(this::pairingView).toList())).toList();
    return new TournamentDetails(tournament.getId(), tournament.getChessClass() == null ? null : tournament.getChessClass().getName(), tournament.getSession() == null ? null : tournament.getSession().getSessionDate(), roundViews.size(), tournament.getStatus(), criteria.stream().map(TournamentTieBreak::getType).toList(), roundViews, table, tournament.getName());
  }

  private PairingView pairingView(TournamentPairing pairing) { return new PairingView(pairing.getId(), pairing.getBoardNumber(), participantView(pairing.getWhiteParticipant()), pairing.getBlackParticipant() == null ? null : participantView(pairing.getBlackParticipant()), pairing.getResult()); }
  private ParticipantView participantView(TournamentParticipant participant) { return new ParticipantView(participant.getId(), participant.getFullName()); }
  private Tournament findTournament(UUID teacherId, UUID id) { return tournaments.findByIdAndTeacherId(id, teacherId).orElseThrow(() -> notFound("Không tìm thấy giải đấu.")); }
  private Tournament findTournamentForUpdate(UUID teacherId, UUID id) { return tournaments.findOwnedForUpdate(id, teacherId).orElseThrow(() -> notFound("Không tìm thấy giải đấu.")); }
  private String validateName(String value, String label) { if (value == null || value.isBlank() || value.strip().length() > 255) throw bad(label + " phải có từ 1 đến 255 ký tự."); return value.strip(); }
  private TournamentRound round(UUID tournamentId, int number) { return rounds.findByTournamentIdOrderByRoundNumberAsc(tournamentId).stream().filter(item -> item.getRoundNumber() == number).findFirst().orElseThrow(() -> notFound("Không tìm thấy vòng đấu.")); }
  private void validateTieBreaks(List<String> items) { if (items == null || items.isEmpty() || items.size() > 3 || items.stream().anyMatch(Objects::isNull)) throw bad("Cần chọn từ 1 đến 3 tie-break."); Set<String> unique = Set.copyOf(items); if (unique.size() != items.size() || !AVAILABLE_TIE_BREAKS.containsAll(unique)) throw bad("Tie-break không hợp lệ hoặc bị trùng."); }
  private ResponseStatusException bad(String value) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, value); } private ResponseStatusException notFound(String value) { return new ResponseStatusException(HttpStatus.NOT_FOUND, value); }
  private TournamentParticipant chooseBye(List<TournamentParticipant> ranked, List<TournamentPairing> history) { if (ranked.size() % 2 == 0) return null; Map<UUID, Integer> prior = new HashMap<>(); history.stream().filter(pairing -> "BYE".equals(pairing.getResult())).forEach(pairing -> prior.merge(pairing.getWhiteParticipant().getId(), 1, Integer::sum)); return ranked.reversed().stream().min(Comparator.comparingInt(player -> prior.getOrDefault(player.getId(), 0))).orElseThrow(); }
  private String pairKey(TournamentParticipant left, TournamentParticipant right) { return left.getId().compareTo(right.getId()) < 0 ? left.getId() + ":" + right.getId() : right.getId() + ":" + left.getId(); }
  private int colorPenalty(TournamentParticipant left, TournamentParticipant right, Map<UUID, StandingStats> stats) { return Math.abs(stats.get(left.getId()).whiteGames - stats.get(right.getId()).whiteGames); }
  private boolean hasLegalColorAssignment(TournamentParticipant left, TournamentParticipant right, Map<UUID, StandingStats> stats) { return (canPlayColor(left, true, stats) && canPlayColor(right, false, stats)) || (canPlayColor(left, false, stats) && canPlayColor(right, true, stats)); }
  private boolean canPlayColor(TournamentParticipant player, boolean white, Map<UUID, StandingStats> stats) { StandingStats stat = stats.get(player.getId()); return stat.lastColorWhite == null || stat.lastColorWhite.booleanValue() != white || stat.sameColorStreak < 2; }
  private TournamentParticipant chooseWhite(TournamentParticipant left, TournamentParticipant right, Map<UUID, StandingStats> stats, int board) {
    boolean leftCanBeWhite = canPlayColor(left, true, stats) && canPlayColor(right, false, stats);
    boolean rightCanBeWhite = canPlayColor(left, false, stats) && canPlayColor(right, true, stats);
    if (leftCanBeWhite && !rightCanBeWhite) return left;
    if (rightCanBeWhite && !leftCanBeWhite) return right;
    if (!leftCanBeWhite) return colorCost(left, true, stats) + colorCost(right, false, stats) <= colorCost(right, true, stats) + colorCost(left, false, stats) ? left : right;
    int lw = stats.get(left.getId()).whiteGames, rw = stats.get(right.getId()).whiteGames;
    if (lw != rw) return lw < rw ? left : right;
    return board % 2 == 1 ? left : right;
  }
  private int colorCost(TournamentParticipant player, boolean white, Map<UUID, StandingStats> stats) { StandingStats stat = stats.get(player.getId()); return (canPlayColor(player, white, stats) ? 0 : 1000 + stat.sameColorStreak) + Math.abs(stat.whiteGames - stat.blackGames + (white ? 1 : -1)); }
  private Comparator<TournamentParticipant> rankingComparator(Map<UUID, StandingStats> stats, List<TournamentTieBreak> criteria) { Comparator<TournamentParticipant> result = Comparator.comparingInt((TournamentParticipant item) -> stats.get(item.getId()).halfPoints).reversed(); for (TournamentTieBreak criterion : criteria) { if ("WIN_COUNT".equals(criterion.getType())) result = result.thenComparing(Comparator.comparingInt((TournamentParticipant item) -> stats.get(item.getId()).wins).reversed()); if ("WHITE_GAME_COUNT".equals(criterion.getType())) result = result.thenComparing(Comparator.comparingInt((TournamentParticipant item) -> stats.get(item.getId()).whiteGames).reversed()); } return result.thenComparingInt(TournamentParticipant::getInitialSeed).thenComparing(TournamentParticipant::getFullName); }
  private Map<UUID, StandingStats> standings(List<TournamentParticipant> roster, List<TournamentPairing> history) { Map<UUID, StandingStats> result = new HashMap<>(); roster.forEach(player -> result.put(player.getId(), new StandingStats())); for (TournamentPairing pairing : history) { if (!"COMPLETED".equals(pairing.getRound().getStatus())) continue; StandingStats white = result.get(pairing.getWhiteParticipant().getId()); if ("BYE".equals(pairing.getResult())) { white.halfPoints += 2; continue; } StandingStats black = result.get(pairing.getBlackParticipant().getId()); white.whiteGames++; black.blackGames++; white.recordColor(true); black.recordColor(false); switch (pairing.getResult()) { case "WHITE_WIN" -> { white.halfPoints += 2; white.wins++; black.losses++; } case "BLACK_WIN" -> { black.halfPoints += 2; black.wins++; white.losses++; } case "DRAW" -> { white.halfPoints++; black.halfPoints++; white.draws++; black.draws++; } default -> { } } } return result; }
  private static class StandingStats {
    int halfPoints; int wins; int draws; int losses; int whiteGames; int blackGames; Boolean lastColorWhite; int sameColorStreak;
    void recordColor(boolean white) { sameColorStreak = lastColorWhite != null && lastColorWhite == white ? sameColorStreak + 1 : 1; lastColorWhite = white; }
  }
  public record ResultCommand(UUID pairingId, String result) { }
  public record TournamentListItem(UUID id, UUID classId, String className, int roundCount, String status, String name) { }
  public record TournamentDetails(UUID id, String className, LocalDate sessionDate, int roundCount, String status, List<String> tieBreaks, List<RoundView> rounds, List<StandingView> standings, String name) { }
  public record RoundView(UUID id, int number, String status, List<PairingView> pairings) { }
  public record PairingView(UUID id, int boardNumber, ParticipantView white, ParticipantView black, String result) { }
  public record ParticipantView(UUID id, String fullName) { }
  public record StandingView(int rank, UUID participantId, String fullName, double points, int wins, int draws, int losses, int whiteGameCount) { }
}
