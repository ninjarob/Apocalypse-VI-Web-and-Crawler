interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'hostile' | 'friendly';
  size?: 'default' | 'small';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'default', className = '' }: BadgeProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    hostile: 'hostile',
    friendly: 'friendly',
  };

  const sizeClasses = {
    default: '',
    small: 'small',
  };

  const classes = [
    'tag',
    variantClasses[variant],
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ');

  return <span className={classes}>{children}</span>;
}
