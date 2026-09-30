package vn.chesshub.controller;

import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.service.CenterService;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping("/api/v1/users/{userId}/center")
public class CenterController {
  private final CenterService centers;

  public CenterController(CenterService centers) { this.centers = centers; }

  @GetMapping
  public CenterService.Dashboard dashboard(@PathVariable UUID userId) { return centers.dashboard(userId); }

  @PostMapping
  public CenterService.Dashboard create(@PathVariable UUID userId, @RequestBody CreateRequest request) {
    return centers.create(userId, request.name());
  }

  @PostMapping("/invitations")
  public CenterService.Dashboard invite(@PathVariable UUID userId, @RequestBody InviteRequest request) {
    return centers.invite(userId, request.email());
  }

  @PostMapping("/invitations/{invitationId}/accept")
  public CenterService.Dashboard accept(@PathVariable UUID userId, @PathVariable UUID invitationId) {
    return centers.respond(userId, invitationId, true);
  }

  @PostMapping("/invitations/{invitationId}/decline")
  public CenterService.Dashboard decline(@PathVariable UUID userId, @PathVariable UUID invitationId) {
    return centers.respond(userId, invitationId, false);
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<ErrorResponse> error(ResponseStatusException exception) {
    return ResponseEntity.status(exception.getStatusCode()).body(new ErrorResponse(exception.getReason()));
  }

  public record CreateRequest(String name) { }
  public record InviteRequest(String email) { }
  public record ErrorResponse(String message) { }
}
