import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Clock, MessageCircle, Package, Wallet } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatPrice, formatTime, ORDER_STATUS, PAYMENT_METHODS, paymentLabel, timeLeft } from "../../lib/format";
import { EASE, EmptyState, Field, Frame, Modal, PageLoader, Spinner } from "../../components/ui";
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
  const [collect, setCollect] = useState(null);
  const [busy, setBusy] = useState(false);

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

  const replace = (data) => setOrders((os) => os.map((o) => (o.id === data.id ? data : o)));

  const move = async (order, status, payment = {}) => {
    setConfirm(null);
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/orders/${order.id}/status`, { status, ...payment });
      replace(data);
      setCollect(null);
      toast(`${data.reference} — ${ORDER_STATUS[status].label}. The customer has been notified.`);
    } catch (e) { toast(errorMessage(e), "error"); } finally { setBusy(false); }
  };

  const extend = async (order) => {
    try {
      const { data } = await api.patch(`/admin/orders/${order.id}/hold`, { days: 7 });
      replace(data);
      toast(`${data.reference} is now held until ${formatDate(data.holdUntil)}.`);
    } catch (e) { toast(errorMessage(e), "error"); }
  };

  const onAction = (o, st) => {
    if (st === "CANCELLED") setConfirm({ order: o, status: st });
    else if (st === "COMPLETED") setCollect({ order: o, method: "CASH", reference: "" });
    else move(o, st);
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
                          {["PENDING", "CONFIRMED", "READY_FOR_PICKUP"].includes(o.status) && o.holdUntil && (
                            <p className={`hold-note ${timeLeft(o.holdUntil) && !timeLeft(o.holdUntil).includes("days") ? "hold-note--soon" : ""}`}>
                              <Clock size={14} strokeWidth={1.3} />
                              <span>Held until <strong>{formatDate(o.holdUntil)}, {formatTime(o.holdUntil)}</strong>{timeLeft(o.holdUntil) ? ` — ${timeLeft(o.holdUntil)} left` : " — releasing shortly"}. Uncollected reservations are released automatically.</span>
                              <button className="text-btn" onClick={() => extend(o)}>Extend 7 days</button>
                            </p>
                          )}
                          {o.status === "COMPLETED" && o.paymentMethod && (
                            <p className="hold-note">
                              <Wallet size={14} strokeWidth={1.3} />
                              <span>Paid by <strong>{paymentLabel(o.paymentMethod)}</strong>{o.paymentReference ? <> · Ref. <strong>{o.paymentReference}</strong></> : null}{o.paidAt ? ` · ${formatDate(o.paidAt)}, ${formatTime(o.paidAt)}` : ""}</span>
                            </p>
                          )}
                          {(o.note || o.pickupDate) && (
                            <p className="order__note">{o.pickupDate && <>Preferred pickup: <strong>{formatDate(o.pickupDate)}</strong>. </>}{o.note && `“${o.note}”`}</p>
                          )}
                          <div className="aorder__actions">
                            <Link to={`/admin/messages?c=${o.customerId}`} className="btn btn--sm"><MessageCircle size={14} strokeWidth={1.3} /> Message customer</Link>
                            {(NEXT[o.status] || []).map(([st, label]) => (
                              <button key={st} className={`btn btn--sm ${st === "CANCELLED" ? "btn--danger" : "btn--emerald"}`} onClick={() => onAction(o, st)}>{label}</button>
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

      <Modal open={!!collect} onClose={() => !busy && setCollect(null)} eyebrow="Mark as collected" title={`Collect ${collect?.order.reference}`}>
        {collect && (
          <form className="collect" onSubmit={(e) => { e.preventDefault(); move(collect.order, "COMPLETED", { paymentMethod: collect.method, paymentReference: collect.reference.trim() || null }); }}>
            <p className="muted">Only confirm once {collect.order.customerName} has paid in full and taken the pieces. This records the sale and can't be undone.</p>
            <div className="collect__total"><span>Amount received</span><strong>{formatPrice(collect.order.total)}</strong></div>
            <fieldset className="collect__methods">
              <legend className="field-label">Paid by</legend>
              <div className="pills">
                {PAYMENT_METHODS.map(([k, l]) => (
                  <button type="button" key={k} className={`pill ${collect.method === k ? "is-active" : ""}`} aria-pressed={collect.method === k} onClick={() => setCollect((c) => ({ ...c, method: k }))}>{l}</button>
                ))}
              </div>
            </fieldset>
            <Field label={collect.method === "CASH" ? "Receipt number (optional)" : "Reference / transaction number (optional)"} value={collect.reference} maxLength={80}
              onChange={(e) => setCollect((c) => ({ ...c, reference: e.target.value }))} />
            <div className="modal__actions">
              <button type="button" className="btn" onClick={() => setCollect(null)} disabled={busy}>Not yet</button>
              <button className="btn btn--emerald" disabled={busy}>{busy ? <><Spinner /> Saving</> : "Confirm collected & paid"}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
