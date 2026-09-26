package ph.brylesdiamonds.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import ph.brylesdiamonds.model.CartItem;
import ph.brylesdiamonds.model.Product;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    @Query("select c from CartItem c join fetch c.product where c.user.id = :userId order by c.createdAt")
    List<CartItem> findForUser(Long userId);

    Optional<CartItem> findByIdAndUserId(Long id, Long userId);

    Optional<CartItem> findByUserIdAndProductIdAndSize(Long userId, Long productId, String size);

    @Modifying
    @Query("delete from CartItem c where c.product = :product")
    void deleteByProduct(Product product);

    @Modifying
    @Query("delete from CartItem c where c.user.id = :userId")
    void deleteForUser(Long userId);
}
