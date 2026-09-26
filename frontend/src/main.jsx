import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { SocketProvider } from "./context/SocketContext";
import { CurtainProvider } from "./components/Curtain";
import "./styles/base.css";
import "./styles/auth.css";
import "./styles/customer.css";
import "./styles/chat.css";
import "./styles/admin.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename="/app">
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <AuthProvider>
            <SocketProvider>
              <CurtainProvider>
                <App />
              </CurtainProvider>
            </SocketProvider>
          </AuthProvider>
        </ToastProvider>
      </MotionConfig>
    </BrowserRouter>
  </React.StrictMode>
);
