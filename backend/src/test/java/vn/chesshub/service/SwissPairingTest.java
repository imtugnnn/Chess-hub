package vn.chesshub.service;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SwissPairingTest {
  private SwissPairing.Player player(int id, int points) {
    return new SwissPairing.Player(new UUID(0, id), points, 0, 0, null, 0);
  }

  @Test void optimizesTheWholeRoundInsteadOfKeepingTheFirstFeasiblePair() {
    // Greedy 1-2 forces the previous 3-4 pairing; swapping to 1-3, 2-4 avoids all rematches.
    var players = List.of(player(1, 0), player(2, 0), player(3, 0), player(4, 0));
    var meetings = Map.of(SwissPairing.key(players.get(2).id(), players.get(3).id()), 1);
    var result = SwissPairing.pair(players, meetings);
    assertEquals(0, result.cost().repeats());
    assertFalse(result.searchLimited());
    assertEquals(2, result.pairs().size());
    assertTrue(result.pairs().stream().noneMatch(pair -> meetings.containsKey(SwissPairing.key(pair.white(), pair.black()))));
  }

  @Test void minimizesScoreDifferenceAcrossAllBoards() {
    var players = List.of(player(1, 6), player(2, 5), player(3, 4), player(4, 3), player(5, 2), player(6, 0));
    // First feasible round: 1-3, 2-5, 4-6 costs 8 half-points.
    // Global optimum: 1-4, 2-3, 5-6 costs 6 half-points.
    var meetings = Map.of(SwissPairing.key(players.get(0).id(), players.get(1).id()), 1,
      SwissPairing.key(players.get(1).id(), players.get(3).id()), 1);
    var result = SwissPairing.pair(players, meetings);
    assertEquals(0, result.cost().repeats());
    assertEquals(6, result.cost().scoreGap());
    assertFalse(result.searchLimited());
  }

  @Test void avoidsThirdConsecutiveColorsWhenAColorLegalRoundExists() {
    var a = new SwissPairing.Player(new UUID(0, 1), 2, 2, 0, true, 2);
    var b = new SwissPairing.Player(new UUID(0, 2), 2, 2, 0, true, 2);
    var c = new SwissPairing.Player(new UUID(0, 3), 2, 0, 2, false, 2);
    var d = new SwissPairing.Player(new UUID(0, 4), 2, 0, 2, false, 2);
    var result = SwissPairing.pair(List.of(a, b, c, d), Map.of());
    assertEquals(0, result.cost().colorViolations());
    assertTrue(result.pairs().stream().allMatch(pair -> pair.white().equals(c.id()) || pair.white().equals(d.id())));
  }

  @Test void balancesColorsUsingBothWhiteAndBlackCounts() {
    var a = new SwissPairing.Player(new UUID(0, 1), 0, 1, 4, false, 1);
    var b = new SwissPairing.Player(new UUID(0, 2), 0, 0, 1, false, 1);
    var result = SwissPairing.pair(List.of(a, b), Map.of());
    // Raw white counts would assign white to B; A has the greater actual imbalance.
    assertEquals(a.id(), result.pairs().getFirst().white());
    assertEquals(4, result.cost().balance());
  }

  @Test void quantifiesUnavoidableColorRelaxationAndRematches() {
    var a = new SwissPairing.Player(new UUID(0, 1), 0, 2, 0, true, 2);
    var b = new SwissPairing.Player(new UUID(0, 2), 0, 2, 0, true, 2);
    var result = SwissPairing.pair(List.of(a, b), Map.of(SwissPairing.key(a.id(), b.id()), 4));
    assertEquals(1, result.cost().repeats());
    assertEquals(4, result.cost().meetings());
    assertEquals(1, result.cost().colorViolations());
    assertFalse(result.searchLimited());
  }

  @Test void budgetExhaustionRetainsACompleteRoundAndDoesNotClaimOptimality() {
    var players = List.of(player(1, 0), player(2, 0), player(3, 0), player(4, 0));
    var meetings = Map.of(SwissPairing.key(players.get(2).id(), players.get(3).id()), 1);
    var result = SwissPairing.pair(players, meetings, 0);
    assertTrue(result.searchLimited());
    assertEquals(1, result.cost().repeats());
    assertAllPlayersExactlyOnce(players, result);
  }

  @Test void boundedLargeRoundIsCompleteDeterministicAndFast() {
    var players = new ArrayList<SwissPairing.Player>();
    var meetings = new HashMap<String, Integer>();
    for (int i = 1; i <= 40; i++) players.add(player(i, (i * 7) % 11));
    for (int i = 0; i < players.size(); i++) for (int j = i + 1; j < players.size(); j++) {
      if ((i + j) % 3 == 0) meetings.put(SwissPairing.key(players.get(i).id(), players.get(j).id()), 1);
    }
    assertTimeout(Duration.ofSeconds(10), () -> {
      var first = SwissPairing.pair(players, meetings, 2000);
      assertAllPlayersExactlyOnce(players, first);
      assertEquals(first, SwissPairing.pair(players, meetings, 2000));
    });
  }

  @Test void rejectsOddRostersAndHandlesEmptyRosters() {
    assertThrows(IllegalArgumentException.class, () -> SwissPairing.pair(List.of(player(1, 0)), Map.of()));
    assertTrue(SwissPairing.pair(List.of(), Map.of()).pairs().isEmpty());
  }

  private void assertAllPlayersExactlyOnce(List<SwissPairing.Player> players, SwissPairing.Result result) {
    var seen = new HashSet<UUID>();
    for (var pair : result.pairs()) {
      assertTrue(seen.add(pair.white()));
      assertTrue(seen.add(pair.black()));
    }
    assertEquals(new HashSet<>(players.stream().map(SwissPairing.Player::id).toList()), seen);
  }
}
