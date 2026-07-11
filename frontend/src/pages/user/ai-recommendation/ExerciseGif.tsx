import { useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";
import { api } from "@/api/client";

const FALLBACK = (
  <div className="w-full h-40 bg-muted flex items-center justify-center">
    <Dumbbell className="h-12 w-12 text-muted-foreground/50" />
  </div>
);

export function ExerciseGif({ url, alt }: { url: string; alt: string }) {
  // Our own backend proxy (relative path) needs the auth header, so it's
  // fetched as an authenticated blob. Public hosts (e.g. wger.de) don't —
  // and must NOT receive our bearer token, so they're rendered directly.
  const isProxied = url.startsWith("/");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isProxied) return;
    let revoke: string | null = null;
    let cancelled = false;
    setFailed(false);
    setObjectUrl(null);
    api
      .get<Blob>(url, { responseType: "blob" })
      .then((blob) => {
        if (cancelled) return;
        revoke = URL.createObjectURL(blob);
        setObjectUrl(revoke);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [url, isProxied]);

  const src = isProxied ? objectUrl : url;
  if (!src || failed) return FALLBACK;

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-40 object-cover bg-muted"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
