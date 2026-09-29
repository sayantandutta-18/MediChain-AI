import { z } from 'zod';

export const RECORD_CATEGORIES = [
  'lab-report',
  'prescription',
  'imaging',
  'discharge-summary',
  'vaccination',
  'other',
] as const;

export const recordIdParamSchema = z.object({
  recordId: z.string().trim().min(6).max(80),
});

export const uploadRecordSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(160),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(RECORD_CATEGORIES).default('other'),
});

export const updateRecordSchema = z
  .object({
    title: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(2000).optional(),
    category: z.enum(RECORD_CATEGORIES).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'No updatable fields supplied' });

export const listRecordsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.enum(RECORD_CATEGORIES).optional(),
  search: z.string().trim().max(160).optional(),
});

export type UploadRecordInput = z.infer<typeof uploadRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type ListRecordsInput = z.infer<typeof listRecordsSchema>;
