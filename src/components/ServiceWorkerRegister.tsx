"use client";

import { useEffect } from "react";

// Registra el service worker de la PWA (instalable en Android/iOS).
// Solo en contextos seguros: producción (HTTPS) o localhost.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("CoreTextil: SW no registrado:", err));
  }, []);

  return null;
}
