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
@Table(name = "session_attendance")
public class SessionAttendance {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "session_id", nullable = false)
  private ClassSession session;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "student_id", nullable = false)
  private Student student;

  @Column(nullable = false)
  private String status;

  @Column(name = "noted_at", nullable = false)
  private Instant notedAt = Instant.now();

  protected SessionAttendance() { }

  public SessionAttendance(ClassSession session, Student student, String status) {
    this.session = session;
    this.student = student;
    this.status = status;
  }

  public UUID getId() { return id; }
  public ClassSession getSession() { return session; }
  public Student getStudent() { return student; }
  public String getStatus() { return status; }
  public void updateStatus(String value) { this.status = value; this.notedAt = Instant.now(); }
}
