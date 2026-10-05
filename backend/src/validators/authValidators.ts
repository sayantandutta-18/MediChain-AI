import { z } from 'zod';
import { USER_ROLES } from '../types/enums';

const email = z
  .string()
  .trim()
  .min(5, 'Email is required')
  .max(200)
  .email('A valid email address is required')
  .toLowerCase();

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
    email,
    password,
    role: z.enum(USER_ROLES as [string, ...string[]]),
    specialty: z.string().trim().max(120).optional(),
    registrationNumber: z.string().trim().max(60).optional(),
    hospital: z.string().trim().max(160).optional(),
    experience: z.string().trim().max(120).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.role === 'doctor' && !data.specialty) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['specialty'],
        message: 'Specialty is required for doctor accounts',
      });
    }
  });

export const loginSchema = z
  .object({
    email,
    password: z.string().min(1, 'Password is required').max(128),
    totpCode: z.string().optional(),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    specialty: z.string().trim().max(120).optional(),
    registrationNumber: z.string().trim().max(60).optional(),
    hospital: z.string().trim().max(160).optional(),
    experience: z.string().trim().max(120).optional(),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
