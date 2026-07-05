import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  /** Drive the field's text from outside (e.g. a "Clear filters" button). Omit for uncontrolled use. */
  value?: string;
  defaultValue?: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function SearchInput({
  value,
  defaultValue = "",
  onSearch,
  placeholder = "Search…",
  debounceMs = 300,
  className,
  inputClassName,
  autoFocus,
  disabled,
}: SearchInputProps) {
  const [text, setText] = useState(value ?? defaultValue);
  const debounced = useDebounce(text, debounceMs);

  useEffect(() => {
    if (value !== undefined) setText(value);
  }, [value]);

  useEffect(() => {
    onSearch(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className={cn("pl-9", text && "pr-9", inputClassName)}
      />
      {text && (
        <button
          type="button"
          onClick={() => setText("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
