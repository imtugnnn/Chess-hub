package vn.chesshub.controller;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.chesshub.config.SecurityConfig;
import vn.chesshub.repository.StudentRepository;
import vn.chesshub.repository.UserRepository;
import vn.chesshub.service.RememberLoginService;
import vn.chesshub.service.StudentManagementService;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(StudentController.class)
@Import(SecurityConfig.class)
class StudentControllerTest {
  @Autowired MockMvc mvc;
  @MockitoBean StudentRepository students;
  @MockitoBean StudentManagementService management;
  @MockitoBean RememberLoginService remember;
  @MockitoBean UserRepository users;
  UUID userId = UUID.randomUUID();
  String path() { return "/api/v1/teachers/" + userId + "/students"; }
  @Test void directoryRequiresLoginAndMatchingSessionIdentity() throws Exception {
    mvc.perform(get(path())).andExpect(status().isUnauthorized());
    mvc.perform(get(path()).with(user(UUID.randomUUID().toString()))).andExpect(status().isForbidden());
    verifyNoInteractions(management);
    when(management.list(userId, "", "all", null, "all", 0, 25)).thenReturn(new StudentManagementService.Page(List.of(), 0, 0, 25));
    mvc.perform(get(path()).with(user(userId.toString()))).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
  }
  @Test void profileWritesRequireCsrf() throws Exception {
    String body = "{\"fullName\":\"An\",\"birthDate\":\"2015-01-01\",\"parentName\":\"Parent\",\"parentPhoneNumber\":\"0901234567\"}";
    mvc.perform(post(path()).with(user(userId.toString())).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
    mvc.perform(put(path() + "/" + UUID.randomUUID()).with(user(userId.toString())).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
    verifyNoInteractions(management);
    mvc.perform(post(path()).with(user(userId.toString())).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
    verify(management).create(eq(userId), any());
  }
}

