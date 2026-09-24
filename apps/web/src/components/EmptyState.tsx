interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm">
      <p className="font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 text-slate-500">{description}</p>}
    </div>
  );
}
