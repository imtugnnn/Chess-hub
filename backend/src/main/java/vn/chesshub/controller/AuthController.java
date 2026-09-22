package vn.chesshub.controller;

import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.chesshub.entity.User;
import vn.chesshub.service.AuthException;
import vn.chesshub.service.AuthService;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final AuthService auth;

  public AuthController(AuthService auth) { this.auth = auth; }

  @PostMapping("/register")
  public AccountResponse register(@RequestBody RegisterRequest request) {
    return AccountResponse.from(auth.register(request.fullName(), request.email(), request.password()));
  }

  @PostMapping("/login")
  public AccountResponse login(@RequestBody LoginRequest request) {
    return AccountResponse.from(auth.login(request.email(), request.password()));
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
