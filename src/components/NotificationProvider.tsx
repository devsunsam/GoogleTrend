"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface NotificationContextValue {
  permission: NotificationPermission;
  requestPermission: () => Promise<void>;
  notifyNewDraft: (title: string, draftId: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const lastSeenRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  const notifyNewDraft = useCallback(
    (title: string, draftId: string) => {
      if (permission !== "granted") return;
      new Notification("새 블로그 초안", {
        body: title,
        tag: draftId,
      });
    },
    [permission]
  );

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/drafts?status=pending");
        const data = await res.json();
        const latest = data.drafts?.[0];
        if (!latest) return;

        if (lastSeenRef.current && latest.id !== lastSeenRef.current) {
          notifyNewDraft(latest.title, latest.id);
        }
        lastSeenRef.current = latest.id;
      } catch {
        // ignore poll errors
      }
    };

    poll();
    const interval = setInterval(poll, 60_000);
    return () => clearInterval(interval);
  }, [notifyNewDraft]);

  return (
    <NotificationContext.Provider
      value={{ permission, requestPermission, notifyNewDraft }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
