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
    if (!passwordEncoder.matches(password, account.getPasswordHash())) {
      throw invalidCredentials();
    }
    return account;
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
