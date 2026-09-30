package vn.chesshub.service;

import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.chesshub.entity.User;
import vn.chesshub.repository.UserRepository;

@Service
public class AuthService {
  private final UserRepository accounts;
  private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

  public AuthService(UserRepository accounts) {
    this.accounts = accounts;
  }

  @Transactional
  public User register(String fullName, String email, String password) {
    String normalizedName = required(fullName, "Họ và tên là bắt buộc.");
    String normalizedEmail = normalizeEmail(email);
    validatePassword(password);
    if (accounts.existsByEmail(normalizedEmail)) {
      throw new AuthException(HttpStatus.CONFLICT, "Email này đã được sử dụng.");
    }
    User account = accounts.save(new User(normalizedName, normalizedEmail, passwordEncoder.encode(password)));
    return account;
  }

  @Transactional(readOnly = true)
  public User login(String email, String password) {
    String normalizedEmail = normalizeEmail(email);
    if (password == null || password.isBlank()) {
      throw invalidCredentials();
    }
    User account = accounts.findByEmail(normalizedEmail).orElseThrow(this::invalidCredentials);
    if (account.getPasswordHash() == null || !passwordEncoder.matches(password, account.getPasswordHash())) {
      throw invalidCredentials();
    }
    return account;
  }

  @Transactional
  public User loginWithGoogle(String subject, String email, String fullName, boolean emailVerified) {
    if (!emailVerified || subject == null || subject.isBlank()) {
      throw new AuthException(HttpStatus.UNAUTHORIZED, "Tài khoản Google chưa xác minh email.");
    }
    String normalizedEmail = normalizeEmail(email);
    User bySubject = accounts.findByGoogleSubject(subject).orElse(null);
    if (bySubject != null) {
      if (!bySubject.getEmail().equals(normalizedEmail)) {
        throw new AuthException(HttpStatus.CONFLICT, "Email tài khoản Google đã thay đổi. Vui lòng liên hệ hỗ trợ.");
      }
      return bySubject;
    }
    User byEmail = accounts.findByEmail(normalizedEmail).orElse(null);
    if (byEmail != null) {
      if (byEmail.getGoogleSubject() != null) {
        throw new AuthException(HttpStatus.CONFLICT, "Email đã liên kết với tài khoản Google khác.");
      }
      byEmail.linkGoogle(subject);
      return accounts.save(byEmail);
    }
    String name = fullName == null || fullName.isBlank() ? normalizedEmail : fullName.trim();
    return accounts.save(User.fromGoogle(name, normalizedEmail, subject));
  }

  private String normalizeEmail(String email) {
    String normalized = required(email, "Email là bắt buộc.").toLowerCase(Locale.ROOT);
    if (!normalized.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
      throw new AuthException(HttpStatus.BAD_REQUEST, "Email không hợp lệ.");
    }
    return normalized;
  }

  private void validatePassword(String password) {
    if (password == null || password.length() < 8) {
      throw new AuthException(HttpStatus.BAD_REQUEST, "Mật khẩu cần có ít nhất 8 ký tự.");
    }
  }

  private String required(String value, String message) {
    if (value == null || value.trim().isEmpty()) {
      throw new AuthException(HttpStatus.BAD_REQUEST, message);
    }
    return value.trim();
  }

  private AuthException invalidCredentials() {
    return new AuthException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng.");
  }
}
