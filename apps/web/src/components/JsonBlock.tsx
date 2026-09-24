export function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      <pre className="max-h-80 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-relaxed text-slate-100">
        <code>{JSON.stringify(value, null, 2)}</code>
      </pre>
    </section>
  );
}
