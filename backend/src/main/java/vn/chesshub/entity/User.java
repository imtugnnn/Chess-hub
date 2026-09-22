package vn.chesshub.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "center_id")
  private UUID centerId;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(name = "full_name", nullable = false)
  private String fullName;

  @Column(nullable = false)
  private String role;

  @Column(name = "password_hash", nullable = false)
  private String passwordHash;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt = Instant.now();

  protected User() { }

  public User(String fullName, String email, String passwordHash) {
    this.fullName = fullName;
    this.email = email;
    this.passwordHash = passwordHash;
    this.role = "TEACHER";
  }

  public UUID getId() { return id; }
  public UUID getCenterId() { return centerId; }
  public String getEmail() { return email; }
  public String getFullName() { return fullName; }
  public String getRole() { return role; }
  public String getPasswordHash() { return passwordHash; }
}
