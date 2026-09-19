import { useEffect, useState, useRef } from "react";
import { Terminal, X, WifiOff, Wifi } from "lucide-react";

interface LogEntry {
  time: string;
  traceId: string;
  url: string;
  method: string;
  statusCode: number;
  code: string;
  originalMessage: string;
  isBusinessError: boolean;
  stack?: string;
}

export function DevConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Shift + L toggles console
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "l") {
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      let wsUrl = (import.meta.env.VITE_API_URL || "http://127.0.0.1:3000").replace("http", "ws") + "/dev-logs";
      // Ensure localhost is explicitly 127.0.0.1 to avoid IPv6 issues
      wsUrl = wsUrl.replace("localhost", "127.0.0.1");
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => setConnected(false);
      ws.onmessage = (event) => {
        try {
          const log = JSON.parse(event.data);
          setLogs((prev) => [...prev, log].slice(-100)); // Keep last 100 logs
        } catch (err) {
          console.error("Failed to parse dev log", err);
        }
      };
    }

    return () => {
      // We might want to keep the connection alive even when closed to capture logs in background, 
      // but for simplicity we can close it, or just leave it. 
      // Let's not close it on unmount so it keeps collecting while overlay is closed.
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-end justify-center p-4 sm:p-8 backdrop-blur-sm">
      <div className="bg-slate-950 w-full h-[60vh] rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8">
        {/* Header */}
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Terminal size={18} className="text-blue-400" />
            <h2 className="text-sm font-mono font-bold text-slate-200">DevConsole - Canlı API Logları</h2>
            <div className="flex items-center gap-1 text-xs font-mono ml-4 px-2 py-1 rounded bg-slate-800">
              {connected ? (
                <><Wifi size={12} className="text-green-400" /><span className="text-green-400">Canlı</span></>
              ) : (
                <><WifiOff size={12} className="text-red-400" /><span className="text-red-400">Bağlantı Yok</span></>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setLogs([])} className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 font-mono transition-colors">Temizle</button>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Log List */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 space-y-3">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic">Henüz hata logu yok.</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className={`p-3 rounded border ${log.isBusinessError ? 'bg-orange-950/30 border-orange-900/50' : 'bg-red-950/30 border-red-900/50'}`}>
                <div className="flex gap-4 mb-2 opacity-70">
                  <span>{new Date(log.time).toLocaleTimeString()}</span>
                  <span className="text-blue-400">{log.method} {log.url}</span>
                  <span className={log.statusCode >= 500 ? 'text-red-400' : 'text-orange-400'}>{log.statusCode}</span>
                  <span className="text-slate-500">TraceID: {log.traceId}</span>
                </div>
                <div className="font-bold text-slate-200 mb-1">
                  [{log.code}] {log.originalMessage}
                </div>
                {log.stack && (
                  <pre className="mt-2 p-2 bg-slate-900/50 rounded overflow-x-auto text-[10px] text-red-300/80">
                    {log.stack}
                  </pre>
                )}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
