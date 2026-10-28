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
      // The verified Google subject remains the identity after a local email change.
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
    if (normalized.length() > 255) throw new AuthException(HttpStatus.BAD_REQUEST, "Email không được vượt quá 255 ký tự.");
    if (!normalized.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
      throw new AuthException(HttpStatus.BAD_REQUEST, "Email không hợp lệ.");
    }
    return normalized;
  }

  private void validatePassword(String password) {
    if (password != null && password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
      throw new AuthException(HttpStatus.BAD_REQUEST, "Mật khẩu không được vượt quá 72 byte.");
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

  @Transactional
  public User completeInitialPassword(java.util.UUID userId, String password) {
    User account = accounts.findForPasswordChange(userId).orElseThrow(this::invalidCredentials);
    if (!account.isMustChangePassword())
      throw new AuthException(HttpStatus.CONFLICT, "Tài khoản đã hoàn tất tạo mật khẩu mới.");
    validatePassword(password);
    if (passwordEncoder.matches(password, account.getPasswordHash()))
      throw new AuthException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải khác mật khẩu tạm thời.");
    account.completePasswordChange(passwordEncoder.encode(password));
    return accounts.saveAndFlush(account);
  }

  @Transactional
  public User updateEmail(java.util.UUID userId, String email) {
    User account = accountForUpdate(userId);
    String normalized = normalizeEmail(email);
    if (!normalized.equals(account.getEmail()) && accounts.existsByEmail(normalized))
      throw new AuthException(HttpStatus.CONFLICT, "Email này đã được sử dụng.");
    account.changeEmail(normalized);
    return accounts.saveAndFlush(account);
  }

  @Transactional
  public User updatePassword(java.util.UUID userId, String currentPassword, String newPassword) {
    User account = accountForUpdate(userId);
    if (account.getPasswordHash() != null) verifyCurrentPassword(account, currentPassword);
    validatePassword(newPassword);
    if (account.getPasswordHash() != null && passwordEncoder.matches(newPassword, account.getPasswordHash()))
      throw new AuthException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải khác mật khẩu hiện tại.");
    account.completePasswordChange(passwordEncoder.encode(newPassword));
    return accounts.saveAndFlush(account);
  }

  @Transactional
  public User updateGoogleMeet(java.util.UUID userId, String googleMeetUrl) {
    String url = googleMeetUrl == null ? "" : googleMeetUrl.trim();
    if (!url.isEmpty() && !url.matches("https://meet\\.google\\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}"))
      throw new AuthException(HttpStatus.BAD_REQUEST, "Nhập link Google Meet dạng https://meet.google.com/abc-defg-hij.");
    User account = accountForUpdate(userId);
    account.setGoogleMeetUrl(url.isEmpty() ? null : url);
    return accounts.saveAndFlush(account);
  }

  private User accountForUpdate(java.util.UUID userId) {
    return accounts.findForPasswordChange(userId).orElseThrow(this::invalidCredentials);
  }

  private void verifyCurrentPassword(User account, String password) {
    if (account.getPasswordHash() == null)
      throw new AuthException(HttpStatus.BAD_REQUEST, "Hãy tạo mật khẩu trước khi đổi email.");
    if (password == null || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
        || !passwordEncoder.matches(password, account.getPasswordHash()))
      throw new AuthException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng.");
  }
}
