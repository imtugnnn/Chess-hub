package vn.chesshub.service;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import vn.chesshub.entity.User;
import vn.chesshub.repository.UserRepository;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

class AccountSettingsTest {
  private final UserRepository users = mock(UserRepository.class);
  private final AuthService auth = new AuthService(users);
  private final UUID id = UUID.randomUUID();
  private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

  private User account() {
    User account = new User("Teacher", "old@example.com", encoder.encode("Current123"));
    when(users.findForPasswordChange(id)).thenReturn(Optional.of(account));
    when(users.saveAndFlush(any(User.class))).thenAnswer(call -> call.getArgument(0));
    return account;
  }

  @Test void emailUpdatesWithoutPasswordAndRejectsDuplicatesAndInvalidEmail() {
    User account = account();
    assertThrows(AuthException.class, () -> auth.updateEmail(id, "invalid-email"));
    when(users.existsByEmail("taken@example.com")).thenReturn(true);
    assertThrows(AuthException.class, () -> auth.updateEmail(id, "taken@example.com"));
    assertEquals("old@example.com", account.getEmail());
    auth.updateEmail(id, " NEW@EXAMPLE.COM ");
    assertEquals("new@example.com", account.getEmail());
  }

  @Test void passwordRequiresCurrentPasswordAndReplacesHash() {
    User account = account();
    assertThrows(AuthException.class, () -> auth.updatePassword(id, "wrong", "NewPassword456"));
    assertThrows(AuthException.class, () -> auth.updatePassword(id, "Current123", "Current123"));
    assertThrows(AuthException.class, () -> auth.updatePassword(id, "Current123", "short"));
    assertThrows(AuthException.class, () -> auth.updatePassword(id, "Current123", "ữ".repeat(25)));
    auth.updatePassword(id, "Current123", "NewPassword456");
    assertTrue(encoder.matches("NewPassword456", account.getPasswordHash()));
    assertFalse(encoder.matches("Current123", account.getPasswordHash()));
  }

  @Test void googleAccountCanChangeEmailWithoutPasswordAndKeepGoogleIdentity() {
    User account = User.fromGoogle("Teacher", "old@example.com", "google-sub");
    when(users.findForPasswordChange(id)).thenReturn(Optional.of(account));
    when(users.saveAndFlush(account)).thenReturn(account);
    auth.updateEmail(id, "new@example.com");
    assertNull(account.getPasswordHash());
    when(users.findByGoogleSubject("google-sub")).thenReturn(Optional.of(account));
    assertSame(account, auth.loginWithGoogle("google-sub", "old@example.com", "Teacher", true));
    auth.updatePassword(id, null, "NewPassword456");
    assertTrue(encoder.matches("NewPassword456", account.getPasswordHash()));
  }

  @Test void meetLinkMustUseExactHttpsGoogleHostAndCanBeRemoved() {
    User account = account();
    for (String url : new String[] { "javascript:alert(1)", "https://meet.google.com.evil.test/abc-defg-hij",
        "http://meet.google.com/abc-defg-hij", "https://meet.google.com/abc-defg-hij?redirect=evil", "https://example.com" })
      assertThrows(AuthException.class, () -> auth.updateGoogleMeet(id, url));
    auth.updateGoogleMeet(id, " https://meet.google.com/abc-defg-hij ");
    assertEquals("https://meet.google.com/abc-defg-hij", account.getGoogleMeetUrl());
    auth.updateGoogleMeet(id, " ");
    assertNull(account.getGoogleMeetUrl());
  }
}
