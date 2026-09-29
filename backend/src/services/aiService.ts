import OpenAI from 'openai';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { MedicalRecord } from '../models/MedicalRecord';
import { loadAuthorizedRecord } from './accessControlService';
import type { AuthenticatedUser } from '../types';
import type { AnalyzeRecordInput } from '../validators/aiValidators';

export interface AiReport {
  summary: string;
  keyFindings: string[];
  terminology: Array<{ term: string; explanation: string }>;
  patientFriendlyExplanation: string;
  suggestedQuestions: string[];
  urgency: 'routine' | 'discuss-soon' | 'prompt-attention';
  disclaimer: string;
  model: string;
  generatedAt: string;
}

const DISCLAIMER =
  'This AI-generated explanation is for informational purposes only. It is not a diagnosis, ' +
  'not medical advice and does not replace consultation with a qualified healthcare professional.';

let client: OpenAI | null = null;

const getClient = (): OpenAI => {
  if (!env.ai.apiKey) {
    // TRD-15: a missing key must produce a controlled AI error, not crash the API.
    throw ApiError.serviceUnavailable(
      'The AI assistant is not configured on this server. Set OPENAI_API_KEY to enable it.',
      'AI_NOT_CONFIGURED',
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey: env.ai.apiKey, timeout: env.ai.timeoutMs, maxRetries: 1 });
  }
  return client;
};

export const isAiConfigured = (): boolean => Boolean(env.ai.apiKey);

const buildPrompt = (context: {
  title: string;
  category: string;
  description?: string;
  content?: string;
  question?: string;
  simpleLanguage: boolean;
}) => {
  const body = context.content
    ? context.content
    : 'No machine readable text is available. Base the explanation on the document metadata only and say so.';

  return `You are a careful medical-report explainer inside a patient-controlled health record platform.

You MUST:
- explain, never diagnose, never prescribe, never recommend changing treatment.
- stay inside the supplied document; if something is not in it, say it is not in the report.
- keep every list item short, plain and specific.
- return valid JSON matching the schema, no markdown fences, no extra keys.

Document title: ${context.title}
Document category: ${context.category}
Patient note: ${context.description ?? '(none)'}
Document content:
"""
${body}
"""
${context.question ? `The patient asked: "${context.question}"` : 'The patient did not ask a specific question.'}

Return JSON with exactly these keys:
{
  "summary": string (2-3 sentences describing what this document is and its purpose),
  "keyFindings": string[] (3-6 bullet findings drawn from the document),
  "terminology": Array<{ "term": string, "explanation": string }> (0-6 medical terms explained simply),
  "patientFriendlyExplanation": string (plain language paragraph, no jargon${
    context.simpleLanguage ? ', written at a very simple reading level' : ''
  }),
  "suggestedQuestions": string[] (3-5 questions the patient could ask their doctor),
  "urgency": "routine" | "discuss-soon" | "prompt-attention"
}`;
};

interface RawModelOutput {
  summary?: string;
  keyFindings?: unknown;
  terminology?: unknown;
  patientFriendlyExplanation?: string;
  suggestedQuestions?: unknown;
  urgency?: string;
}

const asStringArray = (value: unknown, limit: number): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
};

const normaliseTerminology = (value: unknown): Array<{ term: string; explanation: string }> => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      term: String(item.term ?? '').trim(),
      explanation: String(item.explanation ?? '').trim(),
    }))
    .filter((item) => item.term && item.explanation)
    .slice(0, 6);
};

const URGENCIES = new Set(['routine', 'discuss-soon', 'prompt-attention']);

/**
 * TRD-15/PRD-6: browser -> backend -> provider. Credentials never reach the client.
 * Authorization is re-checked here: the AI can only read records the caller may read.
 */
export const analyzeRecord = async (user: AuthenticatedUser, input: AnalyzeRecordInput): Promise<AiReport> => {
  const { record } = await loadAuthorizedRecord(user, input.recordId);

  const full = await MedicalRecord.findOne({ recordId: input.recordId })
    .select('+extractedText')
    .lean();

  const openai = getClient();

  const completion = await openai.chat.completions.create({
    model: env.ai.model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You explain medical documents to laypeople. You never diagnose or prescribe. ' +
          'You always return a single JSON object and no surrounding text.',
      },
      {
        role: 'user',
        content: buildPrompt({
          title: record.title,
          category: record.category,
          description: record.description,
          content: full?.extractedText,
          question: input.question,
          simpleLanguage: input.language === 'simple-en',
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw ApiError.serviceUnavailable('The AI service returned an empty response.', 'AI_EMPTY_RESPONSE');
  }

  let parsed: RawModelOutput;
  try {
    parsed = JSON.parse(raw) as RawModelOutput;
  } catch {
    logger.warn('AI response was not valid JSON');
    throw ApiError.serviceUnavailable('The AI service returned an unreadable response.', 'AI_INVALID_RESPONSE');
  }

  return {
    summary: String(parsed.summary ?? 'No summary was generated for this document.').trim(),
    keyFindings: asStringArray(parsed.keyFindings, 6),
    terminology: normaliseTerminology(parsed.terminology),
    patientFriendlyExplanation:
      String(
        parsed.patientFriendlyExplanation ??
          'No plain-language explanation was generated for this document.',
      ).trim(),
    suggestedQuestions: asStringArray(parsed.suggestedQuestions, 5),
    urgency: URGENCIES.has(String(parsed.urgency)) ? (String(parsed.urgency) as AiReport['urgency']) : 'routine',
    disclaimer: DISCLAIMER,
    model: env.ai.model,
    generatedAt: new Date().toISOString(),
  };
};

export const aiHealth = () => ({
  configured: isAiConfigured(),
  model: env.ai.model,
});
