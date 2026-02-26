interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  delta?: string;
}

export function StatCard({ label, value, icon, delta }: StatCardProps) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center transition-all hover:border-primary/50 hover:shadow-[0_0_18px_rgba(41,181,232,0.15)] cursor-default">
      <div className="text-3xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-foreground-muted mt-1">{label}</div>
      {delta && <div className="text-xs text-success mt-1">{delta}</div>}
    </div>
  );
}

interface StatCardRowProps {
  cards: StatCardProps[];
}

export function StatCardRow({ cards }: StatCardRowProps) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cards.length}, 1fr)` }}>
      {cards.map((card, i) => (
        <StatCard key={i} {...card} />
      ))}
    </div>
  );
}
