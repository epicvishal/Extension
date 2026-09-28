// Small label/value grid shown under an expanded row.
export function Details({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-faint">{label}</dt>
          <dd className="cursor-text truncate text-muted" title={value}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
