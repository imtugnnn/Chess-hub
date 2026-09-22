package vn.chesshub.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "student")
public class Student {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "full_name", nullable = false)
  private String fullName;

  @Column(name = "phone_number", nullable = false, unique = true)
  private String phoneNumber;

  @Column(name = "parent_phone_number", nullable = false)
  private String parentPhoneNumber;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt = Instant.now();

  protected Student() { }

  public Student(String fullName, String phoneNumber, String parentPhoneNumber) {
    this.fullName = fullName;
    this.phoneNumber = phoneNumber;
    this.parentPhoneNumber = parentPhoneNumber;
  }

  public UUID getId() { return id; }
  public String getFullName() { return fullName; }
  public String getPhoneNumber() { return phoneNumber; }
  public String getParentPhoneNumber() { return parentPhoneNumber; }
}
