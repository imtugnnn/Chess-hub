package vn.chesshub.service;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import vn.chesshub.entity.User;
import vn.chesshub.repository.UserRepository;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class InitialPasswordTest {
  @Test
  void temporaryPasswordMustBeReplacedAndCannotBeReused() {
    UserRepository users = mock(UserRepository.class);
    var encoder = new BCryptPasswordEncoder();
    User user = new User("Teacher", "teacher@example.com", encoder.encode("Temporary123"));
    user.requirePasswordChange(); UUID id = UUID.randomUUID();
    when(users.findForPasswordChange(id)).thenReturn(Optional.of(user));
    when(users.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
    AuthService auth = new AuthService(users);
    assertThrows(AuthException.class, () -> auth.completeInitialPassword(id, "short"));
    assertThrows(AuthException.class, () -> auth.completeInitialPassword(id, "Temporary123"));
    assertTrue(user.isMustChangePassword());
    auth.completeInitialPassword(id, "NewPassword456");
    assertFalse(user.isMustChangePassword());
    assertTrue(encoder.matches("NewPassword456", user.getPasswordHash()));
    assertFalse(encoder.matches("Temporary123", user.getPasswordHash()));
    assertThrows(AuthException.class, () -> auth.completeInitialPassword(id, "AnotherPassword789"));
  }
}
