import { Leaf } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t bg-emerald-950 py-8 text-emerald-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold text-white">FitStore</span>
          </div>
          <p className="text-sm text-emerald-300">
            Professional-grade fitness equipment for every athlete.
          </p>
          <p className="text-xs text-emerald-400">
            &copy; {new Date().getFullYear()} FitStore
          </p>
        </div>
      </div>
    </footer>
  );
};
