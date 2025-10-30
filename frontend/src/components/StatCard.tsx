interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="bg-white p-4 rounded shadow" style={{ textAlign: 'center' }}>
      <div className="text-2xl font-bold" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="text-gray-600">{label}</div>
    </div>
  );
}
