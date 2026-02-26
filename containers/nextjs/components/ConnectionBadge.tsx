interface ConnectionBadgeProps {
  connected: boolean;
}

export function ConnectionBadge({ connected }: ConnectionBadgeProps) {
  return (
    <div
      className={`px-3 py-1.5 rounded-full text-sm font-medium ${
        connected
          ? 'bg-success/20 text-success border border-success/30'
          : 'bg-error/20 text-error border border-error/30'
      }`}
    >
      {connected ? 'Connected' : 'Disconnected'}
    </div>
  );
}
