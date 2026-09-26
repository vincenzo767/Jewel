import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, Boxes, Gem, MessagesSquare, Package, Plus, Users, Wallet } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { categoryLabel, compactPeso, firstName, formatDate, formatPrice, greeting, ORDER_STATUS } from "../../lib/format";
import { CountUp, EASE, Frame, PageLoader, StockBadge } from "../../components/ui";

function StockChart({ data }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.units));
  return (
    <div className="bars" role="img" aria-label={`Units in stock by category: ${data.map((d) => `${categoryLabel(d.category)} ${d.units}`).join(", ")}`}>
      {data.map((d, i) => (
        <div key={d.category} className="bars__row" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}>
          <span className="bars__label">{categoryLabel(d.category)}</span>
          <span className="bars__track">
            <motion.span className="bars__fill" initial={{ width: 0 }} whileInView={{ width: `${(d.units / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE, delay: i * 0.1 }} />
            {hover === i && (
              <motion.span className="bars__tip" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                <strong>{categoryLabel(d.category)}</strong>
                <span>{d.units} units · {d.products} pieces</span>
                <span>{formatPrice(d.value)} at retail</span>
              </motion.span>
            )}
          </span>
          <span className="bars__value">{d.units}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState(null);

  const load = () => api.get("/admin/stats").then(({ data }) => setStats(data));
  useEffect(() => { document.title = "Dashboard — Bryle's Diamonds Admin"; load().catch(() => setStats(false)); }, []);

  const restock = async (p, add) => {
    try {
      await api.patch(`/admin/products/${p.id}/stock`, { stock: p.stock + add });
      toast(`${p.name} restocked to ${p.stock + add}`);
      load();
    } catch (e) { toast(errorMessage(e), "error"); }
  };

  if (stats === null) return <PageLoader inline />;
  if (stats === false) return <p className="muted">We couldn't load the dashboard. Please refresh.</p>;

  const kpis = [
    [Gem, "Pieces published", stats.activeProducts, `${stats.products} in catalogue`, "/admin/products"],
    [Boxes, "Units in stock", stats.totalUnits, `${stats.lowStock} low · ${stats.soldOut} sold out`, "/admin/inventory"],
    [Wallet, "Inventory value", stats.inventoryValue, "At current retail prices", "/admin/inventory", compactPeso],
    [Package, "Open reservations", stats.openOrders, `${stats.pendingOrders} awaiting confirmation`, "/admin/orders"],
    [Users, "Customers", stats.customers, "Registered clients", "/admin/customers"],
    [MessagesSquare, "Unread messages", stats.unreadMessages, "From customers", "/admin/messages"],
  ];

  return (
    <div className="dash">
      <motion.section className="dash-hero" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE }}>
        <div>
          <span className="eyebrow eyebrow--light">{greeting()}, {firstName(user.fullName)}</span>
          <h2>The house <em>today.</em></h2>
          <p>{stats.pendingOrders > 0 ? `${stats.pendingOrders} reservation${stats.pendingOrders > 1 ? "s" : ""} waiting for your confirmation.` : "Every reservation is up to date."} {stats.unreadMessages > 0 ? `${stats.unreadMessages} unread message${stats.unreadMessages > 1 ? "s" : ""}.` : ""}</p>
        </div>
        <div className="dash-hero__revenue">
          <span className="eyebrow eyebrow--light">Completed sales</span>
          <strong><CountUp value={stats.revenue} format={compactPeso} /></strong>
          <div className="dash-hero__actions">
            <Link to="/admin/products/new" className="btn btn--gold btn--sm"><Plus size={14} strokeWidth={1.5} /> New piece</Link>
            <Link to="/admin/orders" className="btn btn--light btn--sm">Reservations</Link>
          </div>
        </div>
      </motion.section>

      <div className="kpis">
        {kpis.map(([Icon, label, value, sub, to, fmt], i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.06 }}>
            <Link to={to} className="kpi">
              <span className="kpi__icon"><Icon size={18} strokeWidth={1.2} /></span>
              <span className="kpi__label">{label}</span>
              <strong className="kpi__value"><CountUp value={value} format={fmt} /></strong>
              <span className="kpi__sub">{sub}</span>
              <ArrowUpRight className="kpi__arrow" size={16} strokeWidth={1.2} />
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="dash-grid">
        <section className="panel">
          <header className="panel__head">
            <div><span className="eyebrow">Inventory</span><h3>Units in stock by category</h3></div>
            <Link to="/admin/inventory" className="link-line">Manage <span className="arrow" /></Link>
          </header>
          <StockChart data={stats.byCategory} />
          <table className="sr-only">
            <caption>Units in stock by category</caption>
            <thead><tr><th>Category</th><th>Units</th><th>Pieces</th><th>Retail value</th></tr></thead>
            <tbody>{stats.byCategory.map((d) => <tr key={d.category}><td>{categoryLabel(d.category)}</td><td>{d.units}</td><td>{d.products}</td><td>{formatPrice(d.value)}</td></tr>)}</tbody>
          </table>
        </section>

        <section className="panel">
          <header className="panel__head">
            <div><span className="eyebrow">Needs attention</span><h3>Low & sold out</h3></div>
            <AlertTriangle size={18} strokeWidth={1.2} className="panel__warn" />
          </header>
          {stats.lowStockProducts.length === 0 ? <p className="muted">Everything is well stocked.</p> : (
            <ul className="low-list">
              {stats.lowStockProducts.map((p) => (
                <li key={p.id}>
                  <Frame src={p.images[0]} alt="" className="low-list__img" />
                  <div className="low-list__body">
                    <Link to={`/admin/products/${p.id}`}>{p.name}</Link>
                    <StockBadge stock={p.stock} />
                  </div>
                  <div className="low-list__actions">
                    <button className="btn btn--sm" onClick={() => restock(p, 1)}>+1</button>
                    <button className="btn btn--sm btn--emerald" onClick={() => restock(p, 5)}>+5</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel panel--wide">
          <header className="panel__head">
            <div><span className="eyebrow">Latest</span><h3>Recent reservations</h3></div>
            <Link to="/admin/orders" className="link-line">View all <span className="arrow" /></Link>
          </header>
          {stats.recentOrders.length === 0 ? <p className="muted">No reservations yet — they'll appear here as customers reserve pieces.</p> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Reference</th><th>Customer</th><th>Pieces</th><th>Placed</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {stats.recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td><Link to="/admin/orders" className="serif-cell">{o.reference}</Link></td>
                      <td>{o.customerName}</td>
                      <td>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                      <td>{formatDate(o.createdAt)}</td>
                      <td>{formatPrice(o.total)}</td>
                      <td><span className={`chip chip--${ORDER_STATUS[o.status].tone}`}><i />{ORDER_STATUS[o.status].short}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
