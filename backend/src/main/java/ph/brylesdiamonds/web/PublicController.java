package ph.brylesdiamonds.web;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ph.brylesdiamonds.model.Product;
import ph.brylesdiamonds.repo.ProductRepository;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Read-only data for the public landing page, which is open to visitors who haven't signed in.
 * Only published, featured pieces and their public details are exposed, and the result is cached
 * briefly so anonymous traffic doesn't reach the database on every visit.
 */
@RestController
@RequestMapping("/api/public")
public class PublicController {
    public record FeaturedPiece(Long id, String name, String category, String tag, String metal, BigDecimal price,
                                boolean inStock, List<String> images) {
        static FeaturedPiece of(Product p) {
            return new FeaturedPiece(p.getId(), p.getName(), p.getCategory().name(), p.getTag(), p.getMetal(),
                    p.getPrice(), p.getStock() > 0, List.copyOf(p.getImages().subList(0, Math.min(2, p.getImages().size()))));
        }
    }

    private static final long CACHE_MS = Duration.ofSeconds(60).toMillis();

    private final ProductRepository products;
    private volatile List<FeaturedPiece> cached;
    private volatile long cachedAt;

    public PublicController(ProductRepository products) {
        this.products = products;
    }

    @GetMapping("/featured")
    @Transactional(readOnly = true)
    public ResponseEntity<List<FeaturedPiece>> featured() {
        long now = System.currentTimeMillis();
        List<FeaturedPiece> list = cached;
        if (list == null || now - cachedAt > CACHE_MS) {
            list = products.findTop8ByActiveTrueAndFeaturedTrueOrderByIdAsc().stream().map(FeaturedPiece::of).toList();
            cached = list;
            cachedAt = now;
        }
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic()).body(list);
    }
}
