import { z } from "zod";

export const createOrderSchema = z.object({
  customerId: z.string(),
  cylinderType: z.enum(["KG_14_2", "KG_19", "KG_47_5"]),
  quantity: z.number().min(1).max(5),
  deliveryAddress: z.string().min(5),
  paymentMethod: z.enum(["UPI", "CASH"])
});