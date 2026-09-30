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
import vn.chesshub.repository.UserRepository;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final AuthService auth;
  private final UserRepository users;
  private final SecurityContextRepository contexts;
  private final ObjectProvider<ClientRegistrationRepository> oauthClients;

  public AuthController(AuthService auth, UserRepository users, SecurityContextRepository contexts,
      ObjectProvider<ClientRegistrationRepository> oauthClients) {
    this.auth = auth;
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
    establishSession(account, request, response);
    return AccountResponse.from(account);
  }

  @PostMapping("/login")
  public AccountResponse login(@RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
    User account = auth.login(body.email(), body.password());
    establishSession(account, request, response);
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
    new SecurityContextLogoutHandler().logout(request, response, authentication);
    return ResponseEntity.noContent().build();
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

  @ExceptionHandler(AuthException.class)
  public ResponseEntity<ErrorResponse> authError(AuthException error) {
    return ResponseEntity.status(error.getStatus()).body(new ErrorResponse(error.getMessage()));
  }

  public record RegisterRequest(String fullName, String email, String password) { }
  public record LoginRequest(String email, String password) { }
  public record AccountResponse(UUID id, String email, String fullName) {
    static AccountResponse from(User account) {
      return new AccountResponse(account.getId(), account.getEmail(), account.getFullName());
    }
  }
  public record ErrorResponse(String message) { }
}
