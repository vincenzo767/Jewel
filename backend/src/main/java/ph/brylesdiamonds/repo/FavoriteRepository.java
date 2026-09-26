package ph.brylesdiamonds.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import ph.brylesdiamonds.model.Favorite;
import ph.brylesdiamonds.model.Product;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    @Query("select f from Favorite f join fetch f.product where f.user.id = :userId order by f.createdAt desc")
    List<Favorite> findForUser(Long userId);

    Optional<Favorite> findByUserIdAndProductId(Long userId, Long productId);

    @Modifying
    @Query("delete from Favorite f where f.product = :product")
    void deleteByProduct(Product product);

    long countByProductId(Long productId);
}
