import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Mail, MapPin, MessagesSquare, Phone, Search } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import { useChatEvents } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";
import ChatThread from "../../components/ChatThread";
import { Avatar, EASE, PageLoader } from "../../components/ui";
import { formatDate, formatPrice, relativeTime } from "../../lib/format";

const QUICK = ["Yes, it's available — shall I reserve it for you?", "We'd love to welcome you to the shop. What day suits you?", "Engraving is complimentary on every piece."];

export default function Messages() {
  const toast = useToast();
  const { refreshCounts } = useOutletContext() || {};
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("c") ? Number(params.get("c")) : null;
  const [convos, setConvos] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [messages, setMessages] = useState(null);
  const [q, setQ] = useState("");

  const loadConvos = useCallback(() => api.get("/admin/chat/conversations").then(({ data }) => setConvos(data)).catch(() => setConvos([])), []);

  useEffect(() => {
    document.title = "Messages — Bryle's Diamonds Admin";
    loadConvos();
    api.get("/admin/customers").then(({ data }) => setCustomers(data)).catch(() => {});
  }, [loadConvos]);

  const markRead = useCallback((id) => {
    api.post(`/admin/chat/${id}/read`).then(() => refreshCounts?.()).catch(() => {});
    setConvos((cs) => cs?.map((c) => (c.customerId === id ? { ...c, unread: 0 } : c)));
  }, [refreshCounts]);

  useEffect(() => {
    if (!selectedId) { setMessages(null); return; }
    setMessages(null);
    api.get(`/admin/chat/${selectedId}/messages`).then(({ data }) => setMessages(data)).catch(() => setMessages([]));
    markRead(selectedId);
  }, [selectedId, markRead]);

  useChatEvents((e) => {
    if (e.type === "message") {
      const m = e.message;
      if (m.customerId === selectedId) {
        setMessages((ms) => (ms && !ms.some((x) => x.id === m.id) ? [...ms, m] : ms));
        if (!m.fromAdmin) markRead(selectedId);
      }
      loadConvos();
    } else if (e.type === "read-by-customer" && e.customerId === selectedId) {
      setMessages((ms) => ms?.map((m) => (m.fromAdmin ? { ...m, read: true } : m)));
    }
  });

  const send = async (content, productId) => {
    try {
      const { data } = await api.post(`/admin/chat/${selectedId}/messages`, { content, productId });
      setMessages((ms) => (ms?.some((m) => m.id === data.id) ? ms : [...(ms || []), data]));
      loadConvos();
    } catch (e) {
      toast(errorMessage(e), "error");
      throw e;
    }
  };

  // Conversations plus any customer opened directly (e.g. from Customers) who hasn't chatted yet.
  const list = useMemo(() => {
    const cs = [...(convos || [])];
    if (selectedId && !cs.some((c) => c.customerId === selectedId)) {
      const cust = customers.find((c) => c.id === selectedId);
      if (cust) cs.unshift({ customerId: cust.id, customerName: cust.fullName, customerEmail: cust.email, customerAvatar: cust.avatarUrl, lastMessage: "Start a new conversation", lastAt: null, unread: 0 });
    }
    return cs.filter((c) => !q.trim() || `${c.customerName} ${c.customerEmail}`.toLowerCase().includes(q.trim().toLowerCase()));
  }, [convos, customers, selectedId, q]);

  const selected = customers.find((c) => c.id === selectedId) || list.find((c) => c.customerId === selectedId);

  if (convos === null) return <PageLoader inline />;

  return (
    <div className={`inbox ${selectedId ? "has-selection" : ""}`}>
      <aside className="inbox__list">
        <label className="toolbar__search inbox__search">
          <Search size={15} strokeWidth={1.3} />
          <span className="sr-only">Search conversations</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" maxLength={60} />
        </label>
        <div className="inbox__scroll">
          {list.length === 0 && <p className="muted inbox__none">No conversations yet.</p>}
          <AnimatePresence initial={false}>
            {list.map((c) => (
              <motion.button
                layout
                key={c.customerId}
                className={`convo ${c.customerId === selectedId ? "is-active" : ""} ${c.unread ? "is-unread" : ""}`}
                onClick={() => setParams({ c: String(c.customerId) })}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: EASE }}
              >
                {c.customerId === selectedId && <motion.span layoutId="convo-active" className="convo__active" />}
                <Avatar name={c.customerName} src={c.customerAvatar} size={44} />
                <span className="convo__body">
                  <span className="convo__top"><strong>{c.customerName}</strong><small>{c.lastAt ? relativeTime(c.lastAt) : "new"}</small></span>
                  <span className="convo__last">{c.lastFromAdmin ? "You: " : ""}{c.lastMessage}</span>
                </span>
                {c.unread > 0 && <span className="convo__badge">{c.unread}</span>}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </aside>

      <section className="inbox__thread chat-panel">
        {selectedId && selected ? (
          <>
            <header className="chat-panel__head">
              <button className="icon-btn inbox__back" onClick={() => setParams({})} aria-label="Back to conversations"><ArrowLeft size={18} strokeWidth={1.2} /></button>
              <Avatar name={selected.fullName || selected.customerName} src={selected.avatarUrl || selected.customerAvatar} size={44} />
              <div><strong>{selected.fullName || selected.customerName}</strong><small>{selected.email || selected.customerEmail}</small></div>
            </header>
            <ChatThread messages={messages || []} loading={messages === null} viewerIsAdmin onSend={send} quickReplies={QUICK} emptyText="No messages yet — say hello and introduce yourself." />
          </>
        ) : (
          <div className="inbox__empty">
            <MessagesSquare size={34} strokeWidth={0.9} />
            <h3>Select a <em>conversation</em></h3>
            <p className="muted">Customer messages arrive here in real time.</p>
          </div>
        )}
      </section>

      <aside className="inbox__info">
        {selectedId && selected && customers.find((c) => c.id === selectedId) ? (() => {
          const c = customers.find((x) => x.id === selectedId);
          return (
            <motion.div key={c.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE }}>
              <div className="inbox__profile">
                <Avatar name={c.fullName} src={c.avatarUrl} size={84} />
                <h3>{c.fullName}</h3>
                <span className={`chip ${c.enabled ? "chip--emerald" : "chip--burgundy"}`}><i />{c.enabled ? "Active" : "Suspended"}</span>
              </div>
              <ul className="inbox__facts">
                <li><Mail size={14} strokeWidth={1.3} /> {c.email}</li>
                {c.phone && <li><Phone size={14} strokeWidth={1.3} /> {c.phone}</li>}
                {c.address && <li><MapPin size={14} strokeWidth={1.3} /> {c.address}</li>}
              </ul>
              <dl className="cust__facts">
                <div><dt>Reservations</dt><dd>{c.orders}</dd></div>
                <div><dt>Reserved value</dt><dd>{formatPrice(c.spent)}</dd></div>
                <div><dt>Client since</dt><dd>{formatDate(c.createdAt, { month: "short", year: "numeric" })}</dd></div>
                <div><dt>Last seen</dt><dd>{c.lastLoginAt ? relativeTime(c.lastLoginAt) : "—"}</dd></div>
              </dl>
              <Link to="/admin/orders" className="link-line">View reservations <span className="arrow" /></Link>
            </motion.div>
          );
        })() : <p className="muted">Customer details appear here.</p>}
      </aside>
    </div>
  );
}
