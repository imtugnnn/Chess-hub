package vn.chesshub.service;

import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.Map;
import java.util.Properties;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InvitationMailService {
  private final String clientId, clientSecret, refreshToken, from, origin;
  private final RestClient http;
  @org.springframework.beans.factory.annotation.Autowired
  public InvitationMailService(@Value("${GMAIL_OAUTH_CLIENT_ID:}") String clientId,
      @Value("${GMAIL_OAUTH_CLIENT_SECRET:}") String clientSecret,
      @Value("${GMAIL_OAUTH_REFRESH_TOKEN:}") String refreshToken,
      @Value("${INVITATION_MAIL_FROM:}") String from,
      @Value("${CORS_ORIGIN:http://localhost:4173}") String origin) {
    this(clientId, clientSecret, refreshToken, from, origin, createHttp());
  }
  InvitationMailService(String clientId, String clientSecret, String refreshToken, String from, String origin, RestClient http) {
    this.clientId = clientId; this.clientSecret = clientSecret; this.refreshToken = refreshToken;
    this.from = from; this.origin = origin.replaceAll("/+$", "");
    this.http = http;
  }
  private static RestClient createHttp() {
    var factory = new JdkClientHttpRequestFactory(java.net.http.HttpClient.newBuilder()
      .connectTimeout(java.time.Duration.ofSeconds(10)).build());
    factory.setReadTimeout(java.time.Duration.ofSeconds(20));
    return RestClient.builder().requestFactory(factory).build();
  }
  public void requireConfigured() {
    if (clientId.isBlank() || clientSecret.isBlank() || refreshToken.isBlank() || from.isBlank())
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Chưa cấu hình Gmail OAuth. Không thể mời người chưa có tài khoản.");
  }
  public void send(String email, String password, String centerName) {
    sendMessage(email, "Lời mời tham gia " + centerName + " trên ChessHub",
      "Bạn được mời tham gia trung tâm " + centerName + " trên ChessHub.\n\n"
        + "Đăng nhập: " + origin + "/login\nTài khoản: " + email + "\nMật khẩu tạm thời: " + password
        + "\n\nSau khi đăng nhập, bạn phải tạo mật khẩu mới trước khi sử dụng ứng dụng. "
        + "Sau đó mở Trung tâm để chấp nhận hoặc từ chối lời mời.\nKhông chia sẻ mật khẩu tạm thời này.");
  }

  public void sendPasswordReset(String email, String token) {
    sendMessage(email, "Đặt lại mật khẩu ChessHub",
      "Bạn đã yêu cầu đặt lại mật khẩu ChessHub.\n\n"
        + "Mở link sau để tạo mật khẩu mới: " + origin + "/reset-password#token=" + token
        + "\n\nLink có hiệu lực trong 30 phút và chỉ dùng được một lần."
        + "\nNếu bạn không yêu cầu thay đổi, hãy bỏ qua email này. Không chia sẻ link với người khác.");
  }

  private void sendMessage(String email, String subject, String text) {
    requireConfigured();
    try {
      var form = new LinkedMultiValueMap<String, String>();
      form.add("client_id", clientId); form.add("client_secret", clientSecret);
      form.add("refresh_token", refreshToken); form.add("grant_type", "refresh_token");
      Map<?, ?> token = http.post().uri("https://oauth2.googleapis.com/token")
        .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form).retrieve().body(Map.class);
      if (token == null || !(token.get("access_token") instanceof String access) || access.isBlank())
        throw new IllegalStateException("Missing Gmail access token");
      var message = new MimeMessage(Session.getInstance(new Properties()));
      message.setFrom(new InternetAddress(from, true));
      message.setRecipients(jakarta.mail.Message.RecipientType.TO, InternetAddress.parse(email, true));
      message.setSubject(subject, "UTF-8");
      message.setText(text, "UTF-8");
      var bytes = new ByteArrayOutputStream();
      message.writeTo(bytes);
      http.post().uri("https://gmail.googleapis.com/gmail/v1/users/me/messages/send")
        .headers(headers -> headers.setBearerAuth((String) token.get("access_token")))
        .contentType(MediaType.APPLICATION_JSON)
        .body(Map.of("raw", Base64.getUrlEncoder().withoutPadding().encodeToString(bytes.toByteArray())))
        .retrieve().toBodilessEntity();
    } catch (Exception error) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Không gửi được email. Vui lòng thử lại sau.");
    }
  }
}
