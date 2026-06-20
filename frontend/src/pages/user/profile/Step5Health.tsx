import { useFormContext } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Pill } from "./ui";
import { CONDITIONS } from "./constants";
import type { ProfileValues } from "./schema";

type HealthCondition = { name: string; type: string; affects_diet: boolean };

export function Step5Health() {
  const { control } = useFormContext<ProfileValues>();

  return (
    <>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Health Conditions</h2>
        <p className="mt-1 text-sm text-gray-500">
          Optional — helps us avoid recommending foods that may affect your health
        </p>
      </div>

      <FormField
        control={control}
        name="health_conditions"
        render={({ field }) => {
          const arr = field.value as HealthCondition[];
          return (
            <FormItem>
              <FormLabel>Select any that apply</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-2">
                  {CONDITIONS.map((c) => (
                    <Pill
                      key={c.key}
                      active={arr.some((x) => x.type === c.key)}
                      onClick={() =>
                        field.onChange(
                          arr.some((x) => x.type === c.key)
                            ? arr.filter((x) => x.type !== c.key)
                            : [...arr, { name: c.name, type: c.key, affects_diet: true }],
                        )
                      }
                    >
                      {c.name}
                    </Pill>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <div className="h-px bg-gray-100" />

      <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional Notes (optional)</FormLabel>
            <FormControl>
              <textarea
                placeholder="e.g. recovering from surgery, thyroid condition, medications…"
                className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
