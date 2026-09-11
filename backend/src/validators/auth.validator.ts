import { z } from "zod";

export const registerSchema = z.object({
    name: z.string().min(2).max(100),

    email:z.string().email(),

    password:z.string().min(6),

    role:z.enum(["PATIENT","DOCTOR","HOSPITAL","ADMIN"]),

    walletAddress: z.string().optional(),
});