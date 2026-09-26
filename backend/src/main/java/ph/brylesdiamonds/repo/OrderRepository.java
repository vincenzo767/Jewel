package ph.brylesdiamonds.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import ph.brylesdiamonds.model.Order;
import ph.brylesdiamonds.model.OrderStatus;
import ph.brylesdiamonds.model.Product;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    Optional<Order> findByIdAndCustomerId(Long id, Long customerId);

    @Query("select o from Order o join fetch o.customer order by o.createdAt desc")
    List<Order> findAllWithCustomer();

    long countByStatus(OrderStatus status);

    long countByCustomerId(Long customerId);

    @Query("select coalesce(sum(o.total), 0) from Order o where o.status = ph.brylesdiamonds.model.OrderStatus.COMPLETED")
    BigDecimal completedRevenue();

    @Query("select coalesce(sum(o.total), 0) from Order o where o.customer.id = :customerId and o.status <> ph.brylesdiamonds.model.OrderStatus.CANCELLED")
    BigDecimal spentBy(Long customerId);

    @Query("select count(i) > 0 from OrderItem i where i.imageUrl = :url")
    boolean imageUsedInHistory(String url);

    /** Keeps order history intact when a product is deleted: items retain their snapshot. */
    @Modifying
    @Query("update OrderItem i set i.product = null where i.product = :product")
    void detachProduct(Product product);
}
