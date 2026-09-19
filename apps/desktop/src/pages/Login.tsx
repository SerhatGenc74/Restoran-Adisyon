import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuthStore } from "../store/auth.js";
import { toast } from "sonner";
import { ChefHat } from "lucide-react";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await api.post("/auth/login", { username, password });
      const { accessToken, user } = response.data;
      setAuth(accessToken, user);
      
      toast.success("Giris basarili!");
      
      switch (user.role) {
        case "WAITER": navigate("/waiter"); break;
        case "KITCHEN": navigate("/kitchen"); break;
        case "CASHIER": navigate("/cashier"); break;
        case "OWNER":
        case "ADMIN": navigate("/patron"); break;
        default: navigate("/login");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Giris yapilamadi. Bilgilerinizi kontrol edin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/10 p-4 rounded-full text-primary mb-4">
            <ChefHat size={48} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Corbaci Adisyon</h1>
          <p className="text-slate-500 text-sm mt-1">Sisteme giris yapin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kullanici Adi</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="admin"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-70"
          >
            {isLoading ? "Giris yapiliyor..." : "Giris Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
