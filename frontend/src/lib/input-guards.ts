/**
 * Pure decision helpers for the shared <Input>. Kept separate from the
 * component so the rules can be reasoned about (and tested) on their own.
 *
 * The problem they solve: macOS/iOS "add period with double-space" is an OS
 * text substitution. It does not arrive as a plain space keystroke — the OS
 * hands the browser the string ". " in one insertion. So three layers:
 *   1. shouldBlockSpaceKey  — stop the second consecutive space at the source
 *   2. shouldBlockInsertedText — refuse ". " (or any space-bearing insert)
 *   3. sanitizeInputValue   — clean up whatever still lands (paste, autofill)
 */

// Two copies on purpose: a /g regex carries lastIndex between .test() calls,
// which makes it skip matches. Global one for replace, plain one for tests.
const NAME_DISALLOWED_ALL = /[^\p{L}\p{M} ]/gu;
const NAME_DISALLOWED = /[^\p{L}\p{M} ]/u;

export interface GuardContext {
  isEmail: boolean;
  nameField: boolean;
  guardSpaces: boolean;
}

/** True when a space keypress should be swallowed. */
export function shouldBlockSpaceKey(
  ctx: GuardContext,
  value: string,
  caret: number,
): boolean {
  if (!ctx.guardSpaces) return false;
  if (ctx.isEmail) return true; // an email address never contains a space
  if (caret <= 0) return true; // no leading space
  return value[caret - 1] === " "; // no second consecutive space
}

/**
 * True when an insertion should be refused outright. `data` is the text the
 * browser is about to insert — for the OS double-space substitution this is
 * ". ", which is why matching on whitespace catches it.
 */
export function shouldBlockInsertedText(
  ctx: GuardContext,
  data: string | null,
  value: string,
  caret: number,
): boolean {
  if (!data) return false; // paste/drop carry no data; sanitize handles those
  if (ctx.isEmail) return /\s/.test(data);
  if (ctx.nameField) {
    if (NAME_DISALLOWED.test(data)) return true;
    if (/\s/.test(data) && (caret <= 0 || value[caret - 1] === " ")) return true;
    return false;
  }
  if (ctx.guardSpaces && /\s/.test(data)) {
    return caret <= 0 || value[caret - 1] === " ";
  }
  return false;
}

/** Normalizes a value that already made it into the field. */
export function sanitizeInputValue(ctx: GuardContext, value: string): string {
  if (ctx.isEmail) return value.replace(/\s+/g, "");
  if (ctx.nameField)
    return value.replace(NAME_DISALLOWED_ALL, "").replace(/ {2,}/g, " ");
  if (ctx.guardSpaces) return value.replace(/\s{2,}/g, " ");
  return value;
}
