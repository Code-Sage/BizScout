interface RefreshErrorProps {
  message?: string;
  onRetry: () => void;
}

/**
 * Compact inline notice for a failed background refresh when cached data is still on screen —
 * unlike ErrorState, it never replaces the data the user can already see.
 */
export function RefreshError({
  message = "Couldn't refresh — showing the last loaded data",
  onRetry,
}: RefreshErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md border border-amber-300 bg-white px-2 py-1 font-medium text-amber-800 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
      >
        Retry
      </button>
    </div>
  );
}
