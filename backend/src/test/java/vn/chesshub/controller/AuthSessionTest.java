package vn.chesshub.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import vn.chesshub.config.SecurityConfig;
import vn.chesshub.entity.User;
import vn.chesshub.repository.UserRepository;
import vn.chesshub.service.AuthService;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
class AuthSessionTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @MockitoBean AuthService auth;
  @MockitoBean vn.chesshub.service.RememberLoginService remember;
  @MockitoBean UserRepository users;

  @Test
  void loginPersistsSessionAndScopesUserRoutes() throws Exception {
    UUID userId = UUID.randomUUID();
    User account = mock(User.class);
    when(account.getId()).thenReturn(userId);
    when(account.getEmail()).thenReturn("owner@example.com");
    when(account.getFullName()).thenReturn("Owner");
    when(auth.login("owner@example.com", "password123")).thenReturn(account);
    when(users.findById(userId)).thenReturn(Optional.of(account));

    mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    MvcResult csrfResult = mvc.perform(get("/api/v1/auth/csrf"))
      .andExpect(status().isOk()).andReturn();
    JsonNode csrf = json.readTree(csrfResult.getResponse().getContentAsString());
    MockHttpSession session = (MockHttpSession) csrfResult.getRequest().getSession(false);

    MvcResult login = mvc.perform(post("/api/v1/auth/login").session(session)
        .header(csrf.get("headerName").asText(), csrf.get("token").asText())
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"owner@example.com\",\"password\":\"password123\"}"))
      .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(userId.toString())).andReturn();
    MockHttpSession signedIn = (MockHttpSession) login.getRequest().getSession(false);

    mvc.perform(get("/api/v1/auth/me").session(signedIn))
      .andExpect(status().isOk()).andExpect(jsonPath("$.email").value("owner@example.com"));
    mvc.perform(get("/api/v1/teachers/" + UUID.randomUUID() + "/classes").session(signedIn))
      .andExpect(status().isForbidden());
    mvc.perform(post("/api/v1/auth/logout").session(signedIn))
      .andExpect(status().isForbidden());
    mvc.perform(post("/api/v1/auth/logout").session(signedIn)
        .header(csrf.get("headerName").asText(), csrf.get("token").asText()))
      .andExpect(status().isNoContent());
    assertTrue(signedIn.isInvalid());
    verify(remember, org.mockito.Mockito.times(2)).revoke(any(), any());
  }

  @Test
  void rememberedIdentityRestoresSessionWithoutPasswordAndStillScopesRoutes() throws Exception {
    UUID userId = UUID.randomUUID();
    User account = mock(User.class);
    when(account.getId()).thenReturn(userId);
    when(users.findById(userId)).thenReturn(Optional.of(account));
    when(remember.restore(any(), any())).thenReturn(Optional.of(userId));
    MvcResult restored = mvc.perform(get("/api/v1/auth/me"))
      .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(userId.toString())).andReturn();
    MockHttpSession session = (MockHttpSession) restored.getRequest().getSession(false);
    org.junit.jupiter.api.Assertions.assertNotNull(session);
    mvc.perform(get("/api/v1/teachers/" + UUID.randomUUID() + "/classes").session(session))
      .andExpect(status().isForbidden());
  }

  @Test
  void passwordLoginIssuesRememberTokenOnlyWhenSelected() throws Exception {
    UUID userId = UUID.randomUUID();
    User account = mock(User.class);
    when(account.getId()).thenReturn(userId);
    when(auth.login("owner@example.com", "password123")).thenReturn(account);
    MvcResult csrfResult = mvc.perform(get("/api/v1/auth/csrf")).andReturn();
    JsonNode csrf = json.readTree(csrfResult.getResponse().getContentAsString());
    mvc.perform(post("/api/v1/auth/login").session((MockHttpSession) csrfResult.getRequest().getSession(false))
      .header(csrf.get("headerName").asText(), csrf.get("token").asText())
      .contentType(MediaType.APPLICATION_JSON)
      .content("{\"email\":\"owner@example.com\",\"password\":\"password123\",\"rememberMe\":true}"))
      .andExpect(status().isOk());
    verify(remember).issue(eq(userId), any(), any());
  }

  @Test
  void temporaryPasswordSessionCannotBypassPasswordChange() throws Exception {
    UUID userId = UUID.randomUUID();
    User account = mock(User.class);
    when(account.getId()).thenReturn(userId);
    when(account.isMustChangePassword()).thenReturn(true);
    when(users.findById(userId)).thenReturn(Optional.of(account));
    when(remember.restore(any(), any())).thenReturn(Optional.of(userId));
    MvcResult restored = mvc.perform(get("/api/v1/auth/me"))
      .andExpect(status().isOk()).andExpect(jsonPath("$.mustChangePassword").value(true)).andReturn();
    mvc.perform(get("/api/v1/teachers/" + userId + "/classes")
      .session((MockHttpSession) restored.getRequest().getSession(false)))
      .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("PASSWORD_CHANGE_REQUIRED"));
  }

  @Test
  void googleProviderIsHiddenWhenCredentialsAreNotConfigured() throws Exception {
    mvc.perform(get("/api/v1/auth/providers"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.google").value(false));
  }
}
