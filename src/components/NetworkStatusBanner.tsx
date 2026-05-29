import { useEffect, useRef, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const showOnlinePulse = () => {
      setIsOnline(true);
      setVisible(true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setVisible(false), 3000);
    };

    const showOffline = () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      setIsOnline(false);
      setVisible(true);
    };

    window.addEventListener("online", showOnlinePulse);
    window.addEventListener("offline", showOffline);

    return () => {
      window.removeEventListener("online", showOnlinePulse);
      window.removeEventListener("offline", showOffline);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[70] flex justify-center px-4 pt-3 pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium shadow-lg backdrop-blur ${
          isOnline
            ? "border-emerald-200 bg-emerald-50/95 text-emerald-700"
            : "border-amber-200 bg-amber-50/95 text-amber-700"
        }`}
      >
        {isOnline ? <Wifi className="h-3.5 w-3.5" strokeWidth={1.75} /> : <WifiOff className="h-3.5 w-3.5" strokeWidth={1.75} />}
        {isOnline ? "Connection restored. You’re back online." : "You’re offline. Actions may fail until your connection returns."}
      </div>
    </div>
  );
}
