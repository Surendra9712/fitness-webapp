export function MacroPill({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${color}`}
    >
      <span className="font-semibold">{label}</span>
      <span>
        {Math.round(value)}
        {unit}
      </span>
    </span>
  );
}
