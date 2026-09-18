package vn.chesshub.entity;

import jakarta.persistence.*;
import java.util.UUID;

/** Hibernate mapping for the users table created exclusively by Flyway. */
@Entity
@Table(name = "users")
public class User {
  @Id
  private UUID id;

  @Column(name = "center_id", nullable = false)
  private UUID centerId;

  @Column(nullable = false)
  private String email;

  @Column(name = "full_name", nullable = false)
  private String fullName;

  @Column(nullable = false)
  private String role;

  protected User() { }

  public UUID getId() { return id; }
  public UUID getCenterId() { return centerId; }
  public String getEmail() { return email; }
  public String getFullName() { return fullName; }
  public String getRole() { return role; }
}
