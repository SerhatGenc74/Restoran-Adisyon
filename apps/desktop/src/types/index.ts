export interface Table {
  id: string;
  name: string;
  capacity: number | null;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "OUT_OF_SERVICE";
  isActive: boolean;
  orders?: { id: string; orderNumber: number; status: string; total: number }[];
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  type: "FOOD" | "DRINK" | "OTHER";
  price: number;
  portions?: { id: string; portion: string; price: number }[];
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  portion: string;
  unitPrice: number;
  lineTotal: number;
  status: "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
  isComplimentary: boolean;
  note?: string;
  product?: Product;
}

export interface Payment {
  id: string;
  method: "CASH" | "CARD" | "OTHER";
  amount: number;
  createdAt: string;
}

export interface Order {
  id: string;
  tableId: string | null;
  orderNumber: number;
  status: "OPEN" | "IN_PREPARATION" | "READY" | "SERVED" | "PAID" | "CANCELLED";
  total: number;
  items: OrderItem[];
  payments: Payment[];
}

