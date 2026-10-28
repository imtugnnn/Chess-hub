package vn.chesshub.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import vn.chesshub.entity.User;
import vn.chesshub.repository.UserRepository;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PasswordResetServiceTest {
  JdbcTemplate jdbc;
  UserRepository users = mock(UserRepository.class);
  InvitationMailService mail = mock(InvitationMailService.class);
  RememberLoginService remember = mock(RememberLoginService.class);
  PasswordResetService service;
  UUID id = UUID.randomUUID();
  User account;

  @BeforeEach void setup() throws Exception {
    jdbc = new JdbcTemplate(new DriverManagerDataSource("jdbc:h2:mem:" + id + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", ""));
    jdbc.execute("create table users (id uuid primary key)");
    jdbc.update("insert into users values (?)", id);
    jdbc.execute(Files.readString(Path.of("src/main/resources/db/migration/V19__create_password_reset_tokens.sql")));
    account = new User("Teacher", "teacher@example.com", new BCryptPasswordEncoder().encode("OldPassword123"));
    // The entity id is assigned by JPA in production.
    var field = User.class.getDeclaredField("id"); field.setAccessible(true); field.set(account, id);
    when(users.findByEmail("teacher@example.com")).thenReturn(Optional.of(account));
    when(users.findForPasswordChange(id)).thenReturn(Optional.of(account));
    service = new PasswordResetService(jdbc, users, mail, remember);
  }

  String issue() {
    service.request(" Teacher@Example.com ");
    var token = ArgumentCaptor.forClass(String.class);
    verify(mail).sendPasswordReset(eq("teacher@example.com"), token.capture());
    return token.getValue();
  }

  @Test void storesOnlyHashAndResetsOnceRevokingRememberedLogin() {
    String token = issue();
    assertEquals(43, token.length());
    String stored = jdbc.queryForObject("select token_hash from password_reset_tokens", String.class);
    assertEquals(64, stored.length()); assertNotEquals(token, stored);
    service.reset(token, "NewPassword456");
    assertTrue(new BCryptPasswordEncoder().matches("NewPassword456", account.getPasswordHash()));
    assertFalse(account.isMustChangePassword());
    verify(remember).revokeAll(id);
    assertThrows(AuthException.class, () -> service.reset(token, "OtherPassword789"));
  }
  @Test void expiredAndMalformedLinksCannotChangePassword() {
    String token = issue(); String old = account.getPasswordHash();
    jdbc.update("update password_reset_tokens set expires_at = ?", Timestamp.from(Instant.now().minusSeconds(1)));
    assertThrows(AuthException.class, () -> service.reset(token, "NewPassword456"));
    assertThrows(AuthException.class, () -> service.reset("invalid", "NewPassword456"));
    assertEquals(old, account.getPasswordHash()); verifyNoInteractions(remember);
  }
  @Test void invalidPasswordDoesNotConsumeLink() {
    String token = issue();
    assertThrows(AuthException.class, () -> service.reset(token, "short"));
    assertThrows(AuthException.class, () -> service.reset(token, "ậ".repeat(25)));
    service.reset(token, "NewPassword456");
  }
  @Test void changingEmailOrPasswordInvalidatesOutstandingLink() {
    String token = issue();
    account.changeEmail("new@example.com");
    assertThrows(AuthException.class, () -> service.reset(token, "NewPassword456"));
    account.changeEmail("teacher@example.com");
    account.completePasswordChange(new BCryptPasswordEncoder().encode("ChangedPassword456"));
    assertThrows(AuthException.class, () -> service.reset(token, "NewPassword456"));
    verifyNoInteractions(remember);
  }
  @Test void changedEmailBetweenLookupAndLockDoesNotSendToOldAddress() {
    account.changeEmail("new@example.com");
    service.request("teacher@example.com");
    verify(mail, never()).sendPasswordReset(anyString(), anyString());
    assertEquals(0, jdbc.queryForObject("select count(*) from password_reset_tokens", Integer.class));
  }
  @Test void unknownEmailIsSilentAndRepeatedRequestsAreThrottled() {
    when(users.findByEmail("unknown@example.com")).thenReturn(Optional.empty());
    service.request("unknown@example.com");
    verify(mail, never()).sendPasswordReset(anyString(), anyString());
    issue(); service.request("teacher@example.com");
    verify(mail, times(1)).sendPasswordReset(anyString(), anyString());
  }
}
