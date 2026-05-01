import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getSession } from '@/lib/auth';

export type CustomerNotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  href?: string;
};

const MAX_ITEMS = 40;

const storageKey = (userKey: string) => `localyse.customerNotifications.${userKey}`;

type CustomerNotificationsContextValue = {
  items: CustomerNotificationItem[];
  push: (item: { title: string; body: string; href?: string; read?: boolean }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  unreadCount: number;
};

const CustomerNotificationsContext = createContext<CustomerNotificationsContextValue | null>(null);

export const CustomerNotificationsProvider = ({ children }: { children: ReactNode }) => {
  const session = getSession();
  const userKey = String(session?.email || session?._id || 'guest');

  const [items, setItems] = useState<CustomerNotificationItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(userKey));
      setItems(raw ? (JSON.parse(raw) as CustomerNotificationItem[]) : []);
    } catch {
      setItems([]);
    }
  }, [userKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(userKey), JSON.stringify(items));
    } catch {
      /* ignore quota */
    }
  }, [items, userKey]);

  const push = useCallback((n: { title: string; body: string; href?: string; read?: boolean }) => {
    const item: CustomerNotificationItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      createdAt: Date.now(),
      read: n.read ?? false,
      title: n.title,
      body: n.body,
      href: n.href,
    };
    setItems((prev) => [item, ...prev].slice(0, MAX_ITEMS));
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const clearAll = useCallback(() => setItems([]), []);

  const value = useMemo<CustomerNotificationsContextValue>(
    () => ({
      items,
      push,
      markRead,
      markAllRead,
      dismiss,
      clearAll,
      unreadCount: items.filter((x) => !x.read).length,
    }),
    [items, push, markRead, markAllRead, dismiss, clearAll]
  );

  return (
    <CustomerNotificationsContext.Provider value={value}>{children}</CustomerNotificationsContext.Provider>
  );
};

export const useCustomerNotifications = () => {
  const ctx = useContext(CustomerNotificationsContext);
  if (!ctx) {
    throw new Error('useCustomerNotifications must be used within CustomerNotificationsProvider');
  }
  return ctx;
};
