package vn.chesshub.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.chesshub.config.GoogleOAuthConfig;
import vn.chesshub.config.GoogleOAuthSuccessHandler;
import vn.chesshub.config.SecurityConfig;
import vn.chesshub.repository.UserRepository;
import vn.chesshub.service.AuthService;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, GoogleOAuthConfig.class, GoogleOAuthSuccessHandler.class})
@TestPropertySource(properties = {
  "google.oauth.client-id=test-client",
  "google.oauth.client-secret=test-secret",
  "google.oauth.redirect-uri=https://chesshub-web-881466446251.asia-southeast1.run.app/login/oauth2/code/google"
})
class GoogleOAuthFlowTest {
  @Autowired MockMvc mvc;
  @MockitoBean AuthService auth;
  @MockitoBean vn.chesshub.service.RememberLoginService remember;
  @MockitoBean UserRepository users;

  @Test
  void configuredGoogleLoginRedirectsToGoogleWithOpenIdAndEmailScopes() throws Exception {
    mvc.perform(get("/api/v1/auth/providers"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.google").value(true));

    var result = mvc.perform(get("/oauth2/authorization/google"))
      .andExpect(status().isFound())
      .andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("https://accounts.google.com/")))
      .andExpect(header().string("Location", org.hamcrest.Matchers.containsString("scope=openid")))
      .andReturn();
    String location = java.net.URLDecoder.decode(result.getResponse().getHeader("Location"), java.nio.charset.StandardCharsets.UTF_8);
    org.junit.jupiter.api.Assertions.assertTrue(location.contains("redirect_uri=https://chesshub-web-881466446251.asia-southeast1.run.app/login/oauth2/code/google&"));
  }
}
