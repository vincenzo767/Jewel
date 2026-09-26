import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, Search, Users } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatPrice, relativeTime } from "../../lib/format";
import { Avatar, EASE, EmptyState, Modal, PageLoader, Toggle } from "../../components/ui";

export default function Customers() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [suspending, setSuspending] = useState(null);

  useEffect(() => {
    document.title = "Customers — Bryle's Diamonds Admin";
    api.get("/admin/customers").then(({ data }) => setItems(data)).catch(() => setItems([]));
  }, []);

  const rows = useMemo(() => (items || []).filter((c) => !q.trim() || `${c.fullName} ${c.email} ${c.phone || ""}`.toLowerCase().includes(q.trim().toLowerCase())), [items, q]);

  const setEnabled = async (c, enabled) => {
    setSuspending(null);
    try {
      const { data } = await api.patch(`/admin/customers/${c.id}/status`, { enabled });
      setItems((xs) => xs.map((x) => (x.id === data.id ? data : x)));
      toast(enabled ? `${c.fullName}'s account reactivated` : `${c.fullName}'s account suspended and signed out`);
    } catch (e) { toast(errorMessage(e), "error"); }
  };

  if (items === null) return <PageLoader inline />;

  return (
    <div>
      <div className="toolbar">
        <label className="toolbar__search">
          <Search size={16} strokeWidth={1.3} />
          <span className="sr-only">Search customers</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or phone" maxLength={80} />
        </label>
        <span className="toolbar__count" style={{ margin: 0 }}>{items.length} registered client{items.length === 1 ? "" : "s"}</span>
      </div>

      {rows.length === 0 ? <EmptyState icon={Users} title="No customers found." text={items.length ? "Try a different search." : "Customers appear here once they create an account."} /> : (
        <div className="cust-grid">
          {rows.map((c, i) => (
            <motion.article key={c.id} className={`cust ${!c.enabled ? "cust--off" : ""}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: Math.min(i, 12) * 0.04 }}>
              <header className="cust__head">
                <Avatar name={c.fullName} src={c.avatarUrl} size={52} />
                <div>
                  <strong>{c.fullName}</strong>
                  <small>{c.email}</small>
                </div>
              </header>
              <dl className="cust__facts">
                <div><dt>Reservations</dt><dd>{c.orders}</dd></div>
                <div><dt>Reserved value</dt><dd>{formatPrice(c.spent)}</dd></div>
                <div><dt>Joined</dt><dd>{formatDate(c.createdAt, { day: "numeric", month: "short", year: "numeric" })}</dd></div>
                <div><dt>Last seen</dt><dd>{c.lastLoginAt ? relativeTime(c.lastLoginAt) : "—"}</dd></div>
              </dl>
              {(c.phone || c.address) && <p className="cust__contact">{[c.phone, c.address].filter(Boolean).join(" · ")}</p>}
              <footer className="cust__foot">
                <Toggle checked={c.enabled} onChange={(v) => (v ? setEnabled(c, true) : setSuspending(c))} label={c.enabled ? "Active" : "Suspended"} />
                <Link to={`/admin/messages?c=${c.id}`} className="btn btn--sm"><MessageCircle size={14} strokeWidth={1.3} /> Message</Link>
              </footer>
            </motion.article>
          ))}
        </div>
      )}

      <Modal open={!!suspending} onClose={() => setSuspending(null)} eyebrow="Suspend account" title={`Suspend ${suspending?.fullName}?`}>
        <p className="muted">They'll be signed out immediately and won't be able to sign in until you reactivate the account. Their reservations and messages are kept.</p>
        <div className="modal__actions">
          <button className="btn" onClick={() => setSuspending(null)}>Keep active</button>
          <button className="btn btn--danger" onClick={() => setEnabled(suspending, false)}>Suspend</button>
        </div>
      </Modal>
    </div>
  );
}
