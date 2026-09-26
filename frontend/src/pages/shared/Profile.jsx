import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Heart, KeyRound, LogOut, MapPin, MessageCircle, Package, ShieldCheck, ShoppingBag, Trash2, UserRound } from "lucide-react";
import { api, errorMessage, fieldErrors, uploadImage } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useCurtain } from "../../components/Curtain";
import { Avatar, CountUp, EASE, Field, Spinner } from "../../components/ui";
import { compactPeso, formatDate } from "../../lib/format";

const PASSWORD_OK = (p) => p.length >= 8 && p.length <= 72 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);

function DetailsForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ fullName: user.fullName || "", phone: user.phone || "", address: user.address || "", bio: user.bio || "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const dirty = form.fullName !== (user.fullName || "") || form.phone !== (user.phone || "") || form.address !== (user.address || "") || form.bio !== (user.bio || "");
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.put("/profile", form);
      setUser(data);
      toast("Your details have been saved");
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="profile-form" onSubmit={save} noValidate>
      <div className="form-grid">
        <Field label="Full name" value={form.fullName} onChange={set("fullName")} error={errors.fullName} maxLength={80} autoComplete="name" />
        <Field label="Email address" value={user.email} disabled hint="Contact the shop to change your sign-in email." />
        <Field label="Mobile number" type="tel" value={form.phone} onChange={set("phone")} error={errors.phone} maxLength={20} autoComplete="tel" />
        <Field label="Address" value={form.address} onChange={set("address")} error={errors.address} maxLength={255} autoComplete="street-address" />
        <Field className="full" as="textarea" label={user.role === "ADMIN" ? "About you" : "Style notes for our jewellers (ring size, metals you love…)"} value={form.bio} onChange={set("bio")} error={errors.bio} maxLength={400} rows={3} />
      </div>
      <div className="profile-form__foot">
        <span className="muted">{dirty ? "You have unsaved changes." : "All changes saved."}</span>
        <button className="btn btn--solid" disabled={!dirty || busy}>{busy ? <><Spinner /> Saving</> : "Save changes"}</button>
      </div>
    </form>
  );
}

function SecurityForm() {
  const toast = useToast();
  const { logout } = useAuth();
  const play = useCurtain();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.currentPassword) errs.currentPassword = "Please enter your current password.";
    if (!PASSWORD_OK(form.newPassword)) errs.newPassword = "8–72 characters with upper and lower case, a number and a symbol.";
    if (form.confirm !== form.newPassword) errs.confirm = "Passwords don't match.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api.post("/profile/password", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      toast("Password updated. Other devices have been signed out.");
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const signOutEverywhere = () => play(async () => { await logout(); navigate("/auth", { replace: true }); }, "Signed out everywhere");

  return (
    <div className="security">
      <form className="profile-form" onSubmit={save} noValidate>
        <h3 className="profile-form__title"><KeyRound size={18} strokeWidth={1.2} /> Change password</h3>
        <div className="form-grid">
          <Field className="full" label="Current password" type="password" value={form.currentPassword} onChange={set("currentPassword")} error={errors.currentPassword} autoComplete="current-password" maxLength={72} />
          <Field label="New password" type="password" value={form.newPassword} onChange={set("newPassword")} error={errors.newPassword} autoComplete="new-password" maxLength={72} hint="Upper & lower case, a number and a symbol." />
          <Field label="Confirm new password" type="password" value={form.confirm} onChange={set("confirm")} error={errors.confirm} autoComplete="new-password" maxLength={72} />
        </div>
        <div className="profile-form__foot">
          <span className="muted">Changing your password signs out every other device.</span>
          <button className="btn btn--solid" disabled={busy}>{busy ? <><Spinner /> Updating</> : "Update password"}</button>
        </div>
      </form>
      <div className="security__card">
        <ShieldCheck size={26} strokeWidth={1} />
        <div>
          <h4>Sessions</h4>
          <p className="muted">Your session is stored in a secure, HttpOnly cookie that scripts can't read. Signing out revokes it on every device at once.</p>
          <button className="btn btn--danger btn--sm" onClick={signOutEverywhere}><LogOut size={14} strokeWidth={1.3} /> Sign out of all devices</button>
        </div>
      </div>
    </div>
  );
}

export default function Profile({ admin = false }) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("details");
  const [stats, setStats] = useState(null);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef(null);

  useEffect(() => {
    document.title = "Profile — Bryle's Diamonds";
    if (!admin) api.get("/profile/stats").then(({ data }) => setStats(data)).catch(() => {});
  }, [admin]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast("Please choose an image under 5 MB.", "error"); return; }
    setUploading(1);
    try {
      const data = await uploadImage("/profile/avatar", file, (p) => setUploading(Math.max(1, p)));
      setUser(data);
      toast("Profile photo updated");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setUploading(0);
    }
  };

  const removeAvatar = async () => {
    try {
      const { data } = await api.delete("/profile/avatar");
      setUser(data);
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  };

  const tiles = stats ? [
    [Heart, "Saved pieces", stats.favorites, "/favorites"],
    [ShoppingBag, "In your bag", stats.cartItems, "/cart"],
    [Package, "Reservations", stats.orders, "/orders"],
    [MessageCircle, "Unread messages", stats.unreadMessages, "/chat"],
  ] : [];

  const TABS = [["details", "Personal details", UserRound], ["security", "Security", KeyRound]];

  return (
    <div className={`profile ${admin ? "profile--admin" : ""}`}>
      <section className="profile-hero">
        <div className="container profile-hero__inner">
          <motion.div className="profile-hero__avatar" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.9, ease: EASE }}>
            <Avatar name={user.fullName} src={user.avatarUrl} size={128} />
            <button className="profile-hero__cam" onClick={() => fileRef.current?.click()} aria-label="Change profile photo" disabled={!!uploading}>
              {uploading ? <span className="profile-hero__pct">{uploading}%</span> : <Camera size={18} strokeWidth={1.3} />}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={onFile} />
          </motion.div>
          <div className="profile-hero__text">
            <motion.span className="eyebrow eyebrow--light" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              {admin ? "Owner · Administrator" : "Client of the house"} · since {formatDate(user.createdAt, { month: "long", year: "numeric" })}
            </motion.span>
            <h1 className="split__line"><motion.span style={{ display: "block" }} initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: EASE, delay: 0.15 }}>{user.fullName}</motion.span></h1>
            <p>{user.email}{user.address ? <> · <MapPin size={13} strokeWidth={1.3} style={{ verticalAlign: "-2px" }} /> {user.address}</> : null}</p>
            {user.avatarUrl && <button className="text-btn profile-hero__remove" onClick={removeAvatar}><Trash2 size={12} strokeWidth={1.3} /> Remove photo</button>}
          </div>
          {!admin && stats && (
            <motion.div className="profile-hero__spent" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.9, ease: EASE }}>
              <span className="eyebrow eyebrow--light">Reserved with us</span>
              <strong><CountUp value={stats.spent} format={compactPeso} /></strong>
            </motion.div>
          )}
        </div>
      </section>

      <div className="container profile__body">
        {!admin && (
          <div className="profile-tiles">
            {tiles.map(([Icon, label, value, to], k) => (
              <motion.div key={label} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + k * 0.08, duration: 0.8, ease: EASE }}>
                <Link to={to} className="profile-tile">
                  <Icon size={20} strokeWidth={1.1} />
                  <strong><CountUp value={value} /></strong>
                  <span>{label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <div className="tabs profile__tabs" role="tablist">
          {TABS.map(([k, label, Icon]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? "is-active" : ""}`} onClick={() => setTab(k)}>
              <Icon size={14} strokeWidth={1.3} /> {label}
              {tab === k && <motion.span layoutId="profile-tab" className="tab__line" />}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease: EASE }}>
            {tab === "details" ? <DetailsForm /> : <SecurityForm />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
