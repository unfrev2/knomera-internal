type CountItem = {
  label: string;
  value: number;
};

/** Compact contextual relationship indicators — not scores. */
export function RelationshipCounts({ items }: { items: CountItem[] }) {
  if (items.length === 0) return null;
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-muted">{item.label}</dt>
          <dd className="font-medium tabular-nums text-navy">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
