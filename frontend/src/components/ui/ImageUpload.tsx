import { useRef, useState } from "react";
import { Upload, X, ImageIcon, Link } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  className?: string;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  className,
  disabled,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [urlInput, setUrlInput] = useState(value ?? "");

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File must be under 5 MB.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const url = await onUpload(file);
      onChange(url);
    } catch (e: any) {
      setError(e?.message ?? "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function applyUrl() {
    onChange(urlInput.trim());
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Tabs
        defaultValue="file"
        onValueChange={() => { setError(""); setUrlInput(value ?? ""); }}
      >
        <TabsList>
          <TabsTrigger value="file" className="gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Upload Image
          </TabsTrigger>
          <TabsTrigger value="url" className="gap-1.5">
            <Link className="h-3.5 w-3.5" />
            Insert URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="mt-3">
          <div
            onClick={() => !disabled && !loading && inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors",
              value ? "h-48" : "h-40",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/40 hover:border-primary/50 hover:bg-muted/60",
              disabled || loading ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            )}
          >
            {value ? (
              <>
                <img src={value} alt="Uploaded" className="h-full w-full rounded-xl object-cover" />
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onChange(""); }}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {!disabled && !loading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 opacity-0 transition-all hover:bg-black/30 hover:opacity-100">
                    <p className="text-sm font-medium text-white">Click or drop to replace</p>
                  </div>
                )}
              </>
            ) : loading ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm">Uploading…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                {dragging ? (
                  <ImageIcon className="h-8 w-8 text-primary" />
                ) : (
                  <Upload className="h-8 w-8" />
                )}
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {dragging ? "Drop to upload" : "Drag & drop or click to select"}
                  </p>
                  <p className="text-xs text-muted-foreground/70">PNG, JPG, WEBP · max 5 MB</p>
                </div>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={onInputChange}
            disabled={disabled || loading}
          />
        </TabsContent>

        <TabsContent value="url" className="mt-3 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/photo.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyUrl(); } }}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={applyUrl}
              disabled={disabled || !urlInput.trim()}
            >
              Apply
            </Button>
          </div>

          {value && (
            <div className="relative h-48 overflow-hidden rounded-xl border">
              <img src={value} alt="Preview" className="h-full w-full object-cover" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => { onChange(""); setUrlInput(""); }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
