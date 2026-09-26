package ph.brylesdiamonds.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import ph.brylesdiamonds.web.ApiException;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Stores uploaded images under random names, in Supabase Storage when it is configured and in the
 * local upload directory otherwise. The file type is decided from the file's own bytes, never from
 * the client-supplied name or Content-Type, and only raster formats are accepted (no SVG).
 */
@Service
public class FileStorageService {
    public static final String URL_PREFIX = "/api/files/";
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    static final Pattern SAFE_NAME = Pattern.compile("^[a-f0-9-]{36}\\.(jpg|png|webp|gif)$");

    private final Path root;
    private final SupabaseStorage supabase;

    public FileStorageService(@Value("${app.upload-dir:./uploads}") String dir, SupabaseStorage supabase) {
        this.root = Paths.get(dir).toAbsolutePath().normalize();
        this.supabase = supabase;
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create upload directory " + root, e);
        }
    }

    /** Validates and saves an image, returning the URL to store (a Supabase public URL or /api/files/...). */
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Please choose an image.");
        if (file.getSize() > MAX_BYTES) throw ApiException.badRequest("Images must be 5 MB or smaller.");
        try (InputStream in = file.getInputStream()) {
            byte[] bytes = in.readNBytes((int) MAX_BYTES + 1);
            if (bytes.length > MAX_BYTES) throw ApiException.badRequest("Images must be 5 MB or smaller.");
            String ext = detect(Arrays.copyOf(bytes, Math.min(bytes.length, 12)));
            if (ext == null) throw ApiException.badRequest("Only JPG, PNG, WEBP or GIF images are allowed.");
            String name = UUID.randomUUID() + "." + ext;
            if (supabase.enabled()) {
                try {
                    supabase.upload(name, bytes, mediaType(name), false);
                } catch (IOException e) {
                    throw new ApiException(HttpStatus.BAD_GATEWAY, "We couldn't save the image right now. Please try again.");
                }
                return supabase.publicUrl(name);
            }
            Files.write(root.resolve(name), bytes);
            return URL_PREFIX + name;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** A locally stored upload, if it is still on disk. */
    public Optional<Resource> loadLocal(String name) {
        if (!SAFE_NAME.matcher(name).matches()) return Optional.empty();
        Path path = root.resolve(name).normalize();
        if (!path.startsWith(root) || !Files.isRegularFile(path)) return Optional.empty();
        return Optional.of(new PathResource(path));
    }

    /** Where a photo that has moved to Supabase now lives, for old /api/files/ links. */
    public Optional<String> movedUrl(String name) {
        return supabase.enabled() && SAFE_NAME.matcher(name).matches() ? Optional.of(supabase.publicUrl(name)) : Optional.empty();
    }

    /** Removes a file this app uploaded (local or Supabase); other URLs, like seeded catalogue photos, are left alone. */
    public void delete(String url) {
        if (url == null) return;
        if (url.startsWith(URL_PREFIX)) {
            String name = url.substring(URL_PREFIX.length());
            if (!SAFE_NAME.matcher(name).matches()) return;
            try {
                Files.deleteIfExists(root.resolve(name));
            } catch (IOException ignored) {
                // A leftover file is harmless.
            }
            if (supabase.enabled()) supabase.delete(name);
        } else if (supabase.enabled() && url.startsWith(supabase.publicPrefix())) {
            String name = url.substring(supabase.publicPrefix().length());
            if (SAFE_NAME.matcher(name).matches()) supabase.delete(name);
        }
    }

    Path root() {
        return root;
    }

    public static String mediaType(String name) {
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".webp")) return "image/webp";
        if (name.endsWith(".gif")) return "image/gif";
        return "image/jpeg";
    }

    private static String detect(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "jpg";
        if (b.length >= 8 && Arrays.equals(Arrays.copyOf(b, 8),
                new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A})) return "png";
        if (b.length >= 6 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8'
                && (b[4] == '7' || b[4] == '9') && b[5] == 'a') return "gif";
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "webp";
        return null;
    }
}
