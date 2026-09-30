package vn.chesshub.service;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import vn.chesshub.entity.User;
import vn.chesshub.repository.UserRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GoogleLoginTest {
  private final UserRepository users = mock(UserRepository.class);
  private final AuthService auth = new AuthService(users);

  @Test
  void rejectsUnverifiedEmailBeforeLookingUpAnAccount() {
    assertThrows(AuthException.class,
      () -> auth.loginWithGoogle("google-sub", "owner@example.com", "Owner", false));
    verify(users, never()).findByEmail(any());
  }

  @Test
  void linksAnExistingAccountWithTheSameVerifiedEmail() {
    User existing = new User("Owner", "owner@example.com", "existing-password-hash");
    when(users.findByGoogleSubject("google-sub")).thenReturn(Optional.empty());
    when(users.findByEmail("owner@example.com")).thenReturn(Optional.of(existing));
    when(users.save(existing)).thenReturn(existing);

    User result = auth.loginWithGoogle("google-sub", "OWNER@example.com", "Google Name", true);

    assertSame(existing, result);
    assertEquals("google-sub", result.getGoogleSubject());
    assertEquals("existing-password-hash", result.getPasswordHash());
  }

  @Test
  void createsGoogleOnlyAccountWithoutAUsablePassword() {
    when(users.findByGoogleSubject("google-sub")).thenReturn(Optional.empty());
    when(users.findByEmail("new@example.com")).thenReturn(Optional.empty());
    when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

    User result = auth.loginWithGoogle("google-sub", "new@example.com", "New Teacher", true);

    assertEquals("google-sub", result.getGoogleSubject());
    assertEquals("New Teacher", result.getFullName());
    assertNull(result.getPasswordHash());
    assertThrows(AuthException.class, () -> auth.login("new@example.com", "password123"));
  }

  @Test
  void refusesAnotherGoogleIdentityForLinkedEmail() {
    User existing = User.fromGoogle("Owner", "owner@example.com", "first-sub");
    when(users.findByGoogleSubject("second-sub")).thenReturn(Optional.empty());
    when(users.findByEmail("owner@example.com")).thenReturn(Optional.of(existing));

    assertThrows(AuthException.class,
      () -> auth.loginWithGoogle("second-sub", "owner@example.com", "Owner", true));
    verify(users, never()).save(any());
  }
}
