package vn.chesshub.service;

import jakarta.servlet.http.Cookie;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.junit.jupiter.api.Assertions.*;

class RememberLoginServiceTest {
  private JdbcTemplate jdbc;
  private RememberLoginService remember;
  private final UUID userId = UUID.randomUUID();

  @BeforeEach void setup() throws Exception {
    jdbc = new JdbcTemplate(new DriverManagerDataSource("jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", ""));
    jdbc.execute("create table users (id uuid primary key, password_hash varchar(100), must_change_password boolean)");
    jdbc.update("insert into users values (?, 'hash', false)", userId);
    migrate("V10__create_remember_login_tokens.sql");
    jdbc.update("insert into remember_login_tokens values ('active', ?, ?)", userId, Timestamp.from(Instant.now().plusSeconds(86400)));
    jdbc.update("insert into remember_login_tokens values ('expired', ?, ?)", userId, Timestamp.from(Instant.now().minusSeconds(86400)));
    migrate("V18__remember_login_until_revoked.sql");
    remember = new RememberLoginService(jdbc, true);
  }

  private void migrate(String file) throws Exception {
    jdbc.execute(Files.readString(Path.of("src/main/resources/db/migration", file)));
  }

  private MockHttpServletRequest issue() {
    var response = new MockHttpServletResponse();
    remember.issue(userId, new MockHttpServletRequest(), response);
    String header = response.getHeaders(HttpHeaders.SET_COOKIE).getLast();
    assertTrue(header.contains("HttpOnly"));
    assertTrue(header.contains("Secure"));
    assertTrue(header.contains("SameSite=Lax"));
    String token = header.substring(header.indexOf('=') + 1, header.indexOf(';'));
    var request = new MockHttpServletRequest();
    request.setCookies(new Cookie(RememberLoginService.COOKIE_NAME, token));
    return request;
  }

  @Test void migrationPreservesActiveTokensWithoutRevivingExpiredTokens() {
    assertEquals(0, jdbc.queryForObject("select count(*) from remember_login_tokens where token_hash = 'expired'", Integer.class));
    assertNull(jdbc.queryForObject("select expires_at from remember_login_tokens where token_hash = 'active'", Timestamp.class));
  }

  @Test void rememberedLoginHasNoServerExpiryAndRenewsCookieUntilLogout() {
    var request = issue();
    assertEquals(0, jdbc.queryForObject("select count(*) from remember_login_tokens where expires_at is not null", Integer.class));
    var restored = new MockHttpServletResponse();
    assertEquals(userId, remember.restore(request, restored).orElseThrow());
    assertTrue(restored.getHeader(HttpHeaders.SET_COOKIE).contains("Max-Age=31536000"));
    var loggedOut = new MockHttpServletResponse();
    remember.revoke(request, loggedOut);
    assertTrue(loggedOut.getHeader(HttpHeaders.SET_COOKIE).contains("Max-Age=0"));
    assertTrue(remember.restore(request, new MockHttpServletResponse()).isEmpty());
  }

  @Test void revokingAllTokensAndDisabledAccountsPreventRestoration() {
    var request = issue();
    remember.revokeAll(userId);
    assertTrue(remember.restore(request, new MockHttpServletResponse()).isEmpty());
    request = issue();
    jdbc.update("update users set must_change_password = true where id = ?", userId);
    assertTrue(remember.restore(request, new MockHttpServletResponse()).isEmpty());
  }

  @Test void googleOnlyAccountRestoresWithoutPasswordAndStopsAfterLogout() {
    jdbc.update("update users set password_hash = null where id = ?", userId);
    var request = issue();
    var restored = new MockHttpServletResponse();
    assertEquals(userId, remember.restore(request, restored).orElseThrow());
    assertTrue(restored.getHeader(HttpHeaders.SET_COOKIE).contains("Max-Age=31536000"));
    remember.revoke(request, new MockHttpServletResponse());
    assertTrue(remember.restore(request, new MockHttpServletResponse()).isEmpty());
  }
}
