import { z } from 'zod';
import { ACCESS_REQUEST_STATUSES } from '../types/enums';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid id is required');

export const createAccessRequestSchema = z
  .object({
    patientId: objectId,
    reason: z.string().trim().min(10, 'Please give a reason of at least 10 characters').max(1000),
    purpose: z.string().trim().max(500).optional(),
  })
  .strict();

export const decideAccessRequestSchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT']),
    /** Approval duration in days (TRD-9 time bounded grant). */
    durationDays: z.coerce.number().int().min(1).max(365).optional(),
    decisionNote: z.string().trim().max(1000).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.action === 'APPROVE' && data.durationDays === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['durationDays'],
        message: 'durationDays is required to approve an access request',
      });
    }
  });

export const revokeAccessSchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const listAccessRequestsSchema = z.object({
  status: z.enum(ACCESS_REQUEST_STATUSES as [string, ...string[]]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateAccessRequestInput = z.infer<typeof createAccessRequestSchema>;
export type DecideAccessRequestInput = z.infer<typeof decideAccessRequestSchema>;
export type ListAccessRequestsInput = z.infer<typeof listAccessRequestsSchema>;
