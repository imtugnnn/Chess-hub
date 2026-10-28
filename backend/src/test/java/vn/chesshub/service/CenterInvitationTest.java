package vn.chesshub.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import vn.chesshub.entity.User;
import vn.chesshub.repository.UserRepository;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CenterInvitationTest {
  JdbcTemplate db;
  UserRepository users;
  InvitationMailService mail;
  CenterService service;
  UUID ownerId = UUID.randomUUID(), centerId = UUID.randomUUID();
  User owner;
  @BeforeEach
  @SuppressWarnings("unchecked")
  void setup() {
    db = mock(JdbcTemplate.class); users = mock(UserRepository.class); mail = mock(InvitationMailService.class);
    service = new CenterService(db, users, mail);
    owner = mock(User.class);
    when(owner.getId()).thenReturn(ownerId); when(owner.getCenterId()).thenReturn(centerId);
    when(users.findById(ownerId)).thenReturn(Optional.of(owner));
    when(db.queryForObject(eq("select center_id from users where id = ?"), eq(UUID.class), eq(ownerId))).thenReturn(centerId);
    when(db.query(contains("select c.id, c.name"), any(RowMapper.class), eq(ownerId), eq(centerId)))
      .thenReturn(List.of(new CenterService.Center(centerId, "Trung tâm", ownerId, "Chủ trung tâm")));
  }
  @Test
  void newAccountGetsHashedTemporaryPasswordAndEmail() {
    when(users.findByEmail("new@example.com")).thenReturn(Optional.empty());
    when(users.saveAndFlush(any(User.class))).thenAnswer(call -> {
      User user = call.getArgument(0); ReflectionTestUtils.setField(user, "id", UUID.randomUUID()); return user;
    });
    var result = service.invite(ownerId, " NEW@example.com ");
    assertEquals("EMAIL", result.delivery());
    var account = org.mockito.ArgumentCaptor.forClass(User.class);
    var password = org.mockito.ArgumentCaptor.forClass(String.class);
    verify(users).saveAndFlush(account.capture());
    verify(mail).send(eq("new@example.com"), password.capture(), eq("Trung tâm"));
    assertTrue(account.getValue().isMustChangePassword());
    assertTrue(new BCryptPasswordEncoder().matches(password.getValue(), account.getValue().getPasswordHash()));
    assertNotEquals(password.getValue(), account.getValue().getPasswordHash());
  }
  @Test
  void existingAccountKeepsPasswordAndReceivesInAppInvitation() {
    User account = mock(User.class); when(account.getId()).thenReturn(UUID.randomUUID());
    when(users.findByEmail("existing@example.com")).thenReturn(Optional.of(account));
    assertEquals("IN_APP", service.invite(ownerId, "existing@example.com").delivery());
    verifyNoInteractions(mail);
    verify(users, never()).saveAndFlush(any());
    verify(account, never()).requirePasswordChange();
  }
  @Test
  void nonOwnerCannotCreateAccountOrInspectMemberClasses() {
    when(owner.getCenterId()).thenReturn(null);
    assertThrows(ResponseStatusException.class, () -> service.invite(ownerId, "new@example.com"));
    assertThrows(ResponseStatusException.class, () -> service.memberClasses(ownerId, UUID.randomUUID()));
    verify(users, never()).saveAndFlush(any()); verifyNoInteractions(mail);
  }
  @Test
  void ownerCannotInspectTeacherOutsideCenter() {
    UUID outsider = UUID.randomUUID();
    assertThrows(ResponseStatusException.class, () -> service.memberClasses(ownerId, outsider));
    verify(users).hasActiveCenterMembershipInCenter(outsider, centerId);
  }
  @Test
  void missingMailConfigurationStopsAccountCreation() {
    doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE)).when(mail).requireConfigured();
    assertThrows(ResponseStatusException.class, () -> service.invite(ownerId, "new@example.com"));
    verify(users, never()).saveAndFlush(any());
  }
}
