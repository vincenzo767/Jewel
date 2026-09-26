package ph.brylesdiamonds.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import ph.brylesdiamonds.model.User;
import ph.brylesdiamonds.repo.UserRepository;
import ph.brylesdiamonds.web.ApiException;

import java.util.Optional;

@Component
public class CurrentUser {
    private final UserRepository users;

    public CurrentUser(UserRepository users) {
        this.users = users;
    }

    public Optional<AuthUser> principal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof AuthUser u ? Optional.of(u) : Optional.empty();
    }

    public Long id() {
        return principal().map(AuthUser::id)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in."));
    }

    public User get() {
        return users.findById(id()).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in."));
    }
}
