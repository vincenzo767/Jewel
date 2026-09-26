import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Check, MapPin, ShoppingBag, Trash2 } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import { useShop } from "../../context/ShopContext";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatPrice, SHOP, stockInfo } from "../../lib/format";
import { EASE, EmptyState, Field, Frame, Modal, Reveal, Spinner, Stepper } from "../../components/ui";

const tomorrow = () => {
  const d = new Date(Date.now() + 86400000);
  return d.toISOString().slice(0, 10);
};

export default function Cart() {
  const { cart, loadCart, updateQuantity, removeItem } = useShop();
  const toast = useToast();
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [pickup, setPickup] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => { document.title = "Your bag — Bryle's Diamonds"; loadCart().catch(() => {}); }, [loadCart]);

  const problems = useMemo(() => cart.items.filter((i) => i.quantity > i.product.stock || !i.product.active), [cart.items]);

  const reserve = async () => {
    if (pickup && pickup < tomorrow()) { toast("Please choose a pickup date from tomorrow onwards.", "error"); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/orders/checkout", { note: note.trim() || null, pickupDate: pickup || null });
      setDone(data);
      await loadCart();
    } catch (e) {
      toast(errorMessage(e), "error");
      loadCart().catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="page-hero page-hero--compact">
        <div className="container">
          <Reveal as="span" className="eyebrow eyebrow--gold">Reserve & collect</Reveal>
          <h1 className="page-hero__title"><span className="split__line"><motion.span initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: EASE }} style={{ display: "block" }}>Your <em>Bag</em></motion.span></span></h1>
        </div>
      </header>

      <section className="container cart">
        {cart.items.length === 0 && !done ? (
          <EmptyState icon={ShoppingBag} title="Your bag is waiting for something beautiful." text="Browse the collection and add the pieces you'd like us to hold for you.">
            <Link to="/shop" className="btn btn--solid">Explore the collection</Link>
          </EmptyState>
        ) : (
          <div className="cart__grid">
            <div className="cart__items">
              <AnimatePresence initial={false}>
                {cart.items.map((item) => {
                  const s = stockInfo(item.product.stock);
                  const over = item.quantity > item.product.stock;
                  return (
                    <motion.article key={item.id} className="cart-item" layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -60, height: 0, paddingTop: 0, paddingBottom: 0, transition: { duration: 0.45, ease: EASE } }}>
                      <Link to={`/product/${item.product.id}`}><Frame src={item.product.images[0]} alt={item.product.name} className="cart-item__img" /></Link>
                      <div className="cart-item__body">
                        <Link to={`/product/${item.product.id}`} className="cart-item__name">{item.product.name}</Link>
                        <span className="cart-item__meta">{item.product.metal}{item.size ? ` · Size ${item.size}` : ""}</span>
                        <span className={`cart-item__stock stock-badge stock-badge--${over ? "out" : s.level}`}><i />{over ? `Only ${item.product.stock} available` : s.short}</span>
                        <div className="cart-item__actions">
                          <Stepper size="sm" value={item.quantity} max={Math.max(1, Math.min(item.product.stock, 20))} onChange={(q) => updateQuantity(item.id, q)} />
                          <button className="text-btn cart-item__remove" onClick={() => removeItem(item.id)}><Trash2 size={13} strokeWidth={1.3} /> Remove</button>
                        </div>
                      </div>
                      <div className="cart-item__price">
                        <strong>{formatPrice(item.lineTotal)}</strong>
                        {item.quantity > 1 && <small>{formatPrice(item.product.price)} each</small>}
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>

            <motion.aside className="summary" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}>
              <span className="eyebrow">Reservation summary</span>
              <div className="summary__row"><span>Pieces</span><span>{cart.count}</span></div>
              <div className="summary__row"><span>Subtotal</span><span>{formatPrice(cart.subtotal)}</span></div>
              <div className="summary__row"><span>Engraving & gift wrap</span><span>Complimentary</span></div>
              <div className="summary__total"><span>Total due at pickup</span><strong>{formatPrice(cart.subtotal)}</strong></div>

              <div className="summary__pickup">
                <span className="summary__place"><MapPin size={14} strokeWidth={1.3} /> Pickup at {SHOP.address}</span>
                <Field label="Preferred pickup date (optional)" type="date" min={tomorrow()} value={pickup} onChange={(e) => setPickup(e.target.value)} />
                <Field as="textarea" label="Notes for our jewellers (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} />
              </div>

              {problems.length > 0 && <p className="summary__warn">Some pieces exceed what's in stock. Please adjust quantities to continue.</p>}
              <button className="btn btn--solid btn--block" onClick={reserve} disabled={busy || problems.length > 0 || cart.items.length === 0}>
                {busy ? <><Spinner /> Reserving</> : <><CalendarDays size={16} strokeWidth={1.3} /> Reserve for pickup</>}
              </button>
              <p className="summary__note">No payment now. We'll hold your pieces and confirm by chat — pay securely in store when you collect.</p>
            </motion.aside>
          </div>
        )}
      </section>

      <Modal open={!!done} onClose={() => { setDone(null); navigate("/orders"); }} width={520} className="success-modal">
        {done && (
          <div className="success">
            <motion.span className="success__seal" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.2 }}>
              <Check size={30} strokeWidth={1.4} />
            </motion.span>
            {Array.from({ length: 12 }).map((_, k) => (
              <motion.i key={k} className="success__spark" initial={{ opacity: 0, x: 0, y: 0 }} animate={{ opacity: [0, 1, 0], x: Math.cos((k / 12) * 6.28) * 120, y: Math.sin((k / 12) * 6.28) * 90 }} transition={{ duration: 1.4, delay: 0.35, ease: EASE }}>✦</motion.i>
            ))}
            <span className="eyebrow eyebrow--gold">Reservation received</span>
            <h3 className="modal__title">We're holding it <em>for you.</em></h3>
            <p className="muted">Your reference is</p>
            <p className="success__ref">{done.reference}</p>
            <p className="muted">Our team will confirm shortly in your chat. Total due at pickup: <strong>{formatPrice(done.total)}</strong>.{done.holdUntil && <> We'll hold the pieces until <strong>{formatDate(done.holdUntil)}</strong>.</>}</p>
            <div className="modal__actions" style={{ justifyContent: "center" }}>
              <button className="btn btn--solid" onClick={() => { setDone(null); navigate("/orders"); }}>View reservations</button>
              <button className="btn" onClick={() => { setDone(null); navigate("/shop"); }}>Keep browsing</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
