package vn.chesshub.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;
import vn.chesshub.entity.User;
import vn.chesshub.service.AuthException;
import vn.chesshub.service.AuthService;

@Component
public class GoogleOAuthSuccessHandler implements AuthenticationSuccessHandler {
  private final AuthService auth;
  private final SecurityContextRepository contexts;
  private final String frontendOrigin;

  public GoogleOAuthSuccessHandler(AuthService auth, SecurityContextRepository contexts,
      @Value("${CORS_ORIGIN:http://localhost:4173}") String frontendOrigin) {
    this.auth = auth;
    this.contexts = contexts;
    this.frontendOrigin = frontendOrigin.replaceAll("/+$", "");
  }

  @Override
  public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
      Authentication authentication) throws IOException {
    try {
      if (!(authentication.getPrincipal() instanceof OidcUser google)) {
        throw new IllegalStateException("Google did not return an OpenID Connect identity");
      }
      User account = auth.loginWithGoogle(google.getSubject(), google.getEmail(),
        google.getFullName(), Boolean.TRUE.equals(google.getEmailVerified()));
      Authentication local = UsernamePasswordAuthenticationToken.authenticated(
        account.getId().toString(), null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
      SecurityContext context = SecurityContextHolder.createEmptyContext();
      context.setAuthentication(local);
      SecurityContextHolder.setContext(context);
      contexts.saveContext(context, request, response);
      response.sendRedirect(frontendOrigin + "/homepage");
    } catch (AuthException | IllegalStateException error) {
      SecurityContextHolder.clearContext();
      if (request.getSession(false) != null) request.getSession(false).invalidate();
      response.sendRedirect(frontendOrigin + "/login?oauthError=google");
    }
  }
}
