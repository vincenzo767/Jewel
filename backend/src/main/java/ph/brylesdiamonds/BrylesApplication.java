package ph.brylesdiamonds;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

// Authentication is handled by our own cookie/JWT filter, so Spring's default in-memory user is not wanted.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@EnableScheduling
public class BrylesApplication {
    public static void main(String[] args) {
        SpringApplication.run(BrylesApplication.class, args);
    }
}
