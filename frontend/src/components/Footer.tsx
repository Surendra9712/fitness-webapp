import { Leaf } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t bg-emerald-950 py-8 text-emerald-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <img
              src={import.meta.env.VITE_APP_LOGO}
              alt={import.meta.env.VITE_APP_NAME}
              className="h-14 w-auto"
            />
          </div>
          <p className="text-sm text-emerald-300">
            Professional-grade fitness equipment for every athlete.
          </p>
          <p className="text-xs text-emerald-400">
            &copy; {new Date().getFullYear()} SmartDietPro
          </p>
        </div>
      </div>
    </footer>
  );
};
