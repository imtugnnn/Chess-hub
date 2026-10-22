package vn.chesshub.controller;

import java.time.YearMonth;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.chesshub.config.SecurityConfig;
import vn.chesshub.entity.TuitionPayment;
import vn.chesshub.repository.UserRepository;
import vn.chesshub.service.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

@WebMvcTest(TuitionPaymentController.class)
@Import(SecurityConfig.class)
class TuitionPaymentAccessTest {
  @Autowired MockMvc mvc;
  @MockitoBean TuitionPaymentService payments;
  @MockitoBean RememberLoginService remember;
  @MockitoBean UserRepository users;
  final UUID teacher = UUID.randomUUID(), classroom = UUID.randomUUID(), student = UUID.randomUUID();
  String path() { return "/api/v1/teachers/" + teacher + "/classes/" + classroom + "/tuition-payments/" + student; }
  String body() { return "{\"operationId\":\"" + UUID.randomUUID() + "\",\"collected\":true,\"expectedRevision\":0,\"expectedTuition\":100000}"; }
  @Test void mutationRequiresSessionOwnAccountAndCsrf() throws Exception {
    mvc.perform(put(path()).param("month", "2030-01").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body())).andExpect(status().isUnauthorized());
    mvc.perform(put(path()).param("month", "2030-01").with(user(teacher.toString())).contentType(MediaType.APPLICATION_JSON).content(body())).andExpect(status().isForbidden());
    mvc.perform(put(path()).param("month", "2030-01").with(user(UUID.randomUUID().toString())).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body())).andExpect(status().isForbidden());
    verifyNoInteractions(payments);
  }
  @Test void validMutationStaysInAuthorizedScope() throws Exception {
    when(payments.save(eq(teacher), eq(classroom), eq(student), eq(YearMonth.of(2030, 1)), any())).thenReturn(TuitionPayment.View.empty());
    mvc.perform(put(path()).param("month", "2030-01").with(user(teacher.toString())).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body())).andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(0));
  }
}
