import { z } from "zod";

export const userRoleSchema = z.enum([
  "WAITER",
  "KITCHEN",
  "CASHIER",
  "OWNER",
  "ADMIN"
]);

export const loginRequestSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1)
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const entityIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sortOrder: z.number().int().min(0).optional()
});

export const categoryUpdateSchema = categoryCreateSchema.partial().extend({
  isActive: z.boolean().optional()
});

export const productTypeSchema = z.enum(["FOOD", "DRINK", "OTHER"]);

export const productPortionSchema = z.object({
  id: z.string().uuid().optional(),
  portion: z.string().trim().min(1).max(50),
  price: z.coerce.number().finite().nonnegative().max(9999999999.99)
});

export const productCreateSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  type: productTypeSchema,
  price: z.coerce.number().finite().nonnegative().max(9999999999.99),
  kitchenNote: z.string().trim().max(255).optional(),
  portions: z.array(productPortionSchema).optional()
});

export const productUpdateSchema = productCreateSchema.partial().extend({
  isActive: z.boolean().optional()
});

export const diningTableStatusSchema = z.enum([
  "AVAILABLE",
  "OCCUPIED",
  "RESERVED",
  "OUT_OF_SERVICE"
]);

export const tableStatusUpdateSchema = z.object({
  status: diningTableStatusSchema
});

export const tableCreateSchema = z.object({
  name: z.string().trim().min(1).max(40),
  capacity: z.coerce.number().int().positive().max(1000).optional()
});

export const orderItemCreateSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().finite().positive().max(9999999.999),
  portion: z.string().trim().max(50).optional().default("TAM"),
  isComplimentary: z.boolean().optional().default(false),
  complimentaryReason: z.string().trim().max(255).optional(),
  note: z.string().trim().max(500).optional()
});

export const orderCreateSchema = z.object({
  tableId: z.string().uuid().optional(),
  note: z.string().trim().max(500).optional(),
  items: z.array(orderItemCreateSchema).max(500).optional().default([])
});

export const orderItemUpdateSchema = z.object({
  quantity: z.coerce.number().finite().positive().max(9999999.999).optional(),
  portion: z.string().trim().max(50).optional(),
  isComplimentary: z.boolean().optional(),
  complimentaryReason: z.string().trim().max(255).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional()
});

export const orderItemStatusSchema = z.enum([
  "PENDING",
  "PREPARING",
  "READY",
  "SERVED",
  "CANCELLED"
]);

export const orderItemStatusUpdateSchema = z.object({
  status: orderItemStatusSchema
});

export const paymentMethodSchema = z.enum(["CASH", "CARD", "OTHER"]);

export const paymentCreateSchema = z.object({
  method: paymentMethodSchema,
  amount: z.coerce.number().finite().positive().max(9999999999.99),
  transactionRef: z.string().trim().max(120).optional(),
  note: z.string().trim().max(255).optional()
});

export const paymentForOrderCreateSchema = paymentCreateSchema.extend({
  orderId: z.string().uuid()
});

export const dailyReportQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-MM-DD biçiminde olmalıdır.")
});

export const userCreateSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(255),
  displayName: z.string().trim().min(1).max(120),
  role: userRoleSchema
});

export const userUpdateSchema = z.object({
  password: z.string().min(1).max(255).optional(),
  displayName: z.string().trim().min(1).max(120).optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional()
});
export * from './errors.js';
