package ph.brylesdiamonds.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;

/**
 * Minimal client for Supabase Storage. Images live in one public-read bucket; only this server,
 * holding the secret key, can write or delete. Enabled when SUPABASE_URL and SUPABASE_SECRET_KEY are set.
 */
@Component
public class SupabaseStorage {
    private static final Logger log = LoggerFactory.getLogger(SupabaseStorage.class);

    private final String baseUrl;
    private final String key;
    private final String bucket;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public SupabaseStorage(@Value("${app.supabase.url:}") String url,
                           @Value("${app.supabase.secret-key:}") String key,
                           @Value("${app.supabase.bucket:jewelry}") String bucket) {
        String u = url == null ? "" : url.strip().replaceAll("/+$", "");
        if (!u.isEmpty()) {
            URI parsed = URI.create(u);
            boolean local = "localhost".equals(parsed.getHost()) || "127.0.0.1".equals(parsed.getHost());
            if (!"https".equals(parsed.getScheme()) && !local) {
                throw new IllegalStateException("SUPABASE_URL must start with https://");
            }
        }
        if (!bucket.matches("^[a-z0-9][a-z0-9_-]{1,62}$")) {
            throw new IllegalStateException("SUPABASE_BUCKET may only contain lowercase letters, numbers, '-' and '_'.");
        }
        this.baseUrl = u;
        this.key = key == null ? "" : key.strip();
        this.bucket = bucket;
        if (!u.isEmpty() && this.key.isEmpty()) {
            log.warn("SUPABASE_URL is set but SUPABASE_SECRET_KEY is not - photos will be stored locally.");
        }
    }

    public boolean enabled() {
        return !baseUrl.isEmpty() && !key.isEmpty();
    }

    /** Public address of an object, e.g. https://ref.supabase.co/storage/v1/object/public/jewelry/abc.jpg */
    public String publicUrl(String name) {
        return publicPrefix() + name;
    }

    public String publicPrefix() {
        return baseUrl + "/storage/v1/object/public/" + bucket + "/";
    }

    /** Creates the public bucket (5 MB limit, raster images only) if it doesn't exist yet. */
    public void ensureBucket() throws IOException {
        String body = """
                {"id":"%s","name":"%s","public":true,"file_size_limit":5242880,
                 "allowed_mime_types":["image/jpeg","image/png","image/webp","image/gif"]}""".formatted(bucket, bucket);
        HttpResponse<String> res = send(request("/storage/v1/bucket")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)));
        String text = res.body() == null ? "" : res.body().toLowerCase(Locale.ROOT);
        if (ok(res)) {
            log.info("Created public Supabase Storage bucket '{}'.", bucket);
        } else if (res.statusCode() == 409 || text.contains("already exists") || text.contains("duplicate")) {
            // Already there.
        } else {
            throw new IOException("Could not create Supabase bucket '" + bucket + "': HTTP " + res.statusCode() + " " + res.body());
        }
    }

    public void upload(String name, byte[] bytes, String contentType, boolean upsert) throws IOException {
        HttpResponse<String> res = send(request("/storage/v1/object/" + bucket + "/" + name)
                .header("Content-Type", contentType)
                .header("cache-control", "31536000")
                .header("x-upsert", String.valueOf(upsert))
                .POST(HttpRequest.BodyPublishers.ofByteArray(bytes)));
        if (!ok(res)) {
            throw new IOException("Supabase upload failed: HTTP " + res.statusCode() + " " + res.body());
        }
    }

    public void delete(String name) {
        try {
            HttpResponse<String> res = send(request("/storage/v1/object/" + bucket + "/" + name).DELETE());
            if (!ok(res) && res.statusCode() != 404) {
                log.warn("Could not delete {} from Supabase Storage: HTTP {}", name, res.statusCode());
            }
        } catch (IOException e) {
            log.warn("Could not delete {} from Supabase Storage: {}", name, e.getMessage());
        }
    }

    private HttpRequest.Builder request(String path) {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .timeout(Duration.ofSeconds(30))
                .header("apikey", key);
        // Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys only use apikey.
        if (key.startsWith("eyJ")) b.header("Authorization", "Bearer " + key);
        return b;
    }

    private HttpResponse<String> send(HttpRequest.Builder b) throws IOException {
        try {
            return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted while talking to Supabase", e);
        }
    }

    private static boolean ok(HttpResponse<?> res) {
        return res.statusCode() >= 200 && res.statusCode() < 300;
    }
}
