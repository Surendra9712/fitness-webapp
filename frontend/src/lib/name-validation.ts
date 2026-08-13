import { z } from "zod";

export const NAME_MAX_LENGTH = 100;

export const NAME_ERROR =
  "Name can only contain letters, spaces, hyphens, apostrophes and periods";

/** Letters (any script), combining marks, space, hyphen, apostrophe, period. */
const ALLOWED_CHARS = /^[\p{L}\p{M} \-'.]+$/u;
const STARTS_WITH_LETTER = /^[\p{L}]/u;
const BAD_SEQUENCE = /[-'.]{2,}|[-']\s|\s[-'.]/u;

/** Strip and collapse inner whitespace — mirrors the backend cleaner. */
export function cleanName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function nameIssue(value: string): string | null {
  const v = cleanName(value);
  if (!v) return null; // emptiness is handled by the caller's min(1)
  if (v.length > NAME_MAX_LENGTH)
    return `Name must be at most ${NAME_MAX_LENGTH} characters`;
  if (!ALLOWED_CHARS.test(v)) return NAME_ERROR;
  if (!STARTS_WITH_LETTER.test(v)) return "Name must start with a letter";
  if (/[ \-']$/.test(v))
    return "Name cannot end with a space, hyphen or apostrophe";
  if (BAD_SEQUENCE.test(v)) return NAME_ERROR;
  return null;
}

/** Required name field. */
export function nameSchema(requiredMessage = "Name is required") {
  return z
    .string()
    .transform(cleanName)
    .refine((v) => v.length > 0, requiredMessage)
    .superRefine((v, ctx) => {
      const issue = nameIssue(v);
      if (issue) ctx.addIssue({ code: "custom", message: issue });
    });
}

/** Optional name field — blank passes, non-blank must be a valid name. */
export function optionalNameSchema() {
  return z
    .string()
    .transform(cleanName)
    .superRefine((v, ctx) => {
      const issue = nameIssue(v);
      if (issue) ctx.addIssue({ code: "custom", message: issue });
    });
}
