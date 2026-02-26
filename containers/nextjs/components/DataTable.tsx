'use client';

interface DataTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    header: string;
    render?: (value: T[keyof T], row: T) => React.ReactNode;
  }>;
}

export function DataTable<T extends Record<string, any>>({ data, columns }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-background-tertiary">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="text-left py-3 px-4 font-medium text-foreground-muted"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-background-tertiary hover:bg-background-secondary/50">
              {columns.map((col) => (
                <td key={String(col.key)} className="py-3 px-4 text-foreground">
                  {col.render ? col.render(row[col.key], row) : String(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PassFailCell({ value }: { value: boolean }) {
  return (
    <span className={value ? 'text-success' : 'text-error'}>
      {value ? 'Pass' : 'Fail'}
    </span>
  );
}

export function EnabledDisabledCell({ value }: { value: boolean }) {
  return (
    <span className={value ? 'text-success' : 'text-warning'}>
      {value ? 'Enabled' : 'Disabled'}
    </span>
  );
}
