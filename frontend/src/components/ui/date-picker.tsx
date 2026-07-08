import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import "react-day-picker/dist/style.css";
const today = new Date();

export interface DatePickerProps {
  value?: string; // YYYY-MM-DD or ""
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledDates?: (date: Date) => boolean;
  startYear?: number;
  endYear?: number;
  defaultMonth?: Date;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  disabledDates,
  startYear = 1940,
  endYear = today.getFullYear(),
  defaultMonth = today,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Append T00:00:00 to avoid timezone-shift when parsing YYYY-MM-DD
  const selected = value ? new Date(value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "w-full justify-start gap-2 text-left font-normal h-9 px-3 shadow-none",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
          {value ? format(selected!, "dd MMM yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 shadow-lg"
        align="start"
        side="bottom"
        avoidCollisions
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange?.(date ? format(date, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
          disabled={disabledDates}
          defaultMonth={selected ?? defaultMonth ?? new Date(2000, 0)}
          startMonth={new Date(startYear, 0)}
          endMonth={new Date(endYear, 11)}
          className="[--cell-size:2.25rem]"
        />
      </PopoverContent>
    </Popover>
  );
}
