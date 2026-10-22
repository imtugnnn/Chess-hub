package vn.chesshub.controller;

import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.config.SecurityConfig;
import vn.chesshub.repository.UserRepository;
import vn.chesshub.service.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ClassDraftStudentImportController.class)
@Import(SecurityConfig.class)
class ClassDraftStudentImportControllerTest {
  @Autowired MockMvc mvc;
  @MockitoBean StudentImportService imports;
  @MockitoBean StudentWorkbookService workbooks;
  @MockitoBean RememberLoginService remember;
  @MockitoBean UserRepository users;
  final UUID userId = UUID.randomUUID();
  String path() { return "/api/v1/teachers/" + userId + "/classes/students/import"; }
  MockMultipartFile file() { return new MockMultipartFile("file", "students.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[] {1}); }

  @Test void preparationRequiresMatchingAccountAndCsrf() throws Exception {
    mvc.perform(get(path() + "/template")).andExpect(status().isUnauthorized());
    mvc.perform(get(path() + "/template").with(user(UUID.randomUUID().toString()))).andExpect(status().isForbidden());
    mvc.perform(multipart(path() + "/read").file(file()).with(user(userId.toString()))).andExpect(status().isForbidden());
    mvc.perform(post(path() + "/preview").with(user(userId.toString())).contentType(MediaType.APPLICATION_JSON).content("{\"rows\":[]}")).andExpect(status().isForbidden());
    verifyNoInteractions(imports, workbooks);
  }

  @Test void readAndPreviewWorkWithoutPersistedClass() throws Exception {
    when(workbooks.read(any(), eq(0))).thenReturn(new StudentWorkbookService.WorkbookData(List.of("Students"), 0, List.of(), StudentImportService.FIELDS));
    mvc.perform(multipart(path() + "/read").file(file()).with(user(userId.toString())).with(csrf())).andExpect(status().isOk()).andExpect(jsonPath("$.sheets[0]").value("Students"));
    verify(imports).authorizeDraft(userId, null);
    when(imports.previewDraft(eq(userId), any())).thenReturn(List.of(new StudentImportService.DraftResult(2, "CLASS_ONLY", "Ready", null, List.of(), null)));
    mvc.perform(post(path() + "/preview").with(user(userId.toString())).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"centerId\":null,\"rows\":[]}"))
      .andExpect(status().isOk()).andExpect(jsonPath("$[0].rowNumber").value(2));
  }

  @Test void forbiddenCenterIsRejectedBeforeFileRead() throws Exception {
    UUID center = UUID.randomUUID();
    doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền truy cập trung tâm.")).when(imports).authorizeDraft(userId, center);
    mvc.perform(multipart(path() + "/read").file(file()).param("centerId", center.toString()).with(user(userId.toString())).with(csrf())).andExpect(status().isForbidden());
    verifyNoInteractions(workbooks);
  }
}
