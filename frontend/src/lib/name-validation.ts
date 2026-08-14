import { z } from "zod";

export const NAME_MAX_LENGTH = 100;

export const NAME_ERROR = "Name can only contain letters and spaces";

/** Letters of any script, their combining marks, and spaces. Nothing else. */
const ALLOWED_CHARS = /^[\p{L}\p{M} ]+$/u;
const DISALLOWED_CHAR = /[^\p{L}\p{M} ]/gu;

/**
 * Trim only — inner spacing is left exactly as typed. Call this when building
 * the request payload, not while the user is typing.
 */
export function trimName(value: string): string {
  return value.trim();
}

/** Drop every character a name may not contain (digits, punctuation, symbols). */
export function stripNameChars(value: string): string {
  return value.replace(DISALLOWED_CHAR, "");
}

export function nameIssue(value: string): string | null {
  const v = trimName(value);
  if (!v) return null; // emptiness is handled by the caller's required check
  if (v.length > NAME_MAX_LENGTH)
    return `Name must be at most ${NAME_MAX_LENGTH} characters`;
  if (!ALLOWED_CHARS.test(v)) return NAME_ERROR;
  return null;
}

/** Required name field. Validates the trimmed value without rewriting it. */
export function nameSchema(requiredMessage = "Name is required") {
  return z
    .string()
    .refine((v) => trimName(v).length > 0, requiredMessage)
    .superRefine((v, ctx) => {
      const issue = nameIssue(v);
      if (issue) ctx.addIssue({ code: "custom", message: issue });
    });
}

/** Optional name field — blank passes, non-blank must be a valid name. */
export function optionalNameSchema() {
  return z.string().superRefine((v, ctx) => {
    const issue = nameIssue(v);
    if (issue) ctx.addIssue({ code: "custom", message: issue });
  });
}
