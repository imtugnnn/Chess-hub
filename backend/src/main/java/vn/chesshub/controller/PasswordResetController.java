package vn.chesshub.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.*;
import vn.chesshub.service.AuthException;
import vn.chesshub.service.PasswordResetService;
import vn.chesshub.service.RememberLoginService;

@RestController
@RequestMapping("/api/v1/auth")
public class PasswordResetController {
  private final PasswordResetService resets;
  private final RememberLoginService remember;
  public PasswordResetController(PasswordResetService resets, RememberLoginService remember) {
    this.resets = resets; this.remember = remember;
  }
  @PostMapping("/forgot-password")
  public Map<String, String> forgot(@RequestBody EmailRequest body) {
    resets.request(body.email());
    return Map.of("message", "Nếu email này đã có tài khoản, bạn sẽ nhận được link đặt lại mật khẩu. Hãy kiểm tra cả thư mục spam.");
  }
  @PostMapping("/reset-password")
  public Map<String, String> reset(@RequestBody ResetRequest body, HttpServletRequest request,
      HttpServletResponse response, Authentication authentication) {
    resets.reset(body.token(), body.password());
    remember.revoke(request, response);
    new SecurityContextLogoutHandler().logout(request, response, authentication);
    return Map.of("message", "Mật khẩu đã được cập nhật. Hãy đăng nhập bằng mật khẩu mới.");
  }
  @ExceptionHandler(AuthException.class)
  public ResponseEntity<Map<String, String>> error(AuthException error) {
    return ResponseEntity.status(error.getStatus()).body(Map.of("message", error.getMessage()));
  }
  public record EmailRequest(String email) { }
  public record ResetRequest(String token, String password) { }
}
