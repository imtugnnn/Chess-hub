package vn.chesshub.service;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RememberLoginService {
  static final String COOKIE_NAME = "CHESSHUB_REMEMBER";
  private static final Duration LIFETIME = Duration.ofDays(30);
  private final JdbcTemplate jdbc;
  private final boolean secure;
  private final SecureRandom random = new SecureRandom();

  public RememberLoginService(JdbcTemplate jdbc, @Value("${server.servlet.session.cookie.secure:false}") boolean secure) {
    this.jdbc = jdbc;
    this.secure = secure;
  }

  @Transactional
  public void issue(UUID userId, HttpServletRequest request, HttpServletResponse response) {
    revoke(request, response);
    Instant now = Instant.now();
    jdbc.update("delete from remember_login_tokens where expires_at <= ?", Timestamp.from(now));
    byte[] bytes = new byte[32];
    random.nextBytes(bytes);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    jdbc.update("insert into remember_login_tokens (token_hash, user_id, expires_at) values (?, ?, ?)",
      hash(token), userId, Timestamp.from(now.plus(LIFETIME)));
    cookie(response, token, LIFETIME);
  }

  public Optional<UUID> restore(HttpServletRequest request, HttpServletResponse response) {
    String token = token(request);
    if (token == null) return Optional.empty();
    if (!token.matches("[A-Za-z0-9_-]{43}")) {
      cookie(response, "", Duration.ZERO);
      return Optional.empty();
    }
    var users = jdbc.query("select t.user_id from remember_login_tokens t join users u on u.id = t.user_id "
      + "where t.token_hash = ? and t.expires_at > ? and u.password_hash is not null and not u.must_change_password",
      (row, index) -> row.getObject("user_id", UUID.class), hash(token), Timestamp.from(Instant.now()));
    if (users.isEmpty()) cookie(response, "", Duration.ZERO);
    return users.stream().findFirst();
  }

  public void revoke(HttpServletRequest request, HttpServletResponse response) {
    String token = token(request);
    if (token != null) jdbc.update("delete from remember_login_tokens where token_hash = ?", hash(token));
    cookie(response, "", Duration.ZERO);
  }

  private String token(HttpServletRequest request) {
    if (request.getCookies() != null) {
      for (Cookie cookie : request.getCookies()) if (COOKIE_NAME.equals(cookie.getName())) return cookie.getValue();
    }
    return null;
  }

  private void cookie(HttpServletResponse response, String value, Duration age) {
    response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(COOKIE_NAME, value)
      .httpOnly(true).secure(secure).sameSite("Lax").path("/").maxAge(age).build().toString());
  }

  private String hash(String token) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException(exception);
    }
  }
}
