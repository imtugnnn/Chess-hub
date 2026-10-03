package vn.chesshub.service;

import java.io.ByteArrayInputStream;
import java.util.Base64;
import java.util.Properties;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class InvitationMailTest {
  @Test
  void oauthRefreshesAccessAndSendsCorrectMimeMessage() throws Exception {
    var builder = RestClient.builder();
    var server = MockRestServiceServer.bindTo(builder).build();
    var mail = new InvitationMailService("client", "secret", "refresh", "sender@example.com", "https://chesshub.example/", builder.build());
    server.expect(requestTo("https://oauth2.googleapis.com/token"))
      .andExpect(content().string(org.hamcrest.Matchers.containsString("grant_type=refresh_token")))
      .andRespond(withSuccess("{\"access_token\":\"test-access\"}", MediaType.APPLICATION_JSON));
    server.expect(requestTo("https://gmail.googleapis.com/gmail/v1/users/me/messages/send"))
      .andExpect(header("Authorization", "Bearer test-access"))
      .andExpect(request -> {
        try {
        byte[] payload = ((org.springframework.mock.http.client.MockClientHttpRequest) request).getBodyAsBytes();
        String raw = new com.fasterxml.jackson.databind.ObjectMapper().readTree(payload).get("raw").asText();
        var message = new MimeMessage(Session.getInstance(new Properties()), new ByteArrayInputStream(Base64.getUrlDecoder().decode(raw)));
        assertEquals("teacher@example.com", message.getAllRecipients()[0].toString());
        assertTrue(message.getSubject().contains("Trung tâm cờ vua"));
        assertTrue(message.getContent().toString().contains("Mật khẩu tạm thời: Temporary123"));
        assertTrue(message.getContent().toString().contains("https://chesshub.example/login"));
        } catch (jakarta.mail.MessagingException exception) { throw new java.io.IOException(exception); }
      }).andRespond(withSuccess("{\"id\":\"sent-id\"}", MediaType.APPLICATION_JSON));
    mail.send("teacher@example.com", "Temporary123", "Trung tâm cờ vua");
    server.verify();
  }
  @Test
  void providerFailureDoesNotExposeSecretsOrClaimSuccess() {
    var builder = RestClient.builder();
    var server = MockRestServiceServer.bindTo(builder).build();
    var mail = new InvitationMailService("client", "secret", "refresh", "sender@example.com", "https://chesshub.example", builder.build());
    server.expect(requestTo("https://oauth2.googleapis.com/token")).andRespond(withUnauthorizedRequest());
    var error = assertThrows(ResponseStatusException.class, () -> mail.send("teacher@example.com", "Temporary123", "Center"));
    assertEquals(502, error.getStatusCode().value());
    assertFalse(error.getReason().contains("Temporary123"));
    server.verify();
  }
}
