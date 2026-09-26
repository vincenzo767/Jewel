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


    @Query("select o from Order o join fetch o.customer order by o.createdAt desc")
    List<Order> findRecent(org.springframework.data.domain.Pageable page);

    @Query("select o from Order o where o.status in (ph.brylesdiamonds.model.OrderStatus.PENDING, ph.brylesdiamonds.model.OrderStatus.CONFIRMED, ph.brylesdiamonds.model.OrderStatus.READY_FOR_PICKUP) and o.holdUntil is null")
    List<Order> findOpenWithoutHold();

    /** Open reservations whose hold has run out, with their customer loaded for the chat notice. */
    @Query("select o from Order o join fetch o.customer where o.status in (ph.brylesdiamonds.model.OrderStatus.PENDING, ph.brylesdiamonds.model.OrderStatus.CONFIRMED, ph.brylesdiamonds.model.OrderStatus.READY_FOR_PICKUP) and o.holdUntil < :now")
    List<Order> findOverdue(java.time.Instant now);

    /** Per customer: [customerId, reservation count, total reserved excluding cancellations]. */
    @Query("""
        select o.customer.id, count(o),
               coalesce(sum(case when o.status <> ph.brylesdiamonds.model.OrderStatus.CANCELLED then o.total else 0 end), 0)
        from Order o group by o.customer.id""")
    List<Object[]> totalsPerCustomer();

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
