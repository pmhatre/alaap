interface EmptyStateProps {
  message?: string;
}

export function EmptyState({
  message = "No results found.",
}: EmptyStateProps) {
  return (
    <div className="py-12 text-center">
      <p className="text-lg text-stone-400">{message}</p>
    </div>
  );
}
