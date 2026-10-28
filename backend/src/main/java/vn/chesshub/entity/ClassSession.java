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
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "class_sessions")
public class ClassSession {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "class_id", nullable = false)
  private ChessClass chessClass;

  @Column(name = "session_date", nullable = false)
  private LocalDate sessionDate;

  @Column(name = "start_time", nullable = false)
  private LocalTime startTime;

  @Column(name = "end_time", nullable = false)
  private LocalTime endTime;

  @Column(name = "schedule_override", nullable = false)
  private boolean scheduleOverride;

  protected ClassSession() { }

  public ClassSession(ChessClass chessClass, LocalDate sessionDate, LocalTime startTime, LocalTime endTime) {
    this.chessClass = chessClass;
    this.sessionDate = sessionDate;
    this.startTime = startTime;
    this.endTime = endTime;
  }

  public UUID getId() { return id; }
  public ChessClass getChessClass() { return chessClass; }
  public LocalDate getSessionDate() { return sessionDate; }
  public LocalTime getStartTime() { return startTime; }
  public LocalTime getEndTime() { return endTime; }
  public void updateTimes(LocalTime startTime, LocalTime endTime) { this.startTime = startTime; this.endTime = endTime; }
  public boolean isScheduleOverride() { return scheduleOverride; }
  public void reschedule(LocalDate date, LocalTime start, LocalTime end) {
    this.sessionDate = date;
    this.startTime = start;
    this.endTime = end;
    this.scheduleOverride = true;
  }
}
