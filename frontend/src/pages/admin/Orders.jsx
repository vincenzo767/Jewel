import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MessageCircle, Package } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatPrice, formatTime, ORDER_STATUS } from "../../lib/format";
import { EASE, EmptyState, Frame, Modal, PageLoader } from "../../components/ui";
import { StatusTimeline } from "../customer/Orders";

const NEXT = {
  PENDING: [["CONFIRMED", "Confirm"], ["CANCELLED", "Decline"]],
  CONFIRMED: [["READY_FOR_PICKUP", "Mark ready for pickup"], ["CANCELLED", "Cancel"]],
  READY_FOR_PICKUP: [["COMPLETED", "Mark as collected"], ["CANCELLED", "Cancel"]],
};
const TABS = [["open", "Open"], ["PENDING", "Pending"], ["READY_FOR_PICKUP", "Ready"], ["COMPLETED", "Completed"], ["CANCELLED", "Cancelled"], ["all", "All"]];

export default function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState(null);
  const [tab, setTab] = useState("open");
  const [expanded, setExpanded] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    document.title = "Reservations — Bryle's Diamonds Admin";
    api.get("/admin/orders").then(({ data }) => setOrders(data)).catch(() => setOrders([]));
  }, []);

  const counts = useMemo(() => {
    const c = { all: 0, open: 0 };
    (orders || []).forEach((o) => { c[o.status] = (c[o.status] || 0) + 1; c.all++; if (!["COMPLETED", "CANCELLED"].includes(o.status)) c.open++; });
    return c;
  }, [orders]);

  const visible = (orders || []).filter((o) => tab === "all" || (tab === "open" ? !["COMPLETED", "CANCELLED"].includes(o.status) : o.status === tab));

  const move = async (order, status) => {
    setConfirm(null);
    try {
      const { data } = await api.patch(`/admin/orders/${order.id}/status`, { status });
      setOrders((os) => os.map((o) => (o.id === data.id ? data : o)));
      toast(`${data.reference} — ${ORDER_STATUS[status].label}. The customer has been notified.`);
    } catch (e) { toast(errorMessage(e), "error"); }
  };

  if (orders === null) return <PageLoader inline />;

  return (
    <div>
      <div className="tabs admin-tabs" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? "is-active" : ""}`} onClick={() => setTab(k)} role="tab" aria-selected={tab === k}>
            {l} <span className="count">{counts[k] || 0}</span>
            {tab === k && <motion.span layoutId="orders-tab" className="tab__line" />}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={Package} title="Nothing here." text="Reservations appear here as soon as customers reserve pieces from their bag." />
      ) : (
        <div className="aorders">
          <AnimatePresence initial={false}>
            {visible.map((o, i) => {
              const open = expanded === o.id;
              const s = ORDER_STATUS[o.status];
              return (
                <motion.article key={o.id} layout className={`aorder ${open ? "is-open" : ""}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: EASE, delay: Math.min(i, 10) * 0.03 }}>
                  <button className="aorder__row" onClick={() => setExpanded(open ? null : o.id)} aria-expanded={open}>
                    <span className="aorder__ref">{o.reference}</span>
                    <span className="aorder__cust"><strong>{o.customerName}</strong><small>{o.customerEmail}</small></span>
                    <span className="aorder__when">{formatDate(o.createdAt)}<small>{formatTime(o.createdAt)}</small></span>
                    <span className="aorder__total">{formatPrice(o.total)}</span>
                    <span className={`chip chip--${s.tone}`}><i />{s.short}</span>
                    <motion.span animate={{ rotate: open ? 180 : 0 }} className="aorder__chev"><ChevronDown size={18} strokeWidth={1.2} /></motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div className="aorder__detail" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }}>
                        <div className="aorder__inner">
                          <StatusTimeline status={o.status} />
                          <div className="order__items">
                            {o.items.map((it, k) => (
                              <div key={k} className="order__item">
                                <Frame src={it.imageUrl} alt="" className="order__thumb" />
                                <div>
                                  {it.productId ? <Link to={`/admin/products/${it.productId}`} className="order__name">{it.productName}</Link> : <span className="order__name">{it.productName}</span>}
                                  <small>Qty {it.quantity}{it.size ? ` · Size ${it.size}` : ""} · {formatPrice(it.unitPrice)}</small>
                                </div>
                              </div>
                            ))}
                          </div>
                          {(o.note || o.pickupDate) && (
                            <p className="order__note">{o.pickupDate && <>Preferred pickup: <strong>{formatDate(o.pickupDate)}</strong>. </>}{o.note && `“${o.note}”`}</p>
                          )}
                          <div className="aorder__actions">
                            <Link to={`/admin/messages?c=${o.customerId}`} className="btn btn--sm"><MessageCircle size={14} strokeWidth={1.3} /> Message customer</Link>
                            {(NEXT[o.status] || []).map(([st, label]) => (
                              <button key={st} className={`btn btn--sm ${st === "CANCELLED" ? "btn--danger" : "btn--emerald"}`} onClick={() => (st === "CANCELLED" ? setConfirm({ order: o, status: st }) : move(o, st))}>{label}</button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} eyebrow="Cancel reservation" title={`Cancel ${confirm?.order.reference}?`}>
        <p className="muted">The reserved pieces will be returned to stock and {confirm?.order.customerName} will be notified in their chat.</p>
        <div className="modal__actions">
          <button className="btn" onClick={() => setConfirm(null)}>Keep</button>
          <button className="btn btn--danger" onClick={() => move(confirm.order, confirm.status)}>Cancel reservation</button>
        </div>
      </Modal>
    </div>
  );
}
