package vn.chesshub.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import vn.chesshub.entity.User;

public interface UserRepository extends JpaRepository<User, UUID> {
  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("select u from User u where u.id = :userId")
  Optional<User> findForPasswordChange(UUID userId);
  List<User> findAllByOrderByFullNameAsc();
  Optional<User> findByEmail(String email);
  Optional<User> findByGoogleSubject(String googleSubject);
  boolean existsByEmail(String email);

  @Query(value = "select exists (select 1 from centers where owner_user_id = :userId)", nativeQuery = true)
  boolean ownsCenter(UUID userId);

  @Query(value = "select exists (select 1 from center_invitations where invited_by_user_id = :userId)", nativeQuery = true)
  boolean hasCreatedCenterInvitations(UUID userId);

  @Query(value = "select exists (select 1 from center_memberships where user_id = :userId and status = 'ACTIVE')", nativeQuery = true)
  boolean hasActiveCenterMembership(UUID userId);

  @Query(value = "select exists (select 1 from center_memberships where user_id = :userId and center_id = :centerId and status = 'ACTIVE')", nativeQuery = true)
  boolean hasActiveCenterMembershipInCenter(UUID userId, UUID centerId);
}
