interface BackButtonProps {
  onClick: () => void;
  label?: string;
}

export function BackButton({ onClick, label = 'Back to List' }: BackButtonProps) {
  return (
    <button onClick={onClick} style={{ marginBottom: '20px' }}>
      ← {label}
    </button>
  );
}
