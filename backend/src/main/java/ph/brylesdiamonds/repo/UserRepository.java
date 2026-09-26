package ph.brylesdiamonds.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import ph.brylesdiamonds.model.Role;
import ph.brylesdiamonds.model.User;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<User> findByRoleOrderByCreatedAtDesc(Role role);

    List<User> findByRole(Role role);

    long countByRole(Role role);
}
