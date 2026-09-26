import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/session");
      setUser(data.authenticated ? data.user : null);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Any 401 from the API (expired or revoked session) signs the user out locally.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener("bd:unauthorized", onUnauthorized);
    return () => window.removeEventListener("bd:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch { /* the cookie is cleared server-side or already gone */ }
    setUser(null);
    // Fetch a fresh CSRF token for the next sign-in.
    api.get("/auth/session").catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ user, ready, isAdmin: user?.role === "ADMIN", setUser, login, register, logout, refresh }),
    [user, ready, login, register, logout, refresh]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
