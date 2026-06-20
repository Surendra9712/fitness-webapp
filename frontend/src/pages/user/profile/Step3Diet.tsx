import { useFormContext } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Pill, Tag } from "./ui";
import { togArr } from "./utils";
import { DIETS, DIETARY_FLAGS, ALLERGENS, CUISINES } from "./constants";
import type { ProfileValues } from "./schema";

export function Step3Diet() {
  const { control } = useFormContext<ProfileValues>();

  return (
    <>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Diet Type & Allergens</h2>
        <p className="mt-1 text-sm text-gray-500">
          We'll filter out foods that don't work for you
        </p>
      </div>

      <FormField
        control={control}
        name="diet_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Diet Type</FormLabel>
            <FormControl>
              <div className="flex flex-wrap gap-2">
                {DIETS.map(([k, l]) => (
                  <Pill key={k} active={field.value === k} onClick={() => field.onChange(k)}>
                    {l}
                  </Pill>
                ))}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="h-px bg-gray-100" />

      <FormField
        control={control}
        name="dietary_restrictions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Dietary Restrictions</FormLabel>
            <FormControl>
              <div className="flex flex-wrap gap-2">
                {DIETARY_FLAGS.map(([k, l]) => (
                  <Pill
                    key={k}
                    active={(field.value as string[]).includes(k)}
                    onClick={() => field.onChange(togArr(field.value as string[], k))}
                  >
                    {l}
                  </Pill>
                ))}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="h-px bg-gray-100" />

      <FormField
        control={control}
        name="allergens"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Allergens — select all that apply</FormLabel>
            <FormControl>
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.map((a) => (
                  <Tag
                    key={a}
                    active={(field.value as string[]).includes(a)}
                    onClick={() => field.onChange(togArr(field.value as string[], a))}
                  >
                    {a}
                  </Tag>
                ))}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="h-px bg-gray-100" />

      <FormField
        control={control}
        name="cuisine_preferences"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Cuisine Preferences</FormLabel>
            <FormControl>
              <div className="flex flex-wrap gap-2">
                {CUISINES.map((c) => (
                  <Tag
                    key={c}
                    active={(field.value as string[]).includes(c)}
                    onClick={() => field.onChange(togArr(field.value as string[], c))}
                  >
                    {c}
                  </Tag>
                ))}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="other_restrictions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Other Restrictions (optional)</FormLabel>
            <FormControl>
              <textarea
                placeholder="e.g. No red meat, avoid spicy food…"
                className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
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
