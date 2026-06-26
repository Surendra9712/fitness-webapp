import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3.5 py-1.5 rounded-full border text-sm font-medium transition-colors select-none cursor-pointer",
        active
          ? "bg-primary-600 border-primary-600 text-white"
          : "border-gray-200 text-gray-600 hover:border-primary-400 hover:text-primary-700",
      )}
    >
      {children}
    </button>
  );
}

export function Tag({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-lg border text-sm transition-colors select-none cursor-pointer",
        active
          ? "bg-primary-50 border-primary-500 text-primary-700 font-medium"
          : "border-gray-200 text-gray-600 hover:border-gray-300",
      )}
    >
      {children}
    </button>
  );
}

export function Stepper({
  value,
  min,
  max,
  step = 1,
  fmt,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  fmt?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-20 text-center text-sm font-semibold text-gray-800">
        {fmt ? fmt(value) : value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
