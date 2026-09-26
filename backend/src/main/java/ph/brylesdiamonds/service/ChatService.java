package ph.brylesdiamonds.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import ph.brylesdiamonds.dto.Dtos.ChatEvent;
import ph.brylesdiamonds.dto.Dtos.ChatMessageDto;
import ph.brylesdiamonds.dto.Dtos.ConversationDto;
import ph.brylesdiamonds.model.ChatMessage;
import ph.brylesdiamonds.model.Product;
import ph.brylesdiamonds.model.Role;
import ph.brylesdiamonds.model.User;
import ph.brylesdiamonds.repo.ChatMessageRepository;
import ph.brylesdiamonds.repo.ProductRepository;
import ph.brylesdiamonds.repo.UserRepository;
import ph.brylesdiamonds.web.ApiException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ChatService {
    public static final String QUEUE = "/queue/chat";

    private final ChatMessageRepository messages;
    private final ProductRepository products;
    private final UserRepository users;
    private final SimpMessagingTemplate broker;

    public ChatService(ChatMessageRepository messages, ProductRepository products, UserRepository users,
                       SimpMessagingTemplate broker) {
        this.messages = messages;
        this.products = products;
        this.users = users;
        this.broker = broker;
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> thread(Long customerId) {
        return messages.findThread(customerId).stream().map(ChatMessageDto::of).toList();
    }

    @Transactional
    public ChatMessageDto send(User customer, User sender, String content, Long productId) {
        if (customer.getRole() != Role.CUSTOMER) throw ApiException.badRequest("Conversations are with customers only.");
        String text = content == null ? "" : content.strip();
        if (text.isEmpty()) throw ApiException.badRequest("Please write a message.");
        Product product = null;
        if (productId != null) {
            product = products.findById(productId).orElse(null);
            // Customers can only reference pieces they are able to see.
            if (product != null && !product.isActive() && !sender.isAdmin()) product = null;
        }
        ChatMessage saved = messages.save(new ChatMessage(customer, sender, text, product));
        ChatMessageDto dto = ChatMessageDto.of(saved);
        afterCommit(() -> push(customer.getId(), new ChatEvent("message", customer.getId(), dto)));
        return dto;
    }

    /** Marks messages sent *to* the reader as read, and tells the other side. */
    @Transactional
    public void markRead(Long customerId, boolean readerIsAdmin) {
        int changed = messages.markRead(customerId, !readerIsAdmin);
        if (changed > 0) {
            afterCommit(() -> push(customerId, new ChatEvent(readerIsAdmin ? "read-by-admin" : "read-by-customer", customerId, null)));
        }
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> conversations() {
        Map<Long, Long> unread = new HashMap<>();
        for (Object[] row : messages.unreadForAdminsPerCustomer()) unread.put((Long) row[0], (Long) row[1]);
        return messages.findLatestPerConversation().stream().map(m -> {
            User c = m.getCustomer();
            return new ConversationDto(c.getId(), c.getFullName(), c.getEmail(), c.getAvatarUrl(), m.getContent(),
                    m.isFromAdmin(), m.getCreatedAt(), unread.getOrDefault(c.getId(), 0L));
        }).toList();
    }

    @Transactional
    public void welcome(User customer) {
        users.findByRole(Role.ADMIN).stream().findFirst().ifPresent(admin -> send(customer, admin,
                "Welcome to Bryle's Diamonds, " + firstName(customer) + ". I'm here if you'd like help choosing a piece, "
                        + "checking a size, or booking a private viewing at our Talisay City shop.", null));
    }

    private void push(Long customerId, ChatEvent event) {
        broker.convertAndSendToUser(String.valueOf(customerId), QUEUE, event);
        users.findByRole(Role.ADMIN).forEach(a -> broker.convertAndSendToUser(String.valueOf(a.getId()), QUEUE, event));
    }

    private static void afterCommit(Runnable r) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() { r.run(); }
            });
        } else {
            r.run();
        }
    }

    private static String firstName(User u) {
        String n = u.getFullName().strip();
        int space = n.indexOf(' ');
        return space > 0 ? n.substring(0, space) : n;
    }
}
