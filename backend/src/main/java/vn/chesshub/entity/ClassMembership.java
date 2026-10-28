package vn.chesshub.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

/** A place in a class exists independently of a reusable student profile. */
@Entity
@Table(name = "chess_class_students")
public class ClassMembership {
  @Id private UUID id = UUID.randomUUID();
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "chess_class_id", nullable = false) private ChessClass chessClass;
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "student_id") private Student student;
  @Column(name = "full_name", nullable = false) private String fullName;
  @Column(nullable = false) private boolean active = true;
  protected ClassMembership() { }
  public ClassMembership(ChessClass chessClass, String fullName, Student student) {
    this.chessClass = chessClass; this.fullName = fullName; this.student = student;
  }
  public UUID getId() { return id; }
  public ChessClass getChessClass() { return chessClass; }
  public Student getStudent() { return student; }
  public UUID getStudentId() { return student == null ? null : student.getId(); }
  public String getFullName() { return student == null ? fullName : student.getFullName(); }
  public LocalDate getBirthDate() { return student == null ? null : student.getBirthDate(); }
  public String getParentName() { return student == null ? null : student.getParentName(); }
  public String getParentPhoneNumber() { return student == null ? null : student.getParentPhoneNumber(); }
  public String getPhoneNumber() { return student == null ? null : student.getPhoneNumber(); }
  public String getNotes() { return student == null ? null : student.getNotes(); }
  public boolean isActive() { return active; }
  public void setActive(boolean value) { active = value; }
  public void link(Student value) { student = value; fullName = value.getFullName(); }
}
