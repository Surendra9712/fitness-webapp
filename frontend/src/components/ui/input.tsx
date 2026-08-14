import * as React from "react";
import { cn } from "@/lib/utils";
import {
  sanitizeInputValue,
  shouldBlockInsertedText,
  shouldBlockSpaceKey,
  type GuardContext,
} from "@/lib/input-guards";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Person-name field: anything but letters and spaces is dropped as it is
   *  typed, so OS text substitutions (the double-space period) cannot land. */
  nameField?: boolean;
};

/** Space handling is skipped for these — a passphrase may legitimately
 *  contain spaces, and the rest are not free-text at all. */
const SPACE_EXEMPT_TYPES = ["password", "number", "date", "time", "file"];

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      onKeyDown,
      onChange,
      onPaste,
      onBeforeInput,
      autoCorrect,
      autoCapitalize,
      spellCheck,
      nameField,
      ...props
    },
    ref,
  ) => {
    const ctx: GuardContext = {
      isEmail: type === "email",
      nameField: Boolean(nameField),
      guardSpaces: !SPACE_EXEMPT_TYPES.includes(type ?? "text"),
    };

    const caretOf = (el: HTMLInputElement) =>
      el.selectionStart ?? el.value.length;

    // Set while a space keystroke is being suppressed. Some OS builds deliver
    // the double-space substitution as a separate "." insertion rather than
    // ". " in one go; during that keystroke a "." is never the user's own.
    const suppressedSpace = React.useRef(false);

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key === " " && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const el = e.currentTarget;
        if (shouldBlockSpaceKey(ctx, el.value, caretOf(el))) {
          e.preventDefault();
          suppressedSpace.current = true;
          window.setTimeout(() => {
            suppressedSpace.current = false;
          }, 0);
          return;
        }
      }
      onKeyDown?.(e);
    }

    // The OS "double-space inserts a period" substitution does not arrive as a
    // space keystroke — the OS hands over the string ". " in a single
    // insertion. This is the layer that actually refuses it.
    function handleBeforeInput(e: React.InputEvent<HTMLInputElement>) {
      const el = e.currentTarget;
      if (suppressedSpace.current && e.data && /[.\s]/.test(e.data)) {
        e.preventDefault();
        return;
      }
      if (shouldBlockInsertedText(ctx, e.data ?? null, el.value, caretOf(el))) {
        e.preventDefault();
        return;
      }
      onBeforeInput?.(e);
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      // Catches paste, drag-drop and autofill, which carry no insertion data.
      const cleaned = sanitizeInputValue(ctx, e.target.value);
      if (cleaned !== e.target.value) e.target.value = cleaned;
      onChange?.(e);
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:focus-visible:ring-destructive/40",
          className,
        )}
        ref={ref}
        // Turns off iOS/Safari smart punctuation where it is never wanted.
        autoCorrect={ctx.isEmail || ctx.nameField ? "off" : autoCorrect}
        autoCapitalize={ctx.isEmail ? "none" : autoCapitalize}
        spellCheck={ctx.isEmail || ctx.nameField ? false : spellCheck}
        onKeyDown={handleKeyDown}
        onBeforeInput={handleBeforeInput}
        onChange={handleChange}
        onPaste={onPaste}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
