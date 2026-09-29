export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface FieldIssue {
  field: string;
  message: string;
}

/** Flattens the backend's `details` array into a `{ field: message }` map for forms. */
export const toFieldErrors = (error: ApiErrorPayload): Record<string, string> => {
  const issues = Array.isArray(error.details) ? (error.details as FieldIssue[]) : [];
  return issues.reduce<Record<string, string>>((acc, issue) => {
    if (issue?.field) acc[issue.field] = issue.message;
    return acc;
  }, {});
};
