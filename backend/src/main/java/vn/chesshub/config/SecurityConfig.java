package vn.chesshub.config;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {
  private static final Pattern USER_PATH = Pattern.compile("^/api/v1/(?:teachers|users)/([^/]+)(?:/.*)?$");

  @Bean
  SecurityContextRepository securityContextRepository() {
    return new HttpSessionSecurityContextRepository();
  }

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityContextRepository contexts,
      ObjectProvider<ClientRegistrationRepository> clients, ObjectProvider<GoogleOAuthSuccessHandler> googleSuccess,
      @Value("${CORS_ORIGIN:http://localhost:4173}") String frontendOrigin) throws Exception {
    http
      .cors(Customizer.withDefaults())
      .csrf(Customizer.withDefaults())
      .securityContext(context -> context.securityContextRepository(contexts))
      .formLogin(AbstractHttpConfigurer::disable)
      .httpBasic(AbstractHttpConfigurer::disable)
      .logout(AbstractHttpConfigurer::disable)
      .requestCache(AbstractHttpConfigurer::disable)
      .exceptionHandling(errors -> errors
        .authenticationEntryPoint((request, response, exception) -> writeError(response, HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập."))
        .accessDeniedHandler((request, response, exception) -> writeError(response, HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập.")))
      .authorizeHttpRequests(authorize -> authorize
        .requestMatchers("/health", "/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/csrf", "/api/v1/auth/providers").permitAll()
        .requestMatchers("/api/v1/teachers/**", "/api/v1/users/**").access(ownAccount())
        .anyRequest().authenticated());
    if (clients.getIfAvailable() != null) {
      String redirectBase = frontendOrigin.replaceAll("/+$", "");
      http.oauth2Login(oauth -> oauth
        .successHandler(googleSuccess.getObject())
        .failureHandler((request, response, error) -> response.sendRedirect(redirectBase + "/login?oauthError=google")));
    }
    return http.build();
  }

  private AuthorizationManager<RequestAuthorizationContext> ownAccount() {
    return (authentication, context) -> {
      Authentication current = authentication.get();
      if (current == null || !current.isAuthenticated() || current instanceof AnonymousAuthenticationToken) {
        return new AuthorizationDecision(false);
      }
      String requestPath = context.getRequest().getRequestURI().substring(context.getRequest().getContextPath().length());
      Matcher path = USER_PATH.matcher(requestPath);
      if (!path.matches()) return new AuthorizationDecision("/api/v1/users".equals(requestPath));
      try {
        return new AuthorizationDecision(UUID.fromString(path.group(1)).toString().equals(current.getName()));
      } catch (IllegalArgumentException exception) {
        return new AuthorizationDecision(false);
      }
    };
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(@Value("${CORS_ORIGIN:http://localhost:4173}") String origin) {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of(origin));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("Content-Type", "X-CSRF-TOKEN"));
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }

  private static void writeError(jakarta.servlet.http.HttpServletResponse response, HttpStatus status, String message) throws IOException {
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");
    response.getWriter().write("{\"message\":\"" + message + "\"}");
  }
}
