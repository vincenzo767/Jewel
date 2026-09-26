export const CATEGORIES = [
  { key: "RINGS", label: "Rings", image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80" },
  { key: "EARRINGS", label: "Earrings", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80" },
  { key: "NECKLACES", label: "Necklaces", image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80" },
  { key: "BRACELETS", label: "Bracelets", image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=900&q=80" },
];

export const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.label || key;

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
export const formatPrice = (n) => peso.format(Number(n || 0));

export const compactPeso = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000) return "₱" + (v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1) + "M";
  if (v >= 1_000) return "₱" + Math.round(v / 1_000) + "k";
  return formatPrice(v);
};

export const LOW_STOCK = 3;

export function stockInfo(stock) {
  if (stock <= 0) return { level: "out", label: "Sold out", short: "Sold out" };
  if (stock <= LOW_STOCK) return { level: "low", label: `Only ${stock} left`, short: `${stock} left` };
  return { level: "in", label: `In stock · ${stock} available`, short: "In stock" };
}

export const formatDate = (iso, opts = { day: "numeric", month: "short", year: "numeric" }) =>
  iso ? new Date(iso).toLocaleDateString("en-PH", opts) : "";

export const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }) : "";

export function relativeTime(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 86400 * 6) return `${Math.round(diff / 86400)}d ago`;
  return formatDate(iso, { day: "numeric", month: "short" });
}

export function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return formatDate(iso, { weekday: "long", day: "numeric", month: "long" });
}

export const firstName = (name = "") => name.trim().split(/\s+/)[0] || "";

export const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("");

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export const ORDER_STATUS = {
  PENDING: { label: "Awaiting confirmation", short: "Pending", tone: "gold" },
  CONFIRMED: { label: "Confirmed", short: "Confirmed", tone: "emerald" },
  READY_FOR_PICKUP: { label: "Ready for pickup", short: "Ready", tone: "emerald" },
  COMPLETED: { label: "Completed", short: "Completed", tone: "ink" },
  CANCELLED: { label: "Cancelled", short: "Cancelled", tone: "burgundy" },
};

export const ORDER_FLOW = ["PENDING", "CONFIRMED", "READY_FOR_PICKUP", "COMPLETED"];

export const SHOP = {
  name: "Bryle's Diamonds",
  address: "V. H. Garces St, Talisay City, Cebu 6045",
  phone: "+63 992 409 2298",
  email: "hello@brylesdiamonds.ph",
  lat: 10.2447,
  lng: 123.8494,
  directions: "https://www.google.com/maps/dir/?api=1&destination=V.+H.+Garces+St,+Talisay+City,+Cebu",
  hours: [
    ["Monday – Saturday", "10:00 – 19:00"],
    ["Sunday", "By appointment"],
  ],
};

export const PAYMENT_METHODS = [
  ["CASH", "Cash"],
  ["GCASH", "GCash"],
  ["MAYA", "Maya"],
  ["CARD", "Card"],
  ["BANK_TRANSFER", "Bank transfer"],
];
export const paymentLabel = (m) => PAYMENT_METHODS.find(([k]) => k === m)?.[1] || m;

/** "3 days", "5 hours" or "less than an hour" until the given time; null once it has passed. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!iso || Number.isNaN(ms) || ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  if (h >= 48) return `${Math.floor(h / 24)} days`;
  if (h >= 1) return `${h} hour${h === 1 ? "" : "s"}`;
  return "less than an hour";
}
