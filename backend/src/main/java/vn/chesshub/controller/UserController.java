package vn.chesshub.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.chesshub.entity.User;
import vn.chesshub.service.UserService;

@RestController
@CrossOrigin(origins = "${CORS_ORIGIN:http://localhost:4173}")
@RequestMapping("/api/v1/users")
public class UserController {
  private final UserService users;
  public UserController(UserService users) { this.users = users; }
  @GetMapping
  public List<UserResponse> list() { return users.list().stream().map(UserResponse::from).toList(); }

  @GetMapping("/{userId}/deletion-eligibility")
  public UserService.DeletionEligibility deletionEligibility(@PathVariable UUID userId) {
    return users.deletionEligibility(userId);
  }

  @DeleteMapping("/{userId}")
  public void deleteUnusedUser(@PathVariable UUID userId, HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
    users.deleteUnusedUser(userId);
    new SecurityContextLogoutHandler().logout(request, response, authentication);
  }
  record UserResponse(UUID id, UUID centerId, String email, String fullName, String role) {
    static UserResponse from(User user) { return new UserResponse(user.getId(), user.getCenterId(), user.getEmail(), user.getFullName(), user.getRole()); }
  }
}
