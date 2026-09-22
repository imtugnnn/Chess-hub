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
@Table(name = "tournament_pairings", uniqueConstraints = @UniqueConstraint(columnNames = {"round_id", "board_number"}))
public class TournamentPairing {
  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "round_id", nullable = false) private TournamentRound round;
  @Column(name = "board_number", nullable = false) private int boardNumber;
  @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "white_participant_id", nullable = false) private TournamentParticipant whiteParticipant;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "black_participant_id") private TournamentParticipant blackParticipant;
  @Column(nullable = false) private String result;
  @Column(name = "result_recorded_at") private Instant resultRecordedAt;
  protected TournamentPairing() { }
  public TournamentPairing(TournamentRound round, int boardNumber, TournamentParticipant whiteParticipant, TournamentParticipant blackParticipant) {
    this.round = round; this.boardNumber = boardNumber; this.whiteParticipant = whiteParticipant; this.blackParticipant = blackParticipant; this.result = blackParticipant == null ? "BYE" : "PENDING";
  }
  public UUID getId() { return id; }
  public TournamentRound getRound() { return round; }
  public int getBoardNumber() { return boardNumber; }
  public TournamentParticipant getWhiteParticipant() { return whiteParticipant; }
  public TournamentParticipant getBlackParticipant() { return blackParticipant; }
  public String getResult() { return result; }
  public void recordResult(String value) { result = value; resultRecordedAt = Instant.now(); }
}
