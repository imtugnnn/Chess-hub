package vn.chesshub.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "student")
public class Student {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "full_name", nullable = false)
  private String fullName;

  @Column(name = "phone_number")
  private String phoneNumber;

  @Column(name = "notes", length = 4000)
  private String notes;

  @Column(name = "parent_phone_number", nullable = false)
  private String parentPhoneNumber;

  @Column(name = "parent_name")
  private String parentName;

  @Column(name = "birth_date")
  private LocalDate birthDate;

  @Column(name = "center_id")
  private UUID centerId;

  @Column(name = "owner_user_id")
  private UUID ownerUserId;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt = Instant.now();

  protected Student() { }

  public Student(String fullName, LocalDate birthDate, String parentName, String parentPhoneNumber, UUID centerId, UUID ownerUserId) {
    this(fullName, birthDate, parentName, parentPhoneNumber, centerId, ownerUserId, null, null);
  }

  public Student(String fullName, LocalDate birthDate, String parentName, String parentPhoneNumber, UUID centerId, UUID ownerUserId, String phoneNumber, String notes) {
    this.fullName = fullName;
    this.birthDate = birthDate;
    this.parentName = parentName;
    this.parentPhoneNumber = parentPhoneNumber;
    this.centerId = centerId;
    this.ownerUserId = ownerUserId;
    this.phoneNumber = phoneNumber;
    this.notes = notes;
  }

  public UUID getId() { return id; }
  public String getFullName() { return fullName; }
  public String getPhoneNumber() { return phoneNumber; }
  public String getNotes() { return notes; }
  public String getParentPhoneNumber() { return parentPhoneNumber; }
  public String getParentName() { return parentName; }
  public LocalDate getBirthDate() { return birthDate; }
  public UUID getCenterId() { return centerId; }
  public UUID getOwnerUserId() { return ownerUserId; }
}
