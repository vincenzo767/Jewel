import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Package, Wallet } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatPrice, formatTime, ORDER_FLOW, ORDER_STATUS, paymentLabel, timeLeft } from "../../lib/format";
import { EASE, EmptyState, Frame, Modal, PageLoader, Reveal } from "../../components/ui";

export function StatusTimeline({ status }) {
  if (status === "CANCELLED") return <div className="timeline timeline--cancelled"><span className="chip chip--burgundy"><i />Cancelled</span></div>;
  const at = ORDER_FLOW.indexOf(status);
  return (
    <ol className="timeline">
      {ORDER_FLOW.map((s, i) => (
        <li key={s} className={i <= at ? "is-done" : ""}>
          <motion.span className="timeline__dot" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ delay: i * 0.12 }}>{i <= at && <Check size={10} strokeWidth={2.2} />}</motion.span>
          <span className="timeline__label">{ORDER_STATUS[s].short}</span>
          {i < ORDER_FLOW.length - 1 && (
            <span className="timeline__bar"><motion.span initial={{ scaleX: 0 }} animate={{ scaleX: i < at ? 1 : 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.15 }} /></span>
          )}
        </li>
      ))}
    </ol>
  );
}

export default function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    document.title = "Reservations — Bryle's Diamonds";
    api.get("/orders").then(({ data }) => setOrders(data)).catch(() => setOrders([]));
  }, []);

  const cancel = async () => {
    try {
      const { data } = await api.post(`/orders/${cancelling.id}/cancel`);
      setOrders((os) => os.map((o) => (o.id === data.id ? data : o)));
      toast("Reservation cancelled — the pieces have been released.");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setCancelling(null);
    }
  };

  return (
    <>
      <header className="page-hero page-hero--compact">
        <div className="container">
          <Reveal as="span" className="eyebrow eyebrow--gold">Held for you</Reveal>
          <h1 className="page-hero__title"><span className="split__line"><motion.span initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: EASE }} style={{ display: "block" }}>Reser<em>vations</em></motion.span></span></h1>
        </div>
      </header>
      <section className="container orders">
        {orders === null ? <PageLoader inline /> : orders.length === 0 ? (
          <EmptyState icon={Package} title="No reservations yet." text="When you reserve pieces from your bag, you'll follow their journey to pickup here.">
            <Link to="/shop" className="btn btn--solid">Start browsing</Link>
          </EmptyState>
        ) : (
          <div className="order-list">
            <AnimatePresence>
              {orders.map((o, k) => (
                <motion.article key={o.id} className={`order ${o.status === "CANCELLED" ? "order--cancelled" : ""}`} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: k * 0.08 }} layout>
                  <header className="order__head">
                    <div>
                      <span className="eyebrow">Reference</span>
                      <h3 className="order__ref">{o.reference}</h3>
                      <span className="order__date">Placed {formatDate(o.createdAt)}{o.pickupDate ? ` · Pickup ${formatDate(o.pickupDate)}` : ""}</span>
                    </div>
                    <div className="order__total"><span className="eyebrow">Total</span><strong>{formatPrice(o.total)}</strong></div>
                  </header>
                  <StatusTimeline status={o.status} />
                  <div className="order__items">
                    {o.items.map((it, i) => (
                      <div key={i} className="order__item">
                        <Frame src={it.imageUrl} alt={it.productName} className="order__thumb" />
                        <div>
                          {it.productId ? <Link to={`/product/${it.productId}`} className="order__name">{it.productName}</Link> : <span className="order__name">{it.productName}</span>}
                          <small>Qty {it.quantity}{it.size ? ` · Size ${it.size}` : ""} · {formatPrice(it.unitPrice)}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                  {["PENDING", "CONFIRMED", "READY_FOR_PICKUP"].includes(o.status) && o.holdUntil && (
                    <p className="hold-note">
                      <Clock size={14} strokeWidth={1.3} />
                      <span>We're holding these pieces for you until <strong>{formatDate(o.holdUntil)}, {formatTime(o.holdUntil)}</strong>{timeLeft(o.holdUntil) ? ` (${timeLeft(o.holdUntil)} left)` : ""}. Need more time? Just message us.</span>
                    </p>
                  )}
                  {o.status === "COMPLETED" && o.paymentMethod && (
                    <p className="hold-note">
                      <Wallet size={14} strokeWidth={1.3} />
                      <span>Paid by <strong>{paymentLabel(o.paymentMethod)}</strong>{o.paidAt ? ` on ${formatDate(o.paidAt)}` : ""}{o.paymentReference ? ` · Ref. ${o.paymentReference}` : ""}</span>
                    </p>
                  )}
                  {o.note && <p className="order__note">“{o.note}”</p>}
                  <footer className="order__foot">
                    <span className={`chip chip--${ORDER_STATUS[o.status].tone}`}><i />{ORDER_STATUS[o.status].label}</span>
                    <div className="order__actions">
                      <Link to="/chat" className="text-btn">Message us</Link>
                      {(o.status === "PENDING" || o.status === "CONFIRMED") && <button className="text-btn" onClick={() => setCancelling(o)}>Cancel reservation</button>}
                    </div>
                  </footer>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
      <Modal open={!!cancelling} onClose={() => setCancelling(null)} eyebrow="Cancel reservation" title="Release these pieces?">
        <p className="muted">Reservation {cancelling?.reference} will be cancelled and the pieces returned to the collection for other clients.</p>
        <div className="modal__actions">
          <button className="btn" onClick={() => setCancelling(null)}>Keep it</button>
          <button className="btn btn--danger" onClick={cancel}>Cancel reservation</button>
        </div>
      </Modal>
    </>
  );
}
