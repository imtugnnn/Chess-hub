package vn.chesshub.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.chesshub.entity.User;

public interface UserRepository extends JpaRepository<User, UUID> {
  List<User> findAllByOrderByFullNameAsc();
}
