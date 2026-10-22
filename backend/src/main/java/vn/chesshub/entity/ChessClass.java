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

  @Column(name = "center_id") private UUID centerId;
  @Column(name = "scope_confirmed", nullable = false) private boolean scopeConfirmed;
  @jakarta.persistence.OneToMany(mappedBy = "chessClass", cascade = jakarta.persistence.CascadeType.ALL)
  private Set<ClassMembership> memberships = new LinkedHashSet<>();

  public UUID getCenterId() { return centerId; }
  public boolean isScopeConfirmed() { return scopeConfirmed; }
  public void confirmScope(UUID value) { centerId = value; scopeConfirmed = true; }
  public Set<ClassMembership> getMemberships() { return memberships; }
  public Set<ClassMembership> getActiveMemberships() {
    return memberships.stream().filter(ClassMembership::isActive).collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
  }
  public ClassMembership addMembership(String name, Student student) {
    if (student != null) {
      var existing = memberships.stream().filter(m -> student.getId() != null && student.getId().equals(m.getStudentId())).findFirst();
      if (existing.isPresent()) { existing.get().setActive(true); recount(); return existing.get(); }
    }
    var member = new ClassMembership(this, name, student); memberships.add(member); recount(); return member;
  }
  public void recount() { studentCount = getActiveMemberships().size(); }

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
    addStudent(student);
  }

  public void updateName(String value) { this.name = value; }
  public void updateSchedule(String value) { this.schedule = value; }
  public void updateFeePerSession(BigDecimal value) { this.feePerSession = value; }
  public void addStudent(Student student) { addMembership(student.getFullName(), student); }
  public void removeStudent(UUID id) {
    memberships.stream().filter(m -> m.getId().equals(id) || id.equals(m.getStudentId())).forEach(m -> m.setActive(false));
    recount();
  }

  public UUID getId() { return id; }
  public User getTeacher() { return teacher; }
  public String getName() { return name; }
  public String getSchedule() { return schedule; }
  public int getStudentCount() { return studentCount; }
  public String getTone() { return tone; }
  public BigDecimal getFeePerSession() { return feePerSession; }
  public Set<Student> getStudents() { return getActiveMemberships().stream().map(ClassMembership::getStudent).filter(java.util.Objects::nonNull).collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new)); }
}
