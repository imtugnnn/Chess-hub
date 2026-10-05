package vn.chesshub.controller;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.service.TeachingMaterialService;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class TeachingMaterialFileTest {
  private final TeachingMaterialService materials = mock(TeachingMaterialService.class);
  private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new TeachingMaterialController(materials)).build();
  private final UUID teacher = UUID.randomUUID();
  private final UUID material = UUID.randomUUID();
  private final String url = "/api/v1/teachers/" + teacher + "/materials/" + material + "/file";

  @Test void pdfOpensInlineWithOriginalContentAndUnicodeFilename() throws Exception {
    assertFile("Bài giảng.pdf", "application/pdf", "inline");
  }

  @Test void otherFormatsRemainDownloads() throws Exception {
    assertFile("Bài giảng.ppt", "application/vnd.ms-powerpoint", "attachment");
    assertFile("Bài giảng.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "attachment");
  }

  @Test void fileStillRequiresMaterialAccess() throws Exception {
    when(materials.download(teacher, material)).thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));
    mvc.perform(get(url)).andExpect(status().isNotFound());
  }

  private void assertFile(String name, String type, String disposition) throws Exception {
    byte[] data = "%PDF-1.7 test".getBytes(StandardCharsets.US_ASCII);
    when(materials.download(teacher, material)).thenReturn(new TeachingMaterialService.Download(name, type, data));
    var response = mvc.perform(get(url)).andExpect(status().isOk())
      .andExpect(content().contentType(type)).andExpect(content().bytes(data))
      .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "private, no-store"))
      .andExpect(header().string("X-Content-Type-Options", "nosniff")).andReturn().getResponse();
    var header = ContentDisposition.parse(response.getHeader(HttpHeaders.CONTENT_DISPOSITION));
    assertEquals(disposition, header.getType());
    assertEquals(name, header.getFilename());
  }
}
