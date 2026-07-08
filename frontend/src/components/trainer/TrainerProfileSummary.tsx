import { Dumbbell, Briefcase, Phone, MapPin, Award, Clock } from "lucide-react";
import useUser from "@/hooks/useUser";
import { Card, CardContent } from "@/components/ui/card";

// Full trainer profile (experience, phone, bio, certifications, availability) — fetched
// separately since trainer_assignments only carries name/email, not the full profile.
export function TrainerProfileSummary({ trainerId }: { trainerId: number }) {
  const { GetTrainer } = useUser();
  const { data: trainer, isLoading } = GetTrainer(trainerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }
  if (!trainer) return null;

  const details = [
    trainer.specialization && { icon: Dumbbell, label: trainer.specialization },
    (trainer.experience_years ?? 0) > 0 && {
      icon: Briefcase,
      label: `${trainer.experience_years} yrs experience`,
    },
    trainer.phone_number && { icon: Phone, label: trainer.phone_number },
    (trainer.city || trainer.country) && {
      icon: MapPin,
      label: [trainer.city, trainer.country].filter(Boolean).join(", "),
    },
  ].filter(Boolean) as { icon: typeof Dumbbell; label: string }[];

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <h3 className="text-sm font-bold tracking-tight">Trainer Profile</h3>

        {details.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {details.map(({ icon: Icon, label }, i) => (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-foreground">{label}</span>
              </div>
            ))}
          </div>
        )}

        {trainer.bio && (
          <p className="text-sm leading-relaxed text-muted-foreground">{trainer.bio}</p>
        )}

        {trainer.certifications && trainer.certifications.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Award className="h-3.5 w-3.5" /> Certifications
            </p>
            <div className="space-y-1.5">
              {trainer.certifications.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <span className="truncate text-sm font-medium text-foreground">{cert.name}</span>
                  {cert.file_url && (
                    <a
                      href={cert.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-medium text-primary-600 hover:underline"
                    >
                      View
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {trainer.available_time && trainer.available_time.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Availability
            </p>
            <div className="flex flex-wrap gap-2">
              {trainer.available_time.map((slot, i) => (
                <span
                  key={i}
                  className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                >
                  {slot.day} {slot.from}–{slot.to}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
