import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Home, LogOut, MapPin, MessageCircle, Package, Search, ShoppingBag, Sparkles, User, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useShop } from "../context/ShopContext";
import { useCurtain } from "../components/Curtain";
import PageTransition from "../components/PageTransition";
import { Avatar, Badge, EASE } from "../components/ui";
import { SHOP } from "../lib/format";

function SearchOverlay({ open, onClose }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const input = useRef(null);
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 250); else setQ(""); }, [open]);
  const submit = (e) => {
    e.preventDefault();
    onClose();
    navigate(`/shop${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };
  const suggestions = ["Diamond", "Pearl", "Gold hoops", "Sapphire", "Bridal", "Tennis bracelet"];
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="search-overlay" initial={{ clipPath: "inset(0 0 100% 0)" }} animate={{ clipPath: "inset(0 0 0% 0)" }} exit={{ clipPath: "inset(0 0 100% 0)" }} transition={{ duration: 0.7, ease: EASE }}>
          <button className="icon-btn search-overlay__close" onClick={onClose} aria-label="Close search"><X size={22} strokeWidth={1.1} /></button>
          <form onSubmit={submit} className="container search-overlay__form">
            <motion.span className="eyebrow eyebrow--light" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>Search the collection</motion.span>
            <motion.input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="What are you looking for?" maxLength={60}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8, ease: EASE }} />
            <motion.div className="search-overlay__tags" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              {suggestions.map((s) => (
                <button type="button" key={s} onClick={() => { onClose(); navigate(`/shop?q=${encodeURIComponent(s)}`); }}>{s}</button>
              ))}
            </motion.div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const play = useCurtain();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const signOut = () => { setOpen(false); play(async () => { await logout(); navigate("/auth", { replace: true }); }, "Until next time"); };
  return (
    <div className="account" ref={ref}>
      <button className="account__btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Account menu">
        <Avatar name={user.fullName} src={user.avatarUrl} size={34} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="account__menu" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.3, ease: EASE }}>
            <div className="account__head">
              <Avatar name={user.fullName} src={user.avatarUrl} size={44} />
              <div><strong>{user.fullName}</strong><small>{user.email}</small></div>
            </div>
            <Link to="/profile" onClick={() => setOpen(false)}><User size={16} strokeWidth={1.2} /> My profile</Link>
            <Link to="/orders" onClick={() => setOpen(false)}><Package size={16} strokeWidth={1.2} /> Reservations</Link>
            <Link to="/favorites" onClick={() => setOpen(false)}><Heart size={16} strokeWidth={1.2} /> Favourites</Link>
            <Link to="/visit" onClick={() => setOpen(false)}><MapPin size={16} strokeWidth={1.2} /> Visit the shop</Link>
            <button onClick={signOut}><LogOut size={16} strokeWidth={1.2} /> Sign out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CustomerLayout() {
  const { cart, favorites, unread, bump } = useShop();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const lastY = useRef(0);
  const overHero = location.pathname === "/home";
  const onChat = location.pathname === "/chat";

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > 380 && y > lastY.current);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); setHidden(false); }, [location.pathname]);

  const navClass = `cnav ${overHero && !scrolled ? "cnav--over" : ""} ${scrolled ? "is-scrolled" : ""} ${hidden && !searchOpen ? "is-hidden" : ""}`;

  return (
    <div className={`customer ${onChat ? "customer--chat" : ""}`}>
      <header className={navClass}>
        <nav className="cnav__left" aria-label="Main">
          <NavLink to="/home" className="cnav__link">Home</NavLink>
          <NavLink to="/shop" className="cnav__link">Shop</NavLink>
          <NavLink to="/visit" className="cnav__link">Visit Us</NavLink>
        </nav>
        <Link to="/home" className="logo cnav__logo" aria-label="Bryle's Diamonds home">
          <span className="logo__main">Bryle's <em>Diamonds</em></span>
          <span className="logo__sub">Jewelry Shop · Cebu</span>
        </Link>
        <div className="cnav__right">
          <button className="icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search"><Search size={19} strokeWidth={1.2} /></button>
          <NavLink to="/chat" className="icon-btn hide-mobile" aria-label={`Chat${unread ? `, ${unread} unread` : ""}`}><MessageCircle size={19} strokeWidth={1.2} /><Badge count={unread} className="badge--burgundy" /></NavLink>
          <NavLink to="/favorites" className="icon-btn hide-mobile" aria-label="Favourites"><Heart size={19} strokeWidth={1.2} /><Badge count={favorites.size} /></NavLink>
          <NavLink to="/cart" className="icon-btn" aria-label={`Bag, ${cart.count} items`}>
            <motion.span key={bump} animate={bump ? { scale: [1, 1.3, 1], rotate: [0, -8, 0] } : {}} transition={{ duration: 0.5 }} style={{ display: "grid" }}>
              <ShoppingBag size={19} strokeWidth={1.2} />
            </motion.span>
            <Badge count={cart.count} />
          </NavLink>
          <AccountMenu />
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <main className="customer__main">
        <PageTransition />
      </main>

      {!onChat && (
        <footer className="cfooter">
          <div className="container">
            <div className="cfooter__word" aria-hidden="true">Bryle's <em>D</em>iamonds</div>
            <div className="cfooter__row">
              <span>© 2026 {SHOP.legalName}</span>
              <span>{SHOP.address}</span>
              <span>{SHOP.phone}</span>
              <a href={`mailto:${SHOP.email}`} className="text-btn">{SHOP.email}</a>
              <a href="/privacy.html" className="text-btn">Privacy Policy</a>
              <a href="/terms.html" className="text-btn">Terms of Service</a>
              <a href="/" className="text-btn">Back to the landing page</a>
            </div>
          </div>
        </footer>
      )}

      <AnimatePresence>
        {!onChat && (
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.6 }} className="chat-fab-wrap">
            <Link to="/chat" className="chat-fab" aria-label="Chat with the shop">
              <MessageCircle size={22} strokeWidth={1.3} />
              <span className="chat-fab__label">Ask a jeweller</span>
              <Badge count={unread} className="badge--burgundy" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="tabbar" aria-label="Quick navigation">
        {[
          ["/home", Home, "Home"],
          ["/shop", Sparkles, "Shop"],
          ["/favorites", Heart, "Saved", favorites.size],
          ["/cart", ShoppingBag, "Bag", cart.count],
          ["/profile", User, "Me"],
        ].map(([to, Icon, label, count]) => (
          <NavLink key={to} to={to} className="tabbar__item">
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="tabbar-pill" className="tabbar__pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className="tabbar__icon"><Icon size={20} strokeWidth={isActive ? 1.5 : 1.2} /><Badge count={count} /></span>
                <span className="tabbar__label">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
