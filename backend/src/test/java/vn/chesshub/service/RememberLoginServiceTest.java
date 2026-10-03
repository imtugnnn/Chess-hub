package vn.chesshub.service;

import jakarta.servlet.http.Cookie;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RememberLoginServiceTest {
  @Test
  void issuedTokenIsHashedAndCookieLastsThirtyDays() {
    JdbcTemplate jdbc = mock(JdbcTemplate.class);
    var service = new RememberLoginService(jdbc, true);
    var response = new MockHttpServletResponse();
    UUID userId = UUID.randomUUID();
    Instant before = Instant.now();
    service.issue(userId, new MockHttpServletRequest(), response);
    String cookie = response.getHeaders("Set-Cookie").getLast();
    assertTrue(cookie.contains("Max-Age=2592000"));
    assertTrue(cookie.contains("HttpOnly"));
    assertTrue(cookie.contains("Secure"));
    assertTrue(cookie.contains("SameSite=Lax"));
    String raw = cookie.split(";", 2)[0].split("=", 2)[1];
    assertTrue(raw.matches("[A-Za-z0-9_-]{43}"));
    var hash = ArgumentCaptor.forClass(String.class);
    var expiry = ArgumentCaptor.forClass(Timestamp.class);
    verify(jdbc).update(startsWith("insert into remember_login_tokens"), hash.capture(), eq(userId), expiry.capture());
    assertTrue(hash.getValue().matches("[a-f0-9]{64}"));
    assertNotEquals(raw, hash.getValue());
    assertFalse(expiry.getValue().toInstant().isBefore(before.plus(Duration.ofDays(30))));
    assertFalse(expiry.getValue().toInstant().isAfter(Instant.now().plus(Duration.ofDays(30))));
  }

  @Test
  @SuppressWarnings("unchecked")
  void unknownTokenIsRejectedAndLookupEnforcesServerExpiry() {
    JdbcTemplate jdbc = mock(JdbcTemplate.class);
    var service = new RememberLoginService(jdbc, true);
    var request = new MockHttpServletRequest();
    request.setCookies(new Cookie(RememberLoginService.COOKIE_NAME, "a".repeat(43)));
    var response = new MockHttpServletResponse();
    when(jdbc.query(anyString(), any(RowMapper.class), any(), any())).thenReturn(List.of());
    assertTrue(service.restore(request, response).isEmpty());
    assertTrue(response.getHeader("Set-Cookie").contains("Max-Age=0"));
    verify(jdbc).query(contains("t.expires_at > ? and u.password_hash is not null"), any(RowMapper.class),
      matches("[a-f0-9]{64}"), any(Timestamp.class));
    UUID userId = UUID.randomUUID();
    when(jdbc.query(anyString(), any(RowMapper.class), any(), any())).thenReturn(List.of(userId));
    assertEquals(userId, service.restore(request, new MockHttpServletResponse()).orElseThrow());
  }

  @Test
  void malformedTokenCannotAuthenticateAndLogoutRevokesToken() {
    JdbcTemplate jdbc = mock(JdbcTemplate.class);
    var service = new RememberLoginService(jdbc, false);
    var request = new MockHttpServletRequest();
    request.setCookies(new Cookie(RememberLoginService.COOKIE_NAME, "invalid"));
    assertTrue(service.restore(request, new MockHttpServletResponse()).isEmpty());
    verifyNoInteractions(jdbc);
    var response = new MockHttpServletResponse();
    service.revoke(request, response);
    verify(jdbc).update(eq("delete from remember_login_tokens where token_hash = ?"), matches("[a-f0-9]{64}"));
    assertTrue(response.getHeader("Set-Cookie").contains("Max-Age=0"));
  }
}
