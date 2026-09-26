import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Boxes, ExternalLink, Gem, LayoutDashboard, LogOut, Menu, MessagesSquare, Package, Plus, UserRound, Users, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useChatEvents, useSocket } from "../context/SocketContext";
import { useToast } from "../context/ToastContext";
import { useCurtain } from "../components/Curtain";
import PageTransition from "../components/PageTransition";
import { Avatar, Badge, EASE } from "../components/ui";
import { api } from "../lib/api";
import { firstName, formatDate } from "../lib/format";

const TITLES = {
  "/admin": ["Overview", "Dashboard"],
  "/admin/products": ["Catalogue", "Jewellery"],
  "/admin/products/new": ["Catalogue", "New piece"],
  "/admin/inventory": ["Stock", "Inventory"],
  "/admin/orders": ["Pickups", "Reservations"],
  "/admin/customers": ["Clients", "Customers"],
  "/admin/messages": ["Inbox", "Messages"],
  "/admin/profile": ["Account", "Profile"],
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const toast = useToast();
  const play = useCurtain();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState({ unread: 0, pending: 0, lowStock: 0 });

  const refreshCounts = useCallback(() => {
    api.get("/admin/stats").then(({ data }) => setCounts({ unread: data.unreadMessages, pending: data.pendingOrders, lowStock: data.lowStock + data.soldOut })).catch(() => {});
  }, []);

  useEffect(() => { refreshCounts(); }, [refreshCounts, location.pathname]);
  useEffect(() => { setOpen(false); window.scrollTo({ top: 0, behavior: "instant" }); }, [location.pathname]);

  useChatEvents((e) => {
    if (e.type === "message" && !e.message.fromAdmin) {
      refreshCounts();
      if (!location.pathname.startsWith("/admin/messages")) toast(`New message from ${e.message.senderName}`);
    }
    if (e.type === "read-by-admin") refreshCounts();
  });

  const signOut = () => play(async () => { await logout(); navigate("/auth", { replace: true }); }, "Until next time");

  const nav = [
    ["/admin", LayoutDashboard, "Dashboard", 0, true],
    ["/admin/products", Gem, "Jewellery"],
    ["/admin/inventory", Boxes, "Inventory", counts.lowStock],
    ["/admin/orders", Package, "Reservations", counts.pending],
    ["/admin/customers", Users, "Customers"],
    ["/admin/messages", MessagesSquare, "Messages", counts.unread],
    ["/admin/profile", UserRound, "Profile"],
  ];

  const key = location.pathname.replace(/\/\d+$/, "/:id");
  const [eyebrow, title] = TITLES[location.pathname] || (key === "/admin/products/:id" ? ["Catalogue", "Edit piece"] : ["Admin", ""]);

  return (
    <div className="admin">
      <aside className={`side ${open ? "is-open" : ""}`}>
        <div className="side__top">
          <Link to="/admin" className="side__logo">
            <span className="side__mark">B·D</span>
            <span>
              <span className="logo__main">Bryle's <em>Diamonds</em></span>
              <span className="side__role">Owner's Atelier</span>
            </span>
          </Link>
          <button className="icon-btn side__close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} strokeWidth={1.2} /></button>
        </div>

        <Link to="/admin/products/new" className="side__cta"><Plus size={16} strokeWidth={1.4} /> Add a new piece</Link>

        <nav className="side__nav" aria-label="Admin">
          <span className="side__label">Manage</span>
          {nav.map(([to, Icon, label, count, end]) => (
            <NavLink key={to} to={to} end={end} className="side__link">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="side-active" className="side__active" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                  <Icon size={18} strokeWidth={1.2} />
                  <span>{label}</span>
                  {count > 0 && <span className="side__count">{count}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="side__foot">
          <a href="/" className="side__link side__link--muted" target="_blank" rel="noopener noreferrer"><ExternalLink size={16} strokeWidth={1.2} /><span>View landing page</span></a>
          <div className="side__me">
            <Avatar name={user.fullName} src={user.avatarUrl} size={40} />
            <div><strong>{user.fullName}</strong><small><i className={connected ? "is-live" : ""} /> {connected ? "Live" : "Connecting"}</small></div>
            <button className="icon-btn" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={17} strokeWidth={1.2} /></button>
          </div>
        </div>
      </aside>
      <AnimatePresence>{open && <motion.div className="side-scrim" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}</AnimatePresence>

      <div className="admin__main">
        <header className="topbar">
          <button className="icon-btn topbar__burger" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} strokeWidth={1.2} /></button>
          <div className="topbar__title">
            <motion.div key={title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
              <span className="eyebrow eyebrow--gold">{eyebrow}</span>
              <h1>{title}</h1>
            </motion.div>
          </div>
          <div className="topbar__right">
            <span className="topbar__date">{formatDate(new Date().toISOString(), { weekday: "long", day: "numeric", month: "long" })}</span>
            <Link to="/admin/messages" className="icon-btn icon-btn--ring" aria-label="Messages"><MessagesSquare size={18} strokeWidth={1.2} /><Badge count={counts.unread} className="badge--burgundy" /></Link>
            <Link to="/admin/profile" className="topbar__me" aria-label="Profile">
              <Avatar name={user.fullName} src={user.avatarUrl} size={38} />
              <span className="topbar__hello">Hello, {firstName(user.fullName)}</span>
            </Link>
          </div>
        </header>

        <main className="admin__content">
          <PageTransition context={{ refreshCounts }} />
        </main>
      </div>
    </div>
  );
}
