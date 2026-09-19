import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ProtectedRoute } from "./components/ProtectedRoute.js";
import { NetworkStatus } from "./components/NetworkStatus.js";
import { Login } from "./pages/Login.js";
import { WaiterScreen } from "./pages/WaiterScreen.js";
import { KitchenScreen } from "./pages/KitchenScreen.js";
import { CashierScreen } from "./pages/CashierScreen.js";
import { PatronScreen } from "./pages/PatronScreen.js";
import { useAuthStore } from "./store/auth.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { DevConsole } from "./components/DevConsole.js";

const queryClient = new QueryClient();

function Unauthorized() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-4">
      <h1 className="text-3xl font-bold text-slate-800">Yetkiniz Yok</h1>
      <p className="text-slate-600">Bu sayfayı görüntüleme yetkiniz bulunmamaktadır. ({user?.role})</p>
      <button onClick={() => { logout(); queryClient.clear(); }} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
        Farklı Hesapla Giriş Yap
      </button>
    </div>
  );
}

function RootRedirect() {
  const user = useAuthStore((state) => state.user);
  
  if (!user) {
    queryClient.clear();
    return <Navigate to="/login" replace />;
  }
  
  switch (user.role) {
    case "WAITER": return <Navigate to="/waiter" replace />;
    case "KITCHEN": return <Navigate to="/kitchen" replace />;
    case "CASHIER": return <Navigate to="/cashier" replace />;
    case "OWNER":
    case "ADMIN": return <Navigate to="/patron" replace />;
    default: return <Navigate to="/login" replace />;
  }
}

export function App() {
  // Also clear cache whenever a user explicitly logs out and redirects to /login via ProtectedRoute
  const user = useAuthStore((state) => state.user);
  if (!user) {
    queryClient.clear();
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <NetworkStatus />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            <Route element={<ProtectedRoute allowedRoles={["WAITER", "OWNER", "ADMIN"]} />}>
              <Route path="/waiter" element={<WaiterScreen />} />
            </Route>
            
            <Route element={<ProtectedRoute allowedRoles={["KITCHEN", "OWNER", "ADMIN"]} />}>
              <Route path="/kitchen" element={<KitchenScreen />} />
            </Route>
            
            <Route element={<ProtectedRoute allowedRoles={["CASHIER", "OWNER", "ADMIN"]} />}>
              <Route path="/cashier" element={<CashierScreen />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["OWNER", "ADMIN"]} />}>
              <Route path="/patron" element={<PatronScreen />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
        <DevConsole />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
