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
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tournament_rounds", uniqueConstraints = @UniqueConstraint(columnNames = {"tournament_id", "round_number"}))
public class TournamentRound {
  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "tournament_id", nullable = false) private Tournament tournament;
  @Column(name = "round_number", nullable = false) private int roundNumber;
  @Column(nullable = false) private String status = "RESULTS_OPEN";
  @Column(name = "finalized_at") private Instant finalizedAt;
  @Column(name = "pairing_note", length = 1000) private String pairingNote;
  @Column(name = "pairing_search_limited", nullable = false) private boolean pairingSearchLimited;
  protected TournamentRound() { }
  public TournamentRound(Tournament tournament, int roundNumber) { this.tournament = tournament; this.roundNumber = roundNumber; }
  public UUID getId() { return id; }
  public int getRoundNumber() { return roundNumber; }
  public String getStatus() { return status; }
  public String getPairingNote() { return pairingNote; }
  public boolean isPairingSearchLimited() { return pairingSearchLimited; }
  public void recordPairingNote(String note, boolean limited) { pairingNote = note; pairingSearchLimited = limited; }
  public void finalizeRound() { status = "COMPLETED"; finalizedAt = Instant.now(); }
}
