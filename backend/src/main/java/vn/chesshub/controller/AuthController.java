package vn.chesshub.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.chesshub.entity.User;
import vn.chesshub.service.AuthException;
import vn.chesshub.service.AuthService;
import vn.chesshub.service.RememberLoginService;
import vn.chesshub.repository.UserRepository;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final AuthService auth;
  private final RememberLoginService remember;
  private final UserRepository users;
  private final SecurityContextRepository contexts;
  private final ObjectProvider<ClientRegistrationRepository> oauthClients;

  public AuthController(AuthService auth, RememberLoginService remember, UserRepository users, SecurityContextRepository contexts,
      ObjectProvider<ClientRegistrationRepository> oauthClients) {
    this.auth = auth;
    this.remember = remember;
    this.users = users;
    this.contexts = contexts;
    this.oauthClients = oauthClients;
  }

  @GetMapping("/providers")
  public Map<String, Boolean> providers() {
    return Map.of("google", oauthClients.getIfAvailable() != null);
  }

  @GetMapping("/csrf")
  public CsrfToken csrf(CsrfToken token) { return token; }

  @PostMapping("/register")
  public AccountResponse register(@RequestBody RegisterRequest body, HttpServletRequest request, HttpServletResponse response) {
    User account = auth.register(body.fullName(), body.email(), body.password());
    remember.revoke(request, response);
    establishSession(account, request, response);
    return AccountResponse.from(account);
  }

  @PostMapping("/login")
  public AccountResponse login(@RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
    User account = auth.login(body.email(), body.password());
    establishSession(account, request, response);
    if (!account.isMustChangePassword() && !Boolean.FALSE.equals(body.rememberMe())) remember.issue(account.getId(), request, response);
    else remember.revoke(request, response);
    return AccountResponse.from(account);
  }

  @GetMapping("/me")
  public AccountResponse me(Authentication authentication) {
    UUID userId = UUID.fromString(authentication.getName());
    User account = users.findById(userId)
      .orElseThrow(() -> new AuthException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không còn hiệu lực."));
    return AccountResponse.from(account);
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
    remember.revoke(request, response);
    new SecurityContextLogoutHandler().logout(request, response, authentication);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/initial-password")
  public AccountResponse initialPassword(@RequestBody InitialPasswordRequest body, Authentication authentication,
      HttpServletRequest request, HttpServletResponse response) {
    User account = auth.completeInitialPassword(UUID.fromString(authentication.getName()), body.password());
    remember.revoke(request, response);
    establishSession(account, request, response);
    remember.issue(account.getId(), request, response);
    return AccountResponse.from(account);
  }

  private void establishSession(User account, HttpServletRequest request, HttpServletResponse response) {
    request.getSession(true);
    request.changeSessionId();
    Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
      account.getId().toString(), null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);
    SecurityContextHolder.setContext(context);
    contexts.saveContext(context, request, response);
  }

  @PostMapping("/email")
  public AccountResponse updateEmail(@RequestBody EmailRequest body, Authentication authentication) {
    return AccountResponse.from(auth.updateEmail(UUID.fromString(authentication.getName()), body.email()));
  }

  @PostMapping("/password")
  public AccountResponse updatePassword(@RequestBody PasswordRequest body, Authentication authentication,
      HttpServletRequest request, HttpServletResponse response) {
    UUID userId = UUID.fromString(authentication.getName());
    User account = auth.updatePassword(userId, body.currentPassword(), body.newPassword());
    remember.revokeAll(userId);
    remember.revoke(request, response);
    establishSession(account, request, response);
    return AccountResponse.from(account);
  }

  @PostMapping("/google-meet")
  public AccountResponse updateGoogleMeet(@RequestBody GoogleMeetRequest body, Authentication authentication) {
    return AccountResponse.from(auth.updateGoogleMeet(UUID.fromString(authentication.getName()), body.googleMeetUrl()));
  }

  @ExceptionHandler(AuthException.class)
  public ResponseEntity<ErrorResponse> authError(AuthException error) {
    return ResponseEntity.status(error.getStatus()).body(new ErrorResponse(error.getMessage()));
  }

  public record RegisterRequest(String fullName, String email, String password) { }
  public record LoginRequest(String email, String password, Boolean rememberMe) { }
  public record InitialPasswordRequest(String password, boolean rememberMe) { }
  public record EmailRequest(String email) { }
  public record PasswordRequest(String currentPassword, String newPassword) { }
  public record GoogleMeetRequest(String googleMeetUrl) { }
  public record AccountResponse(UUID id, String email, String fullName, boolean mustChangePassword, boolean hasPassword, String googleMeetUrl) {
    static AccountResponse from(User account) {
      return new AccountResponse(account.getId(), account.getEmail(), account.getFullName(), account.isMustChangePassword(), account.getPasswordHash() != null, account.getGoogleMeetUrl());
    }
  }
  public record ErrorResponse(String message) { }
}
