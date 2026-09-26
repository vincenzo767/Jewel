package ph.brylesdiamonds.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import ph.brylesdiamonds.model.ChatMessage;
import ph.brylesdiamonds.model.Product;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    @Query("select m from ChatMessage m join fetch m.sender left join fetch m.product where m.customer.id = :customerId order by m.createdAt asc, m.id asc")
    List<ChatMessage> findThread(Long customerId);

    /** The latest message of every conversation, newest conversation first. */
    @Query("""
        select m from ChatMessage m join fetch m.customer
        where m.id in (select max(x.id) from ChatMessage x group by x.customer.id)
        order by m.createdAt desc""")
    List<ChatMessage> findLatestPerConversation();

    @Query("select count(m) from ChatMessage m where m.customer.id = :customerId and m.fromAdmin = :fromAdmin and m.readByRecipient = false")
    long countUnread(Long customerId, boolean fromAdmin);

    @Query("select count(m) from ChatMessage m where m.fromAdmin = false and m.readByRecipient = false")
    long countUnreadForAdmins();

    /** Unread customer messages per conversation: [customerId, count]. */
    @Query("select m.customer.id, count(m) from ChatMessage m where m.fromAdmin = false and m.readByRecipient = false group by m.customer.id")
    List<Object[]> unreadForAdminsPerCustomer();

    @Modifying
    @Query("update ChatMessage m set m.readByRecipient = true where m.customer.id = :customerId and m.fromAdmin = :fromAdmin and m.readByRecipient = false")
    int markRead(Long customerId, boolean fromAdmin);

    @Modifying
    @Query("update ChatMessage m set m.product = null where m.product = :product")
    void detachProduct(Product product);
}
