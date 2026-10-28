package vn.chesshub.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.chesshub.config.SecurityConfig;
import vn.chesshub.repository.UserRepository;
import vn.chesshub.service.PasswordResetService;
import vn.chesshub.service.RememberLoginService;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PasswordResetController.class)
@Import(SecurityConfig.class)
class PasswordResetControllerTest {
  @Autowired MockMvc mvc;
  @MockitoBean PasswordResetService resets;
  @MockitoBean RememberLoginService remember;
  @MockitoBean UserRepository users;

  @Test void recoveryIsPublicButRequiresCsrf() throws Exception {
    for (String path : new String[]{"forgot-password", "reset-password"}) {
      String body = path.equals("forgot-password") ? "{\"email\":\"teacher@example.com\"}" : "{\"token\":\"token\",\"password\":\"NewPassword123\"}";
      mvc.perform(post("/api/v1/auth/" + path).contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isForbidden());
      mvc.perform(post("/api/v1/auth/" + path).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isOk()).andExpect(jsonPath("$.message").isString());
    }
    verify(resets).request("teacher@example.com");
    verify(resets).reset("token", "NewPassword123");
    verify(remember).revoke(any(), any());
  }
}
