package vn.chesshub.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.chesshub.service.RememberLoginService;

public class RememberLoginFilter extends OncePerRequestFilter {
  private final RememberLoginService remember;
  private final SecurityContextRepository contexts;

  public RememberLoginFilter(RememberLoginService remember, SecurityContextRepository contexts) {
    this.remember = remember;
    this.contexts = contexts;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    if (SecurityContextHolder.getContext().getAuthentication() == null) {
      remember.restore(request, response).ifPresent(userId -> {
        request.getSession(true);
        request.changeSessionId();
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
          userId.toString(), null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
      });
    }
    chain.doFilter(request, response);
  }
}
