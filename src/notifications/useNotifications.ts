import { useEffect, useRef, useState } from "react";
import { notificationsApi, type AppNotification } from "../api/notifications";

/** Polls the notification center; reports notifications that arrived since the last poll. */
export function useNotifications(onNew: (n: AppNotification) => void, intervalMs = 8_000) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const seen = useRef<Set<string> | null>(null);
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const list = await notificationsApi.list();
        if (!alive) return;
        if (seen.current) for (const n of list) if (!seen.current.has(n.id) && !n.read) onNewRef.current(n);
        seen.current = new Set(list.map((n) => n.id));
        setItems(list);
      } catch {
        /* offline: keep the last list */
      }
    };
    void load();
    const t = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [intervalMs]);

  return { items, setItems };
}
