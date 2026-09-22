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
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tournaments")
public class Tournament {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "session_id", nullable = false)
  private ClassSession session;

  @Column(name = "round_count", nullable = false)
  private int roundCount;

  @Column(nullable = false)
  private String status = "ACTIVE";

  @Column(name = "created_at", nullable = false)
  private Instant createdAt = Instant.now();

  protected Tournament() { }

  public Tournament(ClassSession session, int roundCount) {
    this.session = session;
    this.roundCount = roundCount;
  }

  public UUID getId() { return id; }
  public ClassSession getSession() { return session; }
  public int getRoundCount() { return roundCount; }
  public String getStatus() { return status; }
  public void complete() { this.status = "COMPLETED"; }
}
