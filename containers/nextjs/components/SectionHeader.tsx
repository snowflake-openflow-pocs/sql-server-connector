interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="border-t border-background-tertiary pt-6 mt-6">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="text-sm text-foreground-muted mt-1">{subtitle}</p>}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      {subtitle && <p className="text-foreground-muted mt-1">{subtitle}</p>}
    </div>
  );
}
