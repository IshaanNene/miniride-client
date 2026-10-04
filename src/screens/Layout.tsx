import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router";
import type { AppNotification } from "../api/notifications";
import { config } from "../config";
import { routeDeepLink } from "../notifications/router";
import { useNotifications } from "../notifications/useNotifications";
import { useSession } from "../store/session";

export function Layout() {
  const navigate = useNavigate();
  const hydrated = useSession((s) => s.hydrated);
  const [toast, setToast] = useState<AppNotification | null>(null);
  const { items } = useNotifications((n) => setToast(n));
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">MiniRide</Link>
        <Link to="/notifications" className="bell" aria-label={`Notifications (${unread} unread)`}>
          🔔{unread > 0 && <span className="badge" data-testid="unread-count">{unread}</span>}
        </Link>
      </header>
      <main>{hydrated ? <Outlet /> : <p className="muted">Restoring your session…</p>}</main>
      {toast && (
        <button
          className="toast"
          data-testid="push-toast"
          onClick={() => {
            const link = toast.deepLink;
            setToast(null);
            void routeDeepLink(link, navigate, "in_app");
          }}
        >
          <strong>{toast.title}</strong>
          <span>{toast.body}</span>
        </button>
      )}
      <footer className="muted">v{config.appVersion}</footer>
    </div>
  );
}
