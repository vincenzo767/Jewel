package ph.brylesdiamonds.web;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import ph.brylesdiamonds.dto.Dtos.ProductDto;
import ph.brylesdiamonds.model.Category;
import ph.brylesdiamonds.model.Favorite;
import ph.brylesdiamonds.model.Product;
import ph.brylesdiamonds.repo.FavoriteRepository;
import ph.brylesdiamonds.repo.ProductRepository;
import ph.brylesdiamonds.security.AuthUser;
import ph.brylesdiamonds.security.CurrentUser;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** The published catalogue, as customers browse it. Only admins can change it (see AdminProductController). */
@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductRepository products;
    private final FavoriteRepository favorites;
    private final CurrentUser current;

    public ProductController(ProductRepository products, FavoriteRepository favorites, CurrentUser current) {
        this.products = products;
        this.favorites = favorites;
        this.current = current;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ProductDto> list(@RequestParam(required = false) Category category,
                                 @RequestParam(required = false) String q,
                                 @RequestParam(required = false, defaultValue = "featured") String sort,
                                 @RequestParam(required = false, defaultValue = "false") boolean inStock,
                                 @RequestParam(required = false, defaultValue = "false") boolean featured,
                                 @RequestParam(required = false) Integer limit) {
        Set<Long> favs = favoriteIds();
        String needle = q == null ? "" : q.strip().toLowerCase(Locale.ROOT);
        Stream<Product> s = products.findByActiveTrue().stream()
                .filter(p -> category == null || p.getCategory() == category)
                .filter(p -> !inStock || p.getStock() > 0)
                .filter(p -> !featured || p.isFeatured())
                .filter(p -> needle.isEmpty() || matches(p, needle));
        s = s.sorted(switch (sort) {
            case "price-asc" -> Comparator.comparing(Product::getPrice);
            case "price-desc" -> Comparator.comparing(Product::getPrice).reversed();
            case "name" -> Comparator.comparing(Product::getName, String.CASE_INSENSITIVE_ORDER);
            case "new" -> Comparator.comparing(Product::getCreatedAt).reversed().thenComparing(Product::getId, Comparator.reverseOrder());
            default -> Comparator.comparing(Product::isFeatured).reversed().thenComparing(Product::getId);
        });
        if (limit != null && limit > 0) s = s.limit(Math.min(limit, 100));
        return s.map(p -> ProductDto.of(p, favs.contains(p.getId()))).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ProductDto get(@PathVariable Long id) {
        Product p = visible(id);
        return ProductDto.of(p, favoriteIds().contains(p.getId()));
    }

    @GetMapping("/{id}/related")
    @Transactional(readOnly = true)
    public List<ProductDto> related(@PathVariable Long id) {
        Product p = visible(id);
        Set<Long> favs = favoriteIds();
        return products.findByActiveTrue().stream()
                .filter(o -> !o.getId().equals(p.getId()) && o.getCategory() == p.getCategory())
                .limit(4)
                .map(o -> ProductDto.of(o, favs.contains(o.getId())))
                .toList();
    }

    private Product visible(Long id) {
        Product p = products.findById(id).orElseThrow(() -> ApiException.notFound("Piece"));
        boolean admin = current.principal().map(AuthUser::isAdmin).orElse(false);
        if (!p.isActive() && !admin) throw ApiException.notFound("Piece");
        return p;
    }

    private Set<Long> favoriteIds() {
        return current.principal()
                .filter(u -> !u.isAdmin())
                .map(u -> favorites.findForUser(u.id()).stream().map(Favorite::getProduct).map(Product::getId)
                        .collect(Collectors.toSet()))
                .orElse(Set.of());
    }

    private static boolean matches(Product p, String needle) {
        return Stream.of(p.getName(), p.getMetal(), p.getStone(), p.getTag(), p.getDescription(), p.getCategory().name())
                .anyMatch(f -> f != null && f.toLowerCase(Locale.ROOT).contains(needle));
    }
}
