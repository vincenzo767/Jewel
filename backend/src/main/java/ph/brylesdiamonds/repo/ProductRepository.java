package ph.brylesdiamonds.repo;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import ph.brylesdiamonds.model.Product;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByActiveTrue();

    @Query("select coalesce(sum(p.stock), 0) from Product p")
    long totalStock();

    List<Product> findTop6ByStockLessThanEqualOrderByStockAsc(int threshold);

    /** Row lock so two customers can't reserve the last piece at the same time. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> findLockedById(Long id);
}
