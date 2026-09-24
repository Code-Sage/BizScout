import { useRef } from 'react';
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
  const buttonRefs = useRef<Map<T, HTMLButtonElement>>(new Map());

  const handleKeyDown = (event: React.KeyboardEvent, currentOption: T) => {
    const currentIndex = options.indexOf(currentOption);
    let nextIndex: number | undefined;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        nextIndex = (currentIndex + 1) % options.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        nextIndex = (currentIndex - 1 + options.length) % options.length;
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = options.length - 1;
        break;
      default:
        return;
    }

    if (nextIndex !== undefined && nextIndex >= 0 && nextIndex < options.length) {
      const nextOption = options[nextIndex]!;
      onChange(nextOption);
      // Focus the next button after React renders
      setTimeout(() => {
        buttonRefs.current.get(nextOption)?.focus();
      }, 0);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
    >
      {options.map((option) => (
        <button
          key={option}
          ref={(el) => {
            if (el) buttonRefs.current.set(option, el);
            else buttonRefs.current.delete(option);
          }}
          type="button"
          role="radio"
          aria-checked={option === value}
          tabIndex={option === value ? 0 : -1}
          onClick={() => onChange(option)}
          onKeyDown={(e) => handleKeyDown(e, option)}
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
