interface EmptyStateProps {
  message: string;
  hint?: string;
}

export function EmptyState({ message, hint }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>
      <p>{message}</p>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
