import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ExerciseGif } from "./ExerciseGif";
import type { ExerciseItem } from "./types";

export function ExerciseCard({ ex }: { ex: ExerciseItem }) {
  const [showInstr, setShowInstr] = useState(false);
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <ExerciseGif url={ex.gif_url} alt={ex.name} />
      <div className="p-3 space-y-1">
        <p className="font-semibold text-sm">{ex.name}</p>
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs capitalize">
            {ex.body_part}
          </Badge>
          <Badge variant="outline" className="text-xs capitalize">
            {ex.equipment}
          </Badge>
          {ex.difficulty && (
            <Badge variant="outline" className="text-xs capitalize">
              {ex.difficulty}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Target: {ex.target_muscle}
        </p>
        {ex.instructions && ex.instructions.length > 0 && (
          <div>
            <button
              className="text-xs text-primary underline mt-1"
              onClick={() => setShowInstr((v) => !v)}
            >
              {showInstr ? "Hide instructions" : "Show instructions"}
            </button>
            {showInstr && (
              <ol className="mt-2 space-y-1">
                {ex.instructions.map((step, i) => (
                  <li
                    key={i}
                    className="text-xs text-muted-foreground flex gap-2"
                  >
                    <span className="font-bold shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
