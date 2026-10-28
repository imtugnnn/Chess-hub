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

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "session_id")
  private ClassSession session;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "class_id")
  private ChessClass chessClass;

  @Column(name = "teacher_id", nullable = false)
  private UUID teacherId;

  @Column(nullable = false, length = 255)
  private String name;

  @Column(name = "round_count", nullable = false)
  private int roundCount;

  @Column(nullable = false)
  private String status = "ACTIVE";

  @Column(name = "created_at", nullable = false)
  private Instant createdAt = Instant.now();

  protected Tournament() { }

  public Tournament(ClassSession session, int roundCount) {
    this.session = session;
    this.chessClass = session.getChessClass();
    this.roundCount = roundCount;
    this.teacherId = session.getChessClass().getTeacher().getId();
    this.name = session.getChessClass().getName();
  }

  public Tournament(UUID teacherId, ClassSession session, String name) {
    this(teacherId, session == null ? null : session.getChessClass(), session, name);
  }

  public Tournament(UUID teacherId, ChessClass chessClass, ClassSession session, String name) {
    this.teacherId = teacherId;
    this.chessClass = chessClass;
    this.session = session;
    this.name = name;
  }

  public UUID getId() { return id; }
  public ClassSession getSession() { return session; }
  public ChessClass getChessClass() { return chessClass; }
  public UUID getTeacherId() { return teacherId; }
  public String getName() { return name; }
  public int getRoundCount() { return roundCount; }
  public String getStatus() { return status; }
  public void complete() { this.status = "COMPLETED"; }
  public void recordRound(int number) { this.roundCount = number; this.status = "ACTIVE"; }
}
