import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { api, errorMessage } from "../lib/api";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { useChatEvents } from "./SocketContext";

const ShopContext = createContext(null);

/** Customer-side shared state: cart, favourites and unread chat count. */
export function ShopProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [cart, setCart] = useState({ items: [], count: 0, subtotal: 0 });
  const [favorites, setFavorites] = useState(new Set());
  const [unread, setUnread] = useState(0);
  const [bump, setBump] = useState(0);
  const isCustomer = user?.role === "CUSTOMER";

  const loadCart = useCallback(async () => {
    const { data } = await api.get("/cart");
    setCart(data);
  }, []);

  useEffect(() => {
    if (!isCustomer) return;
    loadCart().catch(() => {});
    api.get("/favorites").then(({ data }) => setFavorites(new Set(data.map((p) => p.id)))).catch(() => {});
    api.get("/chat/unread").then(({ data }) => setUnread(data.unread)).catch(() => {});
  }, [isCustomer, loadCart]);

  const onChatPage = location.pathname.endsWith("/chat");
  useChatEvents((e) => {
    if (e.type === "message" && e.message?.fromAdmin && !onChatPage) {
      setUnread((n) => n + 1);
      toast(`New message from ${e.message.senderName.split(" ")[0]} at the shop`);
    }
  });

  const addToCart = useCallback(async (product, quantity = 1, size = null) => {
    try {
      const { data } = await api.post("/cart", { productId: product.id, quantity, size });
      setCart(data);
      setBump((b) => b + 1);
      toast(`${product.name} added to your bag`);
      return true;
    } catch (e) {
      toast(errorMessage(e), "error");
      return false;
    }
  }, [toast]);

  const updateQuantity = useCallback(async (itemId, quantity) => {
    try {
      const { data } = await api.patch(`/cart/${itemId}`, { quantity });
      setCart(data);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }, [toast]);

  const removeItem = useCallback(async (itemId) => {
    const { data } = await api.delete(`/cart/${itemId}`);
    setCart(data);
  }, []);

  const toggleFavorite = useCallback(async (product) => {
    const on = !favorites.has(product.id);
    setFavorites((s) => { const n = new Set(s); on ? n.add(product.id) : n.delete(product.id); return n; });
    try {
      if (on) await api.post(`/favorites/${product.id}`);
      else await api.delete(`/favorites/${product.id}`);
      toast(on ? `${product.name} saved to favourites` : "Removed from favourites");
    } catch (e) {
      setFavorites((s) => { const n = new Set(s); on ? n.delete(product.id) : n.add(product.id); return n; });
      toast(errorMessage(e), "error");
    }
    return on;
  }, [favorites, toast]);

  const value = useMemo(() => ({
    cart, setCart, loadCart, addToCart, updateQuantity, removeItem, bump,
    favorites, isFavorite: (id) => favorites.has(id), toggleFavorite,
    unread, setUnread,
  }), [cart, loadCart, addToCart, updateQuantity, removeItem, bump, favorites, toggleFavorite, unread]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export const useShop = () => useContext(ShopContext);
