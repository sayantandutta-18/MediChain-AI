import { z } from 'zod';

export const analyzeRecordSchema = z
  .object({
    recordId: z.string().trim().min(6).max(80),
    /** Optional free-form question from the patient, e.g. "what should I ask my doctor?" */
    question: z.string().trim().max(500).optional(),
    language: z.enum(['en', 'simple-en']).default('en'),
  })
  .strict();

export type AnalyzeRecordInput = z.infer<typeof analyzeRecordSchema>;
