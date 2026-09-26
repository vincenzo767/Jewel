import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, MapPin, Phone } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import { useShop } from "../../context/ShopContext";
import { useSocket, useChatEvents } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";
import ChatThread from "../../components/ChatThread";
import { EASE } from "../../components/ui";
import { SHOP } from "../../lib/format";

const QUICK = ["Is this available in my size?", "Can I book a private viewing?", "Do you offer engraving?", "What are your payment options?"];

export default function Chat() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { setUnread } = useShop();
  const { connected } = useSocket();
  const [messages, setMessages] = useState(null);
  const [attached, setAttached] = useState(location.state?.product || null);
  // Captured once: the navigation state is cleared right after mount.
  const [draft] = useState(() => (location.state?.product
    ? `Hello! I'd love to know more about the ${location.state.product.name}.`
    : location.state?.draft || ""));

  const markRead = useCallback(() => {
    api.post("/chat/read").catch(() => {});
    setUnread(0);
  }, [setUnread]);

  useEffect(() => {
    document.title = "Chat — Bryle's Diamonds";
    api.get("/chat/messages").then(({ data }) => setMessages(data)).catch(() => setMessages([]));
    markRead();
    // Clear the navigation state so a refresh doesn't re-attach the piece.
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useChatEvents((e) => {
    if (e.type === "message") {
      setMessages((ms) => (ms && !ms.some((m) => m.id === e.message.id) ? [...ms, e.message] : ms));
      if (e.message.fromAdmin) markRead();
    } else if (e.type === "read-by-admin") {
      setMessages((ms) => ms?.map((m) => (m.fromAdmin ? m : { ...m, read: true })));
    }
  });

  const send = async (content, productId) => {
    try {
      const { data } = await api.post("/chat/messages", { content, productId });
      setMessages((ms) => (ms.some((m) => m.id === data.id) ? ms : [...ms, data]));
    } catch (e) {
      toast(errorMessage(e), "error");
      throw e;
    }
  };

  return (
    <div className="chat-page">
      <motion.aside className="chat-page__side" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, ease: EASE }}>
        <span className="eyebrow eyebrow--gold">Private consultation</span>
        <h1>Speak with <em>our jewellers</em></h1>
        <p className="muted">Questions about a stone, a size or a custom commission? Our team at the Talisay City shop answers personally.</p>
        <ul className="chat-page__facts">
          <li><Clock size={15} strokeWidth={1.2} /> Replies usually within the hour, {SHOP.hours[0][0]} {SHOP.hours[0][1]}</li>
          <li><MapPin size={15} strokeWidth={1.2} /> {SHOP.address}</li>
          <li><Phone size={15} strokeWidth={1.2} /> {SHOP.phone}</li>
        </ul>
      </motion.aside>
      <motion.section className="chat-panel" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}>
        <header className="chat-panel__head">
          <span className="chat-panel__avatar">B·D<i className={connected ? "is-online" : ""} /></span>
          <div>
            <strong>Bryle's Diamonds</strong>
            <small>{connected ? "Online · the shop team" : "Connecting…"}</small>
          </div>
        </header>
        <ChatThread
          messages={messages || []}
          loading={messages === null}
          viewerIsAdmin={false}
          onSend={send}
          attached={attached}
          onClearAttached={() => setAttached(null)}
          quickReplies={messages?.filter((m) => !m.fromAdmin).length ? [] : QUICK}
          initialDraft={draft}
        />
      </motion.section>
    </div>
  );
}
