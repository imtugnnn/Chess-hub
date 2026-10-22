package vn.chesshub.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.entity.*;
import vn.chesshub.repository.*;

class TournamentOpenEndedTest {
  private final UUID owner = UUID.randomUUID();
  private final ChessClassRepository classes = mock(ChessClassRepository.class);
  private final ClassSessionRepository sessions = mock(ClassSessionRepository.class);
  private final TournamentRepository tournaments = mock(TournamentRepository.class);
  private final TournamentParticipantRepository participants = mock(TournamentParticipantRepository.class);
  private final TournamentTieBreakRepository tieBreaks = mock(TournamentTieBreakRepository.class);
  private final TournamentRoundRepository rounds = mock(TournamentRoundRepository.class);
  private final TournamentPairingRepository pairings = mock(TournamentPairingRepository.class);
  private final List<TournamentParticipant> roster = new ArrayList<>();
  private final List<TournamentTieBreak> criteria = new ArrayList<>();
  private final List<TournamentRound> allRounds = new ArrayList<>();
  private final List<TournamentPairing> history = new ArrayList<>();
  private Tournament tournament;
  private TournamentService service;

  @BeforeEach void setup() {
    service = new TournamentService(sessions, tournaments, participants, tieBreaks, rounds, pairings, classes);
    when(tournaments.save(any())).thenAnswer(call -> { tournament = call.getArgument(0); identify(tournament); return tournament; });
    when(tournaments.findOwnedForUpdate(any(), any())).thenAnswer(call -> owned(call.getArgument(0), call.getArgument(1)));
    when(tournaments.findByIdAndTeacherId(any(), any())).thenAnswer(call -> owned(call.getArgument(0), call.getArgument(1)));
    when(participants.saveAll(any())).thenAnswer(call -> { Iterable<TournamentParticipant> items = call.getArgument(0); items.forEach(player -> { identify(player); roster.add(player); }); return roster; });
    when(participants.findByTournamentId(any())).thenAnswer(call -> roster);
    when(tieBreaks.saveAll(any())).thenAnswer(call -> { Iterable<TournamentTieBreak> items = call.getArgument(0); items.forEach(criteria::add); return criteria; });
    when(tieBreaks.findByTournamentIdOrderBySortOrder(any())).thenAnswer(call -> criteria);
    when(rounds.save(any())).thenAnswer(call -> { TournamentRound item = call.getArgument(0); identify(item); allRounds.add(item); return item; });
    when(rounds.findByTournamentIdOrderByRoundNumberAsc(any())).thenAnswer(call -> allRounds);
    when(pairings.save(any())).thenAnswer(call -> { TournamentPairing item = call.getArgument(0); identify(item); history.add(item); return item; });
    when(pairings.findByRoundTournamentIdOrderByRoundRoundNumberAscBoardNumberAsc(any())).thenAnswer(call -> history);
    when(pairings.findByRoundIdOrderByBoardNumberAsc(any())).thenAnswer(call -> history.stream().filter(item -> item.getRound().getId().equals(call.getArgument(0))).toList());
  }

  @Test void createsStandalonePlayersWithoutStudentRecordsAndRetainsDuplicateNames() {
    create(List.of("  Minh Anh  ", "Minh Anh"));
    assertNull(tournament.getSession());
    assertEquals(owner, tournament.getTeacherId());
    assertEquals("Giải cuối tuần", tournament.getName());
    assertEquals(1, tournament.getRoundCount());
    assertTrue(roster.stream().allMatch(player -> player.getStudent() == null && player.getFullName().equals("Minh Anh")));
    assertNotEquals(roster.get(0).getId(), roster.get(1).getId());
    assertEquals(2, service.details(owner, tournament.getId()).standings().size());
    verifyNoInteractions(sessions);
  }

  @Test void rejectsInvalidNamesAndInsufficientRosterBeforeSaving() {
    assertThrows(ResponseStatusException.class, () -> create(List.of("An")));
    assertThrows(ResponseStatusException.class, () -> create(List.of("An", " ")));
    assertThrows(ResponseStatusException.class, () -> create(Arrays.asList("An", null)));
    assertThrows(ResponseStatusException.class, () -> create(List.of("An", "a".repeat(256))));
    assertThrows(ResponseStatusException.class, () -> service.createStandalone(owner, " ", List.of("An", "Bình"), List.of("WIN_COUNT")));
    verify(tournaments, never()).save(any());
  }

  @Test void canPlayTwentyFiveRoundsWithTwoPlayersThenFinishAndResume() {
    create(List.of("An", "Bình"));
    UUID previousWhite = null;
    for (int number = 1; number <= 25; number++) {
      TournamentPairing pairing = history.getLast();
      assertNotEquals(previousWhite, pairing.getWhiteParticipant().getId());
      previousWhite = pairing.getWhiteParticipant().getId();
      settle(number);
      assertEquals("ACTIVE", tournament.getStatus());
      assertEquals(number, tournament.getRoundCount());
      if (number < 25) service.nextRound(owner, tournament.getId());
    }
    assertEquals(25, service.details(owner, tournament.getId()).rounds().size());
    assertEquals(25, service.details(owner, tournament.getId()).standings().stream().mapToDouble(TournamentService.StandingView::points).sum());
    assertEquals("COMPLETED", service.complete(owner, tournament.getId()).status());
    assertEquals("ACTIVE", service.nextRound(owner, tournament.getId()).status());
    assertEquals(26, tournament.getRoundCount());
  }

  @Test void oddRosterRotatesByesAcrossRepeatedRounds() {
    create(List.of("An", "Bình", "Chi"));
    for (int number = 1; number <= 12; number++) { settle(number); if (number < 12) service.nextRound(owner, tournament.getId()); }
    for (TournamentParticipant player : roster) {
      assertEquals(4, history.stream().filter(item -> "BYE".equals(item.getResult()) && item.getWhiteParticipant() == player).count());
    }
    assertEquals(24, history.size());
  }

  @Test void prioritizesFreshOpponentsBeforeAllowingRematches() {
    create(List.of("An", "Bình", "Chi", "Dũng"));
    Set<String> matches = new HashSet<>();
    for (int number = 1; number <= 3; number++) {
      for (TournamentPairing pairing : currentPairings(number)) {
        String left = pairing.getWhiteParticipant().getId().toString(); String right = pairing.getBlackParticipant().getId().toString();
        assertTrue(matches.add(left.compareTo(right) < 0 ? left + right : right + left));
      }
      settle(number); if (number < 3) service.nextRound(owner, tournament.getId());
    }
    assertEquals(4, service.nextRound(owner, tournament.getId()).roundCount());
  }

  @Test void requiresSavedResultsAndFinalizationBeforeNewRoundOrCompletion() {
    create(List.of("An", "Bình"));
    assertThrows(ResponseStatusException.class, () -> service.nextRound(owner, tournament.getId()));
    assertThrows(ResponseStatusException.class, () -> service.complete(owner, tournament.getId()));
    assertThrows(ResponseStatusException.class, () -> service.finalizeRound(owner, tournament.getId(), 1));
    TournamentPairing pairing = history.getFirst();
    service.saveResults(owner, tournament.getId(), 1, List.of(new TournamentService.ResultCommand(pairing.getId(), "WHITE_WIN")));
    assertEquals(0, service.details(owner, tournament.getId()).standings().stream().mapToDouble(TournamentService.StandingView::points).sum());
    service.finalizeRound(owner, tournament.getId(), 1);
    assertEquals(1, service.details(owner, tournament.getId()).standings().stream().mapToDouble(TournamentService.StandingView::points).sum());
    service.nextRound(owner, tournament.getId());
    assertThrows(ResponseStatusException.class, () -> service.saveResults(owner, tournament.getId(), 2, List.of(new TournamentService.ResultCommand(pairing.getId(), "DRAW"))));
    assertThrows(ResponseStatusException.class, () -> service.saveResults(owner, tournament.getId(), 1, List.of(new TournamentService.ResultCommand(pairing.getId(), "DRAW"))));
  }

  @Test void scopesAllMutationsAndReadsToTheOwner() {
    create(List.of("An", "Bình"));
    UUID outsider = UUID.randomUUID();
    assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.details(outsider, tournament.getId())).getStatusCode().value());
    assertThrows(ResponseStatusException.class, () -> service.nextRound(outsider, tournament.getId()));
    assertThrows(ResponseStatusException.class, () -> service.complete(outsider, tournament.getId()));
    assertThrows(ResponseStatusException.class, () -> service.delete(outsider, tournament.getId()));
    verify(tournaments, never()).deleteById(any());
  }

  @Test void classTournamentAllowsGuestsAndRejectsStudentsFromOtherClasses() {
    UUID classId = UUID.randomUUID(), sessionId = UUID.randomUUID(), studentId = UUID.randomUUID();
    Student student = mock(Student.class); when(student.getId()).thenReturn(studentId); when(student.getFullName()).thenReturn("Học sinh An");
    ChessClass classroom = mock(ChessClass.class); var member = new vn.chesshub.entity.ClassMembership(classroom, student.getFullName(), student); when(classroom.getActiveMemberships()).thenReturn(Set.of(member)); when(classroom.getName()).thenReturn("Lớp cờ");
    ClassSession session = mock(ClassSession.class); when(session.getChessClass()).thenReturn(classroom);
    when(sessions.findByIdAndChessClassIdAndChessClassTeacherId(sessionId, classId, owner)).thenReturn(Optional.of(session));
    when(classes.findForUpdate(classId, owner)).thenReturn(Optional.of(classroom));
    assertThrows(ResponseStatusException.class, () -> service.create(owner, classId, sessionId, null, List.of(UUID.randomUUID()), List.of("Khách"), List.of("WIN_COUNT")));
    service.create(owner, classId, sessionId, null, List.of(member.getId()), List.of("Khách"), List.of("WIN_COUNT"));
    assertEquals(2, roster.size()); assertEquals(1, roster.stream().filter(player -> player.getStudent() != null).count());
    assertEquals(session, tournament.getSession()); assertEquals("Lớp cờ", tournament.getName());
  }

  @Test void createsTournamentDirectlyForClassWithoutAnySession() {
    UUID classId = UUID.randomUUID(), studentId = UUID.randomUUID();
    Student student = mock(Student.class); when(student.getId()).thenReturn(studentId); when(student.getFullName()).thenReturn("Học sinh An");
    ChessClass classroom = mock(ChessClass.class); when(classroom.getId()).thenReturn(classId); var member = new vn.chesshub.entity.ClassMembership(classroom, student.getFullName(), student); when(classroom.getActiveMemberships()).thenReturn(Set.of(member)); when(classroom.getName()).thenReturn("Lớp cờ");
    when(classes.findByIdAndTeacherId(classId, owner)).thenReturn(Optional.of(classroom));
    when(classes.findForUpdate(classId, owner)).thenReturn(Optional.of(classroom));
    service.create(owner, classId, null, "Giải của lớp", List.of(member.getId()), List.of("Khách"), List.of("WIN_COUNT"));
    assertNull(tournament.getSession()); assertSame(classroom, tournament.getChessClass());
    assertEquals("Lớp cờ", service.details(owner, tournament.getId()).className());
    assertNull(service.details(owner, tournament.getId()).sessionDate());
    when(tournaments.findByTeacherIdOrderByCreatedAtDesc(owner)).thenReturn(List.of(tournament));
    assertEquals(classId, service.list(owner).getFirst().classId());
    assertEquals(2, roster.size()); verifyNoInteractions(sessions);
  }

  @Test void directClassCreationRequiresOwnershipAndClassMembership() {
    UUID classId = UUID.randomUUID();
    assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.create(owner, classId, null, "Giải", List.of(), List.of("An", "Bình"), List.of("WIN_COUNT"))).getStatusCode().value());
    ChessClass classroom = mock(ChessClass.class); when(classroom.getStudents()).thenReturn(Set.of());
    when(classes.findByIdAndTeacherId(classId, owner)).thenReturn(Optional.of(classroom));
    when(classes.findForUpdate(classId, owner)).thenReturn(Optional.of(classroom));
    assertThrows(ResponseStatusException.class, () -> service.create(owner, classId, null, "Giải", List.of(UUID.randomUUID()), List.of("Khách"), List.of("WIN_COUNT")));
    verify(tournaments, never()).save(any()); verifyNoInteractions(sessions);
  }
  @Test void opponentTieBreaksUseCurrentFinalizedTotalsAndExactQuarterPoints() {
    prepareManualRounds(List.of("A", "B", "C", "D"), List.of("BUCHHOLZ", "SONNEBORN_BERGER", "WIN_COUNT"));
    manualRound(1, true, "A", "B", "WHITE_WIN", "C", "D", "WHITE_WIN");
    manualRound(2, true, "A", "C", "DRAW", "B", "D", "WHITE_WIN");
    var a = standing("A"); var c = standing("C");
    assertEquals(1.5, a.points()); assertEquals(1.5, c.points());
    assertEquals(2.5, a.buchholz()); assertEquals(1.5, c.buchholz());
    assertEquals(1.75, a.sonnebornBerger()); assertEquals(.75, c.sonnebornBerger());
    assertEquals(1, a.rank()); assertEquals(2, c.rank());
    manualRound(3, false, "A", "D", "BLACK_WIN", "B", "C", "DRAW");
    assertEquals(a, standing("A"));
    assertEquals(c, standing("C"));
    allRounds.getLast().finalizeRound();
    assertEquals(4.5, standing("A").buchholz());
  }

  @Test void byeDoesNotCountAsOpponentWinOrColorAndRematchesCountSeparately() {
    prepareManualRounds(List.of("A", "B", "C"), List.of("BUCHHOLZ", "SONNEBORN_BERGER"));
    manualRound(1, true, "A", "B", "DRAW", "C", null, "BYE");
    manualRound(2, true, "A", "C", "WHITE_WIN", "B", null, "BYE");
    manualRound(3, true, "A", "B", "BLACK_WIN", "C", null, "BYE");
    assertEquals(7, standing("A").buchholz());
    assertEquals(3.25, standing("A").sonnebornBerger());
    assertEquals(3, standing("B").buchholz());
    assertEquals(2.25, standing("B").sonnebornBerger());
    var c = standing("C");
    assertEquals(2, c.points()); assertEquals(0, c.wins()); assertEquals(0, c.whiteGameCount());
    assertEquals(1.5, c.buchholz()); assertEquals(0, c.sonnebornBerger());
  }

  @Test void equalSelectedCriteriaShareRankInsteadOfUsingRandomSeed() {
    prepareManualRounds(List.of("A", "B", "C"), List.of("BUCHHOLZ", "SONNEBORN_BERGER", "WIN_COUNT"));
    manualRound(1, true, "A", "B", "WHITE_WIN");
    manualRound(2, true, "B", "C", "WHITE_WIN");
    manualRound(3, true, "C", "A", "WHITE_WIN");
    assertEquals(List.of(1, 1, 1), service.details(owner, tournament.getId()).standings().stream().map(TournamentService.StandingView::rank).toList());
  }

  @Test void rematchNotesRemainVisibleWhenReadingPreviousRounds() {
    create(List.of("A", "B"));
    settle(1);
    var details = service.nextRound(owner, tournament.getId());
    assertNull(details.rounds().getFirst().pairingNote());
    assertTrue(details.rounds().getLast().pairingNote().contains("1 bàn tái đấu"));
    assertFalse(details.rounds().getLast().pairingSearchLimited());
    assertEquals(details.rounds().getLast().pairingNote(), service.details(owner, tournament.getId()).rounds().getLast().pairingNote());
  }

  @Test void validatesNewTieBreaksAndKeepsThreeCriterionLimit() {
    assertThrows(ResponseStatusException.class, () -> service.createStandalone(owner, "Swiss", List.of("A", "B"), List.of("BUCHHOLZ", "SONNEBORN_BERGER", "WIN_COUNT", "WHITE_GAME_COUNT")));
    assertThrows(ResponseStatusException.class, () -> service.createStandalone(owner, "Swiss", List.of("A", "B"), List.of("BUCHHOLZ", "BUCHHOLZ")));
    assertThrows(ResponseStatusException.class, () -> service.createStandalone(owner, "Swiss", List.of("A", "B"), List.of("UNKNOWN")));
  }

  private void prepareManualRounds(List<String> names, List<String> methods) {
    service.createStandalone(owner, "Swiss", names, methods);
    history.clear(); allRounds.clear();
  }

  private TournamentService.StandingView standing(String name) {
    return service.details(owner, tournament.getId()).standings().stream().filter(item -> name.equals(item.fullName())).findFirst().orElseThrow();
  }

  private void manualRound(int number, boolean completed, String... games) {
    TournamentRound round = new TournamentRound(tournament, number); identify(round); allRounds.add(round);
    for (int i = 0; i < games.length; i += 3) {
      final String whiteName = games[i], blackName = games[i + 1];
      var white = roster.stream().filter(player -> whiteName.equals(player.getFullName())).findFirst().orElseThrow();
      var black = blackName == null ? null : roster.stream().filter(player -> blackName.equals(player.getFullName())).findFirst().orElseThrow();
      var pairing = new TournamentPairing(round, i / 3 + 1, white, black); identify(pairing);
      pairing.recordResult(games[i + 2]); history.add(pairing);
    }
    if (completed) round.finalizeRound();
    tournament.recordRound(number);
  }

  private void create(List<String> names) { service.createStandalone(owner, " Giải cuối tuần ", names, List.of("WIN_COUNT", "WHITE_GAME_COUNT")); }
  private void settle(int number) {
    var updates = currentPairings(number).stream().filter(item -> item.getBlackParticipant() != null).map(item -> new TournamentService.ResultCommand(item.getId(), "DRAW")).toList();
    service.saveResults(owner, tournament.getId(), number, updates); service.finalizeRound(owner, tournament.getId(), number);
  }
  private List<TournamentPairing> currentPairings(int number) { return history.stream().filter(item -> item.getRound().getRoundNumber() == number).toList(); }
  private Optional<Tournament> owned(UUID id, UUID teacherId) { return tournament != null && tournament.getId().equals(id) && owner.equals(teacherId) ? Optional.of(tournament) : Optional.empty(); }
  private void identify(Object item) { ReflectionTestUtils.setField(item, "id", UUID.randomUUID()); }
}
