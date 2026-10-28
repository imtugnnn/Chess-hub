package vn.chesshub.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.UUID;

@Entity
@Table(name = "tournament_tie_breaks", uniqueConstraints = @UniqueConstraint(columnNames = {"tournament_id", "tie_break_type"}))
public class TournamentTieBreak {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "tournament_id", nullable = false)
  private Tournament tournament;

  @Column(name = "tie_break_type", nullable = false)
  private String type;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  protected TournamentTieBreak() { }

  public TournamentTieBreak(Tournament tournament, String type, int sortOrder) {
    this.tournament = tournament;
    this.type = type;
    this.sortOrder = sortOrder;
  }

  public String getType() { return type; }
  public int getSortOrder() { return sortOrder; }
}
