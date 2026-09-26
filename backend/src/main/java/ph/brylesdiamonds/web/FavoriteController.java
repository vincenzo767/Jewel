package ph.brylesdiamonds.web;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import ph.brylesdiamonds.dto.Dtos.ProductDto;
import ph.brylesdiamonds.model.Favorite;
import ph.brylesdiamonds.model.Product;
import ph.brylesdiamonds.repo.FavoriteRepository;
import ph.brylesdiamonds.repo.ProductRepository;
import ph.brylesdiamonds.security.CurrentUser;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {
    private final FavoriteRepository favorites;
    private final ProductRepository products;
    private final CurrentUser current;

    public FavoriteController(FavoriteRepository favorites, ProductRepository products, CurrentUser current) {
        this.favorites = favorites;
        this.products = products;
        this.current = current;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ProductDto> list() {
        return favorites.findForUser(current.id()).stream()
                .map(Favorite::getProduct)
                .filter(Product::isActive)
                .map(p -> ProductDto.of(p, true))
                .toList();
    }

    @PostMapping("/{productId}")
    @Transactional
    public Map<String, Object> add(@PathVariable Long productId) {
        Long uid = current.id();
        Product p = products.findById(productId).filter(Product::isActive)
                .orElseThrow(() -> ApiException.notFound("Piece"));
        if (favorites.findByUserIdAndProductId(uid, productId).isEmpty()) {
            favorites.save(new Favorite(current.get(), p));
        }
        return Map.of("favorite", true);
    }

    @DeleteMapping("/{productId}")
    @Transactional
    public Map<String, Object> remove(@PathVariable Long productId) {
        favorites.findByUserIdAndProductId(current.id(), productId).ifPresent(favorites::delete);
        return Map.of("favorite", false);
    }
}
