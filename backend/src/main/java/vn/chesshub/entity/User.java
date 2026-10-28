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

  @Column(name = "password_hash")
  private String passwordHash;

  @Column(name = "must_change_password", nullable = false)
  private boolean mustChangePassword;

  public boolean isMustChangePassword() { return mustChangePassword; }
  public void requirePasswordChange() { mustChangePassword = true; }
  public void completePasswordChange(String hash) { passwordHash = hash; mustChangePassword = false; }

  @Column(name = "google_subject", unique = true)
  private String googleSubject;

  @Column(name = "google_meet_url", length = 512)
  private String googleMeetUrl;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt = Instant.now();

  protected User() { }

  public User(String fullName, String email, String passwordHash) {
    this.fullName = fullName;
    this.email = email;
    this.passwordHash = passwordHash;
    this.role = "TEACHER";
  }

  public static User fromGoogle(String fullName, String email, String googleSubject) {
    User account = new User(fullName, email, null);
    account.googleSubject = googleSubject;
    return account;
  }

  public void linkGoogle(String googleSubject) { this.googleSubject = googleSubject; }
  public void changeEmail(String email) { this.email = email; }
  public void setGoogleMeetUrl(String url) { this.googleMeetUrl = url; }
  public String getGoogleMeetUrl() { return googleMeetUrl; }

  public UUID getId() { return id; }
  public UUID getCenterId() { return centerId; }
  public String getEmail() { return email; }
  public String getFullName() { return fullName; }
  public String getRole() { return role; }
  public String getPasswordHash() { return passwordHash; }
  public String getGoogleSubject() { return googleSubject; }
}
