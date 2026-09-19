import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
      <WifiOff className="h-4 w-4" />
      <span>Çevrimdışı Mod (Yerel)</span>
    </div>
  );
}
