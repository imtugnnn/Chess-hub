package vn.chesshub.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;

@Configuration
public class GoogleOAuthConfig {
  @Bean
  @Conditional(Configured.class)
  ClientRegistrationRepository clientRegistrationRepository(
      @Value("${google.oauth.client-id}") String clientId,
      @Value("${google.oauth.client-secret}") String clientSecret) {
    return new InMemoryClientRegistrationRepository(
      CommonOAuth2Provider.GOOGLE.getBuilder("google")
        .clientId(clientId)
        .clientSecret(clientSecret)
        .scope("openid", "profile", "email")
        .build());
  }

  static class Configured implements Condition {
    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
      String id = context.getEnvironment().getProperty("google.oauth.client-id");
      String secret = context.getEnvironment().getProperty("google.oauth.client-secret");
      return id != null && !id.isBlank() && secret != null && !secret.isBlank();
    }
  }
}
