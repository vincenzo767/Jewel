package ph.brylesdiamonds.web;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import ph.brylesdiamonds.dto.Dtos.ChatMessageDto;
import ph.brylesdiamonds.dto.Dtos.ChatSend;
import ph.brylesdiamonds.model.User;
import ph.brylesdiamonds.repo.ChatMessageRepository;
import ph.brylesdiamonds.security.CurrentUser;
import ph.brylesdiamonds.service.ChatService;

import java.util.List;
import java.util.Map;

/** A customer's own conversation with the shop. */
@RestController
@RequestMapping("/api/chat")
public class ChatController {
    private final ChatService chat;
    private final ChatMessageRepository messages;
    private final CurrentUser current;

    public ChatController(ChatService chat, ChatMessageRepository messages, CurrentUser current) {
        this.chat = chat;
        this.messages = messages;
        this.current = current;
    }

    @GetMapping("/messages")
    public List<ChatMessageDto> thread() {
        return chat.thread(current.id());
    }

    @PostMapping("/messages")
    public ChatMessageDto send(@Valid @RequestBody ChatSend req) {
        User me = current.get();
        return chat.send(me, me, req.content(), req.productId());
    }

    @PostMapping("/read")
    public Map<String, Object> read() {
        chat.markRead(current.id(), false);
        return Map.of("ok", true);
    }

    @GetMapping("/unread")
    public Map<String, Long> unread() {
        return Map.of("unread", messages.countUnread(current.id(), true));
    }
}
