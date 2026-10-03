package vn.chesshub.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.chesshub.repository.UserRepository;

public class InitialPasswordFilter extends OncePerRequestFilter {
  private static final Set<String> ALLOWED = Set.of("/api/v1/auth/me", "/api/v1/auth/csrf",
    "/api/v1/auth/logout", "/api/v1/auth/initial-password");
  private final UserRepository users;
  public InitialPasswordFilter(UserRepository users) { this.users = users; }
  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    var authentication = SecurityContextHolder.getContext().getAuthentication();
    String path = request.getRequestURI().substring(request.getContextPath().length());
    if (path.startsWith("/api/") && !ALLOWED.contains(path) && authentication != null
        && authentication.isAuthenticated() && !(authentication instanceof AnonymousAuthenticationToken)) {
      var user = users.findById(UUID.fromString(authentication.getName()));
      if (user.isPresent() && user.get().isMustChangePassword()) {
        response.setStatus(403); response.setContentType("application/json"); response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"code\":\"PASSWORD_CHANGE_REQUIRED\",\"message\":\"Bạn cần tạo mật khẩu mới trước khi tiếp tục.\"}");
        return;
      }
    }
    chain.doFilter(request, response);
  }
}
