package ph.brylesdiamonds.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

/**
 * On startup, when Supabase Storage is configured: makes sure the bucket exists, then moves any photos
 * still in the local upload directory into it. Each file is uploaded, every database reference to it
 * (product photos, profile pictures, reservation thumbnails) is rewritten to the Supabase URL, and only
 * then is the local copy deleted. Safe to run repeatedly; a failed file is left in place and retried next start.
 */
@Component
public class UploadMigration {
    private static final Logger log = LoggerFactory.getLogger(UploadMigration.class);

    private final SupabaseStorage supabase;
    private final FileStorageService files;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;

    public UploadMigration(SupabaseStorage supabase, FileStorageService files, JdbcTemplate jdbc, TransactionTemplate tx) {
        this.supabase = supabase;
        this.files = files;
        this.jdbc = jdbc;
        this.tx = tx;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Order(10)
    public void run() {
        List<Path> local = localUploads();
        if (!supabase.enabled()) {
            if (!local.isEmpty()) {
                log.info("{} photo(s) are stored locally in {}. Set SUPABASE_URL and SUPABASE_SECRET_KEY to move them to Supabase Storage.",
                        local.size(), files.root());
            }
            return;
        }
        try {
            supabase.ensureBucket();
        } catch (IOException e) {
            log.error("Supabase Storage is not reachable, so photo uploads will fail until this is fixed: {}", e.getMessage());
            return;
        }
        if (local.isEmpty()) return;

        int moved = 0;
        for (Path file : local) {
            String name = file.getFileName().toString();
            try {
                supabase.upload(name, Files.readAllBytes(file), FileStorageService.mediaType(name), true);
                String oldUrl = FileStorageService.URL_PREFIX + name;
                String newUrl = supabase.publicUrl(name);
                Integer refs = tx.execute(s ->
                        jdbc.update("update product_images set url = ? where url = ?", newUrl, oldUrl)
                        + jdbc.update("update users set avatar_url = ? where avatar_url = ?", newUrl, oldUrl)
                        + jdbc.update("update order_items set image_url = ? where image_url = ?", newUrl, oldUrl));
                Files.delete(file);
                moved++;
                log.info("Moved {} to Supabase Storage ({} database reference(s) updated).", name, refs);
            } catch (Exception e) {
                log.warn("Could not move {} to Supabase Storage yet; it stays local and will be retried: {}", name, e.getMessage());
            }
        }
        log.info("Moved {} of {} local photo(s) to Supabase Storage.", moved, local.size());
    }

    private List<Path> localUploads() {
        try (Stream<Path> s = Files.list(files.root())) {
            return s.filter(Files::isRegularFile)
                    .filter(p -> FileStorageService.SAFE_NAME.matcher(p.getFileName().toString()).matches())
                    .toList();
        } catch (IOException e) {
            return List.of();
        }
    }
}
