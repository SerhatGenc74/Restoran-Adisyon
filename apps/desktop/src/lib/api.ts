import axios from "axios";
import { useAuthStore } from "../store/auth.js";
import { toast } from "sonner";
import type { ApiErrorResponse } from "@adisyon/shared";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000"
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data) {
      const paginatedKeys = ['products', 'categories', 'tables', 'users', 'orders'];
      for (const key of paginatedKeys) {
        if (response.data[key] && Array.isArray(response.data[key].data)) {
          response.data[key] = response.data[key].data;
        }
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    
    // Global Error Handling
    if (error.response?.data) {
      const errData = error.response.data as ApiErrorResponse;
      if (errData.isBusinessError) {
        toast.error(errData.message || "İşlem reddedildi.");
      } else {
        toast.error(`Sistem hatası (TraceID: ${errData.traceId || "Bilinmiyor"})`);
      }
    } else {
      toast.error("Sunucuya ulaşılamıyor veya ağ hatası oluştu.");
    }
    
    return Promise.reject(error);
  }
);
