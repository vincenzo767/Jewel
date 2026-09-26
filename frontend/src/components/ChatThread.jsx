import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCheck, Check, Paperclip, SendHorizontal, X } from "lucide-react";
import { dayLabel, formatPrice, formatTime } from "../lib/format";
import { EASE, Spinner } from "./ui";

const MAX = 2000;

function ProductBubble({ product, admin }) {
  const to = admin ? `/admin/products/${product.id}` : `/product/${product.id}`;
  return (
    <Link to={to} className="bubble-product">
      {product.image && <img src={product.image} alt="" loading="lazy" />}
      <span>
        <strong>{product.name}</strong>
        <small>{formatPrice(product.price)}</small>
      </span>
    </Link>
  );
}

/**
 * A conversation between one customer and the shop. `viewerIsAdmin` decides which side is "mine".
 * Message text is rendered as plain text (React escapes it), so nothing a sender types can run as markup.
 */
export default function ChatThread({ messages, viewerIsAdmin, onSend, loading, attached, onClearAttached, quickReplies = [], initialDraft = "", emptyText, disabled }) {
  const [text, setText] = useState(initialDraft);
  const [sending, setSending] = useState(false);
  const scroller = useRef(null);
  const input = useRef(null);
  const firstLoad = useRef(true);

  useEffect(() => { setText(initialDraft); }, [initialDraft]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: firstLoad.current ? "instant" : "smooth" });
    if (messages?.length) firstLoad.current = false;
  }, [messages?.length]);

  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text]);

  const send = async (content = text) => {
    const body = content.trim();
    if (!body || sending || body.length > MAX) return;
    setSending(true);
    try {
      await onSend(body, attached?.id ?? null);
      setText("");
      onClearAttached?.();
      input.current?.focus();
    } finally {
      setSending(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  };

  const mine = (m) => (viewerIsAdmin ? m.fromAdmin : !m.fromAdmin);
  const lastMine = [...(messages || [])].reverse().find(mine);

  return (
    <div className="thread">
      <div className="thread__scroll" ref={scroller}>
        {loading ? (
          <div className="thread__loading"><Spinner size={20} /></div>
        ) : messages.length === 0 ? (
          <div className="thread__empty"><span>✦</span><p>{emptyText || "Say hello — we usually reply within the hour."}</p></div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
            const grouped = prev && !newDay && prev.fromAdmin === m.fromAdmin && new Date(m.createdAt) - new Date(prev.createdAt) < 5 * 60000;
            const own = mine(m);
            return (
              <Fragment key={m.id}>
                {newDay && <div className="thread__day"><span>{dayLabel(m.createdAt)}</span></div>}
                <motion.div
                  className={`msg ${own ? "msg--mine" : "msg--theirs"} ${grouped ? "msg--grouped" : ""}`}
                  initial={firstLoad.current ? false : { opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  {!grouped && !own && <span className="msg__who">{m.fromAdmin ? `${m.senderName} · Bryle's Diamonds` : m.senderName}</span>}
                  <div className="msg__bubble">
                    {m.product && <ProductBubble product={m.product} admin={viewerIsAdmin} />}
                    <p>{m.content}</p>
                  </div>
                  <span className="msg__meta">
                    {formatTime(m.createdAt)}
                    {own && m.id === lastMine?.id && (m.read ? <span className="msg__seen"><CheckCheck size={13} strokeWidth={1.6} /> Seen</span> : <Check size={13} strokeWidth={1.6} />)}
                  </span>
                </motion.div>
              </Fragment>
            );
          })
        )}
      </div>

      <div className="composer">
        <AnimatePresence>
          {attached && (
            <motion.div className="composer__attached" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <div className="composer__attached-inner">
                <Paperclip size={14} strokeWidth={1.3} />
                {attached.images?.[0] && <img src={attached.images[0]} alt="" />}
                <span><strong>{attached.name}</strong><small>{formatPrice(attached.price)}</small></span>
                <button onClick={onClearAttached} aria-label="Remove attached piece"><X size={15} strokeWidth={1.3} /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {quickReplies.length > 0 && !text && (
          <div className="composer__quick">
            {quickReplies.map((q) => <button key={q} onClick={() => send(q)} disabled={sending || disabled}>{q}</button>)}
          </div>
        )}
        <div className="composer__row">
          <label className="sr-only" htmlFor="composer-input">Message</label>
          <textarea
            id="composer-input"
            ref={input}
            rows={1}
            value={text}
            maxLength={MAX}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder={disabled ? "Select a conversation" : "Write a message…"}
          />
          <motion.button className="composer__send" onClick={() => send()} disabled={!text.trim() || sending || disabled} aria-label="Send message" whileTap={{ scale: 0.9 }}>
            {sending ? <Spinner /> : <SendHorizontal size={18} strokeWidth={1.4} />}
          </motion.button>
        </div>
        {text.length > MAX - 200 && <span className="composer__count">{text.length} / {MAX}</span>}
      </div>
    </div>
  );
}
