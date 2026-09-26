package ph.brylesdiamonds.web;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import ph.brylesdiamonds.service.FileStorageService;

import java.util.concurrent.TimeUnit;

@RestController
public class FileController {
    private final FileStorageService files;

    public FileController(FileStorageService files) {
        this.files = files;
    }

    /**
     * Serves locally stored uploads. Photos that have moved to Supabase Storage are redirected there,
     * so older /api/files/ links keep working. Names are random UUIDs, so they're safe to cache forever.
     */
    @GetMapping("/api/files/{name:.+}")
    public ResponseEntity<?> file(@PathVariable String name) {
        CacheControl forever = CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable();
        return files.loadLocal(name)
                .<ResponseEntity<?>>map(r -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(FileStorageService.mediaType(name)))
                        .cacheControl(forever)
                        .header("Content-Disposition", "inline")
                        .body(r))
                .or(() -> files.movedUrl(name).map(url -> ResponseEntity.status(HttpStatus.MOVED_PERMANENTLY)
                        .cacheControl(forever)
                        .header(HttpHeaders.LOCATION, url)
                        .build()))
                .orElseThrow(() -> ApiException.notFound("Image"));
    }
}
