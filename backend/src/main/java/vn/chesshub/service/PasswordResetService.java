package vn.chesshub.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.chesshub.repository.UserRepository;

@Service
public class PasswordResetService {
  private final JdbcTemplate jdbc;
  private final UserRepository users;
  private final InvitationMailService mail;
  private final RememberLoginService remember;
  private final SecureRandom random = new SecureRandom();
  private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

  public PasswordResetService(JdbcTemplate jdbc, UserRepository users, InvitationMailService mail, RememberLoginService remember) {
    this.jdbc = jdbc; this.users = users; this.mail = mail; this.remember = remember;
  }

  @Transactional
  public void request(String email) {
    String normalized = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    if (normalized.length() > 255 || !normalized.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
      throw new AuthException(HttpStatus.BAD_REQUEST, "Email không hợp lệ.");
    // Check configuration for every address so this error cannot reveal account existence.
    try { mail.requireConfigured(); }
    catch (org.springframework.web.server.ResponseStatusException error) {
      throw new AuthException(HttpStatus.SERVICE_UNAVAILABLE, "Gửi email hiện chưa khả dụng. Vui lòng thử lại sau.");
    }
    var found = users.findByEmail(normalized);
    if (found.isEmpty()) return;
    var account = users.findForPasswordChange(found.get().getId()).orElseThrow(this::invalidLink);
    // The address may have changed between lookup and acquiring the account lock.
    if (!normalized.equals(account.getEmail())) return;
    Instant now = Instant.now();
    Integer recent = jdbc.queryForObject("select count(*) from password_reset_tokens where user_id = ? and created_at > ?",
      Integer.class, account.getId(), Timestamp.from(now.minusSeconds(60)));
    if (recent != null && recent > 0) return;
    jdbc.update("delete from password_reset_tokens where expires_at <= ? or user_id = ?", Timestamp.from(now), account.getId());
    byte[] bytes = new byte[32];
    random.nextBytes(bytes);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    jdbc.update("insert into password_reset_tokens (token_hash, user_id, email, password_hash_at_request, created_at, expires_at) values (?, ?, ?, ?, ?, ?)",
      hash(token), account.getId(), account.getEmail(), account.getPasswordHash(), Timestamp.from(now), Timestamp.from(now.plusSeconds(1800)));
    try { mail.sendPasswordReset(normalized, token); }
    catch (org.springframework.web.server.ResponseStatusException error) {
      throw new AuthException(HttpStatus.BAD_GATEWAY, "Không gửi được email. Vui lòng thử lại sau.");
    }
  }

  @Transactional
  public void reset(String token, String password) {
    if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) throw invalidLink();
    if (password == null || password.length() < 8)
      throw new AuthException(HttpStatus.BAD_REQUEST, "Mật khẩu cần có ít nhất 8 ký tự.");
    if (password.getBytes(StandardCharsets.UTF_8).length > 72)
      throw new AuthException(HttpStatus.BAD_REQUEST, "Mật khẩu không được vượt quá 72 byte.");
    String digest = hash(token);
    var ids = jdbc.query("select user_id from password_reset_tokens where token_hash = ? and expires_at > ?",
      (row, index) -> row.getObject("user_id", UUID.class), digest, Timestamp.from(Instant.now()));
    if (ids.isEmpty()) throw invalidLink();
    // Serialize issuance and redemption on the account; recheck expiry while consuming.
    var account = users.findForPasswordChange(ids.getFirst()).orElseThrow(this::invalidLink);
    var snapshots = jdbc.query("select email, password_hash_at_request from password_reset_tokens where token_hash = ?",
      (row, index) -> new Snapshot(row.getString("email"), row.getString("password_hash_at_request")), digest);
    if (snapshots.isEmpty() || !snapshots.getFirst().email().equals(account.getEmail())
        || !java.util.Objects.equals(snapshots.getFirst().passwordHash(), account.getPasswordHash())) throw invalidLink();
    if (jdbc.update("delete from password_reset_tokens where token_hash = ? and expires_at > ?",
      digest, Timestamp.from(Instant.now())) != 1) throw invalidLink();
    account.completePasswordChange(encoder.encode(password));
    users.saveAndFlush(account);
    jdbc.update("delete from password_reset_tokens where user_id = ?", account.getId());
    remember.revokeAll(account.getId());
  }

  private AuthException invalidLink() {
    return new AuthException(HttpStatus.BAD_REQUEST, "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu link mới.");
  }
  private record Snapshot(String email, String passwordHash) { }
  private String hash(String token) {
    try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
    catch (java.security.NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
  }
}
