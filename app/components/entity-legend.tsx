const legendItems = [
  { label: "Ragas", className: "bg-amber-400" },
  { label: "Artists", className: "bg-blue-400" },
  { label: "Films", className: "bg-green-400" },
] as const;

interface EntityLegendProps {
  className?: string;
}

export function EntityLegend({ className = "" }: EntityLegendProps) {
  return (
    <div
      aria-label="Entity color legend"
      className={`flex flex-wrap items-center gap-3 text-xs text-stone-400 ${className}`}
    >
      {legendItems.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${item.className}`}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
