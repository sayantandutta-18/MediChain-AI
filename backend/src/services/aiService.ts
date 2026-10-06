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
  language: string;
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
    context.language === 'simple-en' ? ', written at a very simple reading level' : ''
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
 * Maps provider failures onto controlled, human-readable API errors.
 *
 * Upstream problems (no credits, rejected key, throttling) are not internal
 * server bugs, so they must not surface as a generic 500. Provider internals
 * are never forwarded to the client.
 */
export const translateProviderError = (error: unknown): ApiError => {
  const err = error as { status?: number; code?: string; error?: { type?: string; code?: string }; message?: string };

  // SDK throws APIError subclasses that expose `status` and `code`.
  if (err && typeof err === 'object') {
    const type = err.code ?? err.error?.type;

    if (err.status === 401 || type === 'invalid_api_key' || type === 'authentication_error') {
      return new ApiError(
        503,
        'AI_NOT_CONFIGURED',
        'The AI assistant is not available because the server credential was rejected. ' +
          'Check OPENAI_API_KEY on the server.',
      );
    }

    if (type === 'insufficient_quota' || err.status === 429) {
      return new ApiError(
        503,
        'AI_QUOTA_EXCEEDED',
        'The AI assistant is temporarily unavailable because the provider account has no credits. ' +
          'Add credits to the AI provider account, then try again. Everything else keeps working.',
      );
    }

    if (err.status && err.status >= 500) {
      return new ApiError(
        503,
        'AI_PROVIDER_ERROR',
        'The AI provider is temporarily unavailable. Please try again shortly.',
      );
    }
  }

  return ApiError.serviceUnavailable(
    'The AI assistant could not complete this request. Please try again.',
    'AI_REQUEST_FAILED',
  );
};

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

  let completion;
  try {
    completion = await openai.chat.completions.create({
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
            language: input.language || 'en',
          }),
        },
      ],
    });
  } catch (error) {
    // Already a controlled ApiError (e.g. AI_NOT_CONFIGURED) passes through.
    if (error instanceof ApiError) throw error;
    logger.error('AI provider request failed', error);
    throw translateProviderError(error);
  }

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


export const generateTimelineNarrative = async (user: AuthenticatedUser, input: any) => {
  if (!isAiConfigured()) {
    throw ApiError.serviceUnavailable('The AI assistant is not configured.', 'AI_NOT_CONFIGURED');
  }
  const records = await MedicalRecord.find({ patient: user.id }).sort({ createdAt: 1 }).lean();
  if (records.length === 0) return { narrative: 'No records available to build a timeline.', events: [] };

  const timelineContext = records.map(r => `- : [] `).join('\n');
  const prompt = `You are a medical assistant reviewing a patient's history. Based on the following chronological list of records, write a concise health timeline narrative.\n\n\n\nReturn JSON with exactly these keys:\n{\n  "narrative": string (a short patient-friendly paragraph summarizing their journey),\n  "events": Array<{ "date": string, "description": string }> (chronological highlights)\n}`;

  const client = getClient();
  try {
    const completion = await client.chat.completions.create({
      model: env.ai.model,
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.0,
      response_format: { type: 'json_object' },
    });
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) throw new Error('Empty AI response');
    const parsed = JSON.parse(responseContent);
    return {
      narrative: typeof parsed.narrative === 'string' ? parsed.narrative : 'Narrative unavailable.',
      events: Array.isArray(parsed.events) ? parsed.events : [],
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('Timeline generation failed', { error: err instanceof Error ? err.message : 'Unknown error' });
    throw ApiError.internal('Failed to generate AI timeline.', 'AI_GENERATION_FAILED');
  }
};
export const compareRecords = async (user: AuthenticatedUser, recordIds: string[], language: string = 'en') => {
  if (!isAiConfigured()) throw ApiError.serviceUnavailable('The AI assistant is not configured.', 'AI_NOT_CONFIGURED');
  if (recordIds.length !== 2) throw new Error('Must provide exactly 2 record IDs for comparison.');

  const [id1, id2] = recordIds;
  const r1 = await MedicalRecord.findOne({ recordId: id1 }).select('+extractedText');
  const r2 = await MedicalRecord.findOne({ recordId: id2 }).select('+extractedText');

  if (!r1 || !r2) throw ApiError.notFound('One or more records not found.');

  // Access checks
  const { CaregiverAccess } = await import('../models/CaregiverAccess.js');
  const checkAccess = async (record: any) => {
    if (user.role === 'patient') {
      if (record.patient.toString() !== user.id) {
        const isCaregiver = await CaregiverAccess.exists({ caregiverId: user.id, patientId: record.patient, isActive: true });
        if (!isCaregiver) throw ApiError.forbidden('You can only access your own medical records.', { code: 'NOT_RECORD_OWNER' });
      }
    }
  };

  await checkAccess(r1);
  await checkAccess(r2);

  const prompt = `You are a medical assistant reviewing two patient records. Compare them and identify changes, improvements, or new concerns.

Record 1 (${r1.title}):
${r1.extractedText}

Record 2 (${r2.title}):
${r2.extractedText}

Language: ${language}

Return JSON with exactly these keys:
{
  "comparisonSummary": "string (plain language)",
  "changes": "Array<{ topic: string, change: 'improved' | 'worsened' | 'stable' | 'new', description: string }>",
  "recommendations": "string[]"
}`;

  const client = getClient();
  const completion = await client.chat.completions.create({
    model: env.ai.model,
    messages: [{ role: 'system', content: prompt }],
    temperature: 0.0,
    response_format: { type: 'json_object' },
  });

  const responseContent = completion.choices[0]?.message?.content;
  if (!responseContent) throw new Error('Empty AI response');
  
  return JSON.parse(responseContent);
};
