package vn.chesshub.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.JoinTable;
import jakarta.persistence.Table;
import java.util.UUID;
import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "chess_classes")
public class ChessClass {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "teacher_id", nullable = false)
  private User teacher;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private String schedule;

  @Column(name = "student_count", nullable = false)
  private int studentCount;

  @Column(nullable = false)
  private String tone;

  @Column(name = "fee_per_session", nullable = false, precision = 12, scale = 0)
  private BigDecimal feePerSession = BigDecimal.ZERO;

  @ManyToMany
  @JoinTable(name = "chess_class_students", joinColumns = @JoinColumn(name = "chess_class_id"), inverseJoinColumns = @JoinColumn(name = "student_id"))
  private Set<Student> students = new LinkedHashSet<>();

  protected ChessClass() { }

  public ChessClass(User teacher, String name, String schedule, int studentCount, String tone) {
    this.teacher = teacher;
    this.name = name;
    this.schedule = schedule;
    this.studentCount = studentCount;
    this.tone = tone;
  }

  public ChessClass(User teacher, String name, String schedule, int studentCount, String tone, BigDecimal feePerSession) {
    this(teacher, name, schedule, studentCount, tone);
    this.feePerSession = feePerSession;
  }

  public ChessClass(User teacher, String name, String schedule, int studentCount, String tone, Student student) {
    this(teacher, name, schedule, studentCount, tone);
    this.students.add(student);
  }

  public void updateName(String value) { this.name = value; }
  public void updateSchedule(String value) { this.schedule = value; }
  public void updateFeePerSession(BigDecimal value) { this.feePerSession = value; }
  public void addStudent(Student student) {
    if (students.add(student)) this.studentCount = students.size();
  }

  public UUID getId() { return id; }
  public String getName() { return name; }
  public String getSchedule() { return schedule; }
  public int getStudentCount() { return studentCount; }
  public String getTone() { return tone; }
  public BigDecimal getFeePerSession() { return feePerSession; }
  public Set<Student> getStudents() { return students; }
}
