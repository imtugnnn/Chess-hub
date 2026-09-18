package vn.chesshub.service;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.chesshub.entity.User;
import vn.chesshub.repository.UserRepository;

@Service
@Transactional(readOnly = true)
public class UserService {
  private final UserRepository users;
  public UserService(UserRepository users) { this.users = users; }
  public List<User> list() { return users.findAllByOrderByFullNameAsc(); }
}
