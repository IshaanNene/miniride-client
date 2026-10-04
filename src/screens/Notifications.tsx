import { useNavigate, useParams } from "react-router";
import { notificationsApi } from "../api/notifications";
import { routeDeepLink } from "../notifications/router";
import { useNotifications } from "../notifications/useNotifications";

export function Notifications() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { items, setItems } = useNotifications(() => undefined, 5_000);
  const shown = id ? items.filter((n) => n.id === id) : items;

  return (
    <section className="card">
      <h1>Notifications</h1>
      {shown.length === 0 && <p className="muted">You're all caught up.</p>}
      <ul className="notifications">
        {shown.map((n) => (
          <li key={n.id} className={n.read ? "read" : "unread"}>
            <button
              data-testid="notification"
              onClick={() => {
                setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                void notificationsApi.markRead(n.id).catch(() => undefined);
                void routeDeepLink(n.deepLink, navigate, "in_app");
              }}
            >
              <strong>{n.title}</strong>
              <span>{n.body}</span>
              <time className="muted">{new Date(n.createdAt).toLocaleTimeString()}</time>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
