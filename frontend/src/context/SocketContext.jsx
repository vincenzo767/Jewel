import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import { useAuth } from "./AuthContext";

const SocketContext = createContext({ connected: false, subscribe: () => () => {} });

/**
 * One STOMP connection per signed-in user. The handshake is authenticated by the session cookie;
 * the server pushes chat events to /user/queue/chat. Listeners register with subscribe().
 */
export function SocketProvider({ children }) {
  const { user } = useAuth();
  const listeners = useRef(new Set());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    const scheme = window.location.protocol === "https:" ? "wss" : "ws";
    const client = new Client({
      brokerURL: `${scheme}://${window.location.host}/ws`,
      reconnectDelay: 4000,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
      onConnect: () => {
        setConnected(true);
        client.subscribe("/user/queue/chat", (frame) => {
          let event;
          try { event = JSON.parse(frame.body); } catch { return; }
          listeners.current.forEach((fn) => fn(event));
        });
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    });
    client.activate();
    return () => { client.deactivate(); setConnected(false); };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useRef({
    subscribe: (fn) => { listeners.current.add(fn); return () => listeners.current.delete(fn); },
  }).current;

  return <SocketContext.Provider value={{ ...value, connected }}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

export function useChatEvents(handler) {
  const { subscribe } = useSocket();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => subscribe((e) => ref.current(e)), [subscribe]);
}
