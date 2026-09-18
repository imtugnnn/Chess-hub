package vn.chesshub.controller;

import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
public class HealthController {
  private final JdbcTemplate jdbc;
  public HealthController(JdbcTemplate jdbc) { this.jdbc = jdbc; }
  @GetMapping("/health")
  public Map<String, String> health() { jdbc.queryForObject("select 1", Integer.class); return Map.of("status", "ok"); }
}
