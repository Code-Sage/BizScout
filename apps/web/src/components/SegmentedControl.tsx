import clsx from 'clsx';

interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format?: (value: T) => string;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  format = (option) => option,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === value}
          onClick={() => onChange(option)}
          className={clsx(
            'rounded-md px-3 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none',
            option === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {format(option)}
        </button>
      ))}
    </div>
  );
}
