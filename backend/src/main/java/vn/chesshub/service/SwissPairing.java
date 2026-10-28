package vn.chesshub.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Optimizes the total cost of a round, retaining the best complete round if the search is bounded. */
final class SwissPairing {
  record Player(UUID id, int halfPoints, int whiteGames, int blackGames, Boolean lastWhite, int streak) { }
  record Pair(UUID white, UUID black) { }
  record Result(List<Pair> pairs, Cost cost, boolean searchLimited) { }

  // Lexicographic priorities: no amount of score/color improvement buys an extra rematch.
  record Cost(int repeats, int meetings, int colorViolations, int scoreGap, int balance, int sameColor)
      implements Comparable<Cost> {
    static final Cost ZERO = new Cost(0, 0, 0, 0, 0, 0);
    Cost add(Cost other) {
      return new Cost(repeats + other.repeats, meetings + other.meetings,
        colorViolations + other.colorViolations, scoreGap + other.scoreGap,
        balance + other.balance, sameColor + other.sameColor);
    }
    @Override public int compareTo(Cost other) {
      int comparison = Integer.compare(repeats, other.repeats);
      if (comparison != 0) return comparison;
      comparison = Integer.compare(meetings, other.meetings);
      if (comparison != 0) return comparison;
      comparison = Integer.compare(colorViolations, other.colorViolations);
      if (comparison != 0) return comparison;
      comparison = Integer.compare(scoreGap, other.scoreGap);
      if (comparison != 0) return comparison;
      comparison = Integer.compare(balance, other.balance);
      return comparison != 0 ? comparison : Integer.compare(sameColor, other.sameColor);
    }
  }

  private record Edge(Pair pair, Cost cost) { }
  private final Edge[][] edges;
  private final boolean[] used;
  private List<Pair> best;
  private Cost bestCost;
  private int budget;
  private boolean limited;

  static Result pair(List<Player> players, Map<String, Integer> meetings) {
    return pair(players, meetings, 100_000);
  }

  static Result pair(List<Player> players, Map<String, Integer> meetings, int budget) {
    if (players.size() % 2 != 0) throw new IllegalArgumentException("Remove the bye player before pairing");
    if (budget < 0) throw new IllegalArgumentException("Search budget must be nonnegative");
    SwissPairing search = new SwissPairing(players, meetings, budget);
    search.search(new ArrayList<>(), Cost.ZERO);
    return new Result(List.copyOf(search.best), search.bestCost, search.limited);
  }

  static String key(UUID left, UUID right) {
    return left.compareTo(right) < 0 ? left + ":" + right : right + ":" + left;
  }

  private SwissPairing(List<Player> players, Map<String, Integer> meetings, int budget) {
    this.budget = budget;
    used = new boolean[players.size()];
    edges = new Edge[players.size()][players.size()];
    for (int i = 0; i < players.size(); i++) {
      for (int j = i + 1; j < players.size(); j++) {
        Player a = players.get(i), b = players.get(j);
        int previous = meetings.getOrDefault(key(a.id, b.id), 0);
        Edge ab = oriented(a, b, previous), ba = oriented(b, a, previous);
        edges[i][j] = edges[j][i] = ab.cost.compareTo(ba.cost) <= 0 ? ab : ba;
      }
    }
    // Always start with a complete incumbent; budget exhaustion never invokes a blind fallback.
    best = new ArrayList<>();
    bestCost = Cost.ZERO;
    for (int i = 0; i < used.length; i++) {
      if (used[i]) continue;
      int partner = -1;
      for (int j = i + 1; j < used.length; j++) {
        if (!used[j] && (partner < 0 || edges[i][j].cost.compareTo(edges[i][partner].cost) < 0)) partner = j;
      }
      used[i] = used[partner] = true;
      best.add(edges[i][partner].pair);
      bestCost = bestCost.add(edges[i][partner].cost);
    }
    java.util.Arrays.fill(used, false);
  }

  private static Edge oriented(Player white, Player black, int meetings) {
    int violations = violation(white, true) + violation(black, false);
    int balance = Math.abs(white.whiteGames - white.blackGames + 1)
      + Math.abs(black.whiteGames - black.blackGames - 1);
    int sameColor = sameColor(white, true) + sameColor(black, false);
    return new Edge(new Pair(white.id, black.id), new Cost(meetings > 0 ? 1 : 0, meetings,
      violations, Math.abs(white.halfPoints - black.halfPoints), balance, sameColor));
  }

  private static int sameColor(Player player, boolean white) {
    return player.lastWhite != null && player.lastWhite == white ? 1 : 0;
  }

  private static int violation(Player player, boolean white) {
    return sameColor(player, white) == 1 && player.streak >= 2 ? 1 : 0;
  }

  private void search(List<Pair> current, Cost cost) {
    if (cost.compareTo(bestCost) >= 0) return;
    int first = -1;
    for (int i = 0; i < used.length; i++) if (!used[i]) { first = i; break; }
    if (first < 0) {
      best = new ArrayList<>(current);
      bestCost = cost;
      return;
    }
    if (cost.add(lowerBound()).compareTo(bestCost) >= 0) return;
    if (budget-- <= 0) { limited = true; return; }
    final int player = first;
    List<Integer> candidates = new ArrayList<>();
    for (int j = first + 1; j < used.length; j++) if (!used[j]) candidates.add(j);
    candidates.sort(Comparator.comparing(j -> edges[player][j].cost));
    used[first] = true;
    for (int candidate : candidates) {
      Edge edge = edges[first][candidate];
      used[candidate] = true;
      current.add(edge.pair);
      search(current, cost.add(edge.cost));
      current.removeLast();
      used[candidate] = false;
      if (limited) break;
    }
    used[first] = false;
  }

  // Each unmatched vertex must use one incident edge. Sum its cheapest component / 2
  // independently to obtain a componentwise lower bound (edges are counted twice).
  private Cost lowerBound() {
    int[] sum = new int[6];
    for (int i = 0; i < used.length; i++) {
      if (used[i]) continue;
      int[] min = {Integer.MAX_VALUE, Integer.MAX_VALUE, Integer.MAX_VALUE,
        Integer.MAX_VALUE, Integer.MAX_VALUE, Integer.MAX_VALUE};
      for (int j = 0; j < used.length; j++) {
        if (i == j || used[j]) continue;
        Cost c = edges[i][j].cost;
        min[0] = Math.min(min[0], c.repeats);
        min[1] = Math.min(min[1], c.meetings);
        min[2] = Math.min(min[2], c.colorViolations);
        min[3] = Math.min(min[3], c.scoreGap);
        min[4] = Math.min(min[4], c.balance);
        min[5] = Math.min(min[5], c.sameColor);
      }
      for (int k = 0; k < sum.length; k++) sum[k] += min[k];
    }
    return new Cost(sum[0] / 2, sum[1] / 2, sum[2] / 2, sum[3] / 2, sum[4] / 2, sum[5] / 2);
  }
}
