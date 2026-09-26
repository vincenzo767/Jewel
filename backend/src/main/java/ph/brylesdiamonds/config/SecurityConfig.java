package ph.brylesdiamonds.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.security.web.header.writers.DelegatingRequestMatcherHeaderWriter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.NegatedRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import ph.brylesdiamonds.dto.Dtos.ApiError;
import org.springframework.security.web.authentication.session.NullAuthenticatedSessionStrategy;
import ph.brylesdiamonds.security.AuthCookies;
import ph.brylesdiamonds.security.AuthStateCache;
import ph.brylesdiamonds.security.JwtAuthFilter;
import ph.brylesdiamonds.security.JwtService;
import ph.brylesdiamonds.security.SpaCsrfTokenRequestHandler;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private static final String CSP_COMMON = "default-src 'self'; img-src 'self' data: blob: https:; "
            + "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; "
            + "connect-src 'self'; frame-src https://maps.google.com https://www.google.com; "
            + "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; ";
    /** The React app ships no inline scripts, so it gets the strict policy. */
    private static final String CSP_APP = CSP_COMMON + "script-src 'self'";
    /** The static landing pages use small inline scripts. */
    private static final String CSP_LANDING = CSP_COMMON + "script-src 'self' 'unsafe-inline'";

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtService jwt, AuthStateCache authStates, AuthCookies authCookies, ObjectMapper json,
                                    @Value("${app.cookie.secure:false}") boolean secureCookies) throws Exception {
        CookieCsrfTokenRepository csrfRepo = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfRepo.setCookiePath("/");
        csrfRepo.setCookieCustomizer(c -> c.sameSite("Strict").secure(secureCookies));

        RequestMatcher appPages = new AntPathRequestMatcher("/app/**");

        http
            // The session cookie authenticates every request, which Spring would otherwise treat as a fresh
            // sign-in and answer with a new CSRF token each time, racing parallel requests. The token stays
            // stable instead; writes still need the matching header, and the cookie is SameSite=Strict.
            .csrf(csrf -> csrf.csrfTokenRepository(csrfRepo).csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler())
                    .sessionAuthenticationStrategy(new NullAuthenticatedSessionStrategy()))
            .cors(cors -> {})
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable)
            .requestCache(AbstractHttpConfigurer::disable)
            .headers(h -> h
                .frameOptions(f -> f.deny())
                .referrerPolicy(r -> r.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy", "camera=(), microphone=(), payment=(), geolocation=(self)"))
                .addHeaderWriter(new StaticHeadersWriter("Cross-Origin-Opener-Policy", "same-origin"))
                .addHeaderWriter(new DelegatingRequestMatcherHeaderWriter(appPages,
                        new StaticHeadersWriter("Content-Security-Policy", CSP_APP)))
                .addHeaderWriter(new DelegatingRequestMatcherHeaderWriter(new NegatedRequestMatcher(appPages),
                        new StaticHeadersWriter("Content-Security-Policy", CSP_LANDING))))
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> write(res, json, 401, "Please sign in to continue."))
                .accessDeniedHandler((req, res, ex) -> write(res, json, 403, ex instanceof CsrfException
                        ? "CSRF" : "You don't have access to that.")))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/auth/session", "/api/auth/login", "/api/auth/register", "/api/auth/logout").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/files/**", "/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/cart/**", "/api/favorites/**", "/api/orders/**", "/api/chat/**").hasRole("CUSTOMER")
                .requestMatchers("/api/**", "/ws/**").authenticated()
                // Static landing page + the single-page app shell
                .anyRequest().permitAll())
            .addFilterBefore(new JwtAuthFilter(jwt, authStates, authCookies), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.allowed-origins}") String origins) {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList());
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE"));
        cfg.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN", "X-Requested-With"));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cfg);
        source.registerCorsConfiguration("/ws/**", cfg);
        return source;
    }

    private static void write(HttpServletResponse res, ObjectMapper json, int status, String message) throws IOException {
        res.setStatus(status);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        json.writeValue(res.getOutputStream(), new ApiError(message, null));
    }
}
