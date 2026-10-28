package vn.chesshub.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Column;
import java.util.UUID;

@Entity
@Table(name = "tournament_participants", uniqueConstraints = @UniqueConstraint(columnNames = {"tournament_id", "student_id"}))
public class TournamentParticipant {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "tournament_id", nullable = false)
  private Tournament tournament;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "student_id")
  private Student student;

  @Column(name = "full_name", nullable = false, length = 255)
  private String fullName;

  @Column(name = "initial_seed", nullable = false)
  private int initialSeed;

  protected TournamentParticipant() { }

  public TournamentParticipant(Tournament tournament, Student student, int initialSeed) {
    this.tournament = tournament;
    this.student = student;
    this.fullName = student.getFullName();
    this.initialSeed = initialSeed;
  }

  public TournamentParticipant(Tournament tournament, String fullName, int initialSeed) {
    this.tournament = tournament;
    this.fullName = fullName;
    this.initialSeed = initialSeed;
  }

  public UUID getId() { return id; }
  public Student getStudent() { return student; }
  public String getFullName() { return fullName; }
  public int getInitialSeed() { return initialSeed; }
}
