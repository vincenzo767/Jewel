package ph.brylesdiamonds.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Loads KEY=value pairs from a local .env file (./.env, or ./backend/.env when started from the
 * project root). Real environment variables win, and blank values are skipped so an unfilled
 * line such as {@code DB_URL=} falls back to the default instead of breaking startup.
 * Registered in META-INF/spring.factories.
 */
public class DotEnvLoader implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication app) {
        Path file = Path.of(".env");
        if (!Files.isRegularFile(file)) file = Path.of("backend", ".env");
        if (!Files.isRegularFile(file)) return;

        Map<String, Object> values = new LinkedHashMap<>();
        try {
            for (String raw : Files.readAllLines(file, StandardCharsets.UTF_8)) {
                String line = raw.strip();
                if (line.isEmpty() || line.startsWith("#")) continue;
                if (line.startsWith("export ")) line = line.substring(7).strip();
                int eq = line.indexOf('=');
                if (eq <= 0) continue;
                String key = line.substring(0, eq).strip();
                String value = unquote(line.substring(eq + 1).strip());
                if (!value.isEmpty()) values.put(key, value);
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read " + file.toAbsolutePath(), e);
        }
        if (values.isEmpty()) return;

        MapPropertySource source = new MapPropertySource("dotenv [" + file + "]", values);
        String sysEnv = StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME;
        if (env.getPropertySources().contains(sysEnv)) env.getPropertySources().addAfter(sysEnv, source);
        else env.getPropertySources().addLast(source);
    }

    private static String unquote(String v) {
        if (v.length() >= 2 && ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'")))) {
            return v.substring(1, v.length() - 1);
        }
        return v;
    }
}
