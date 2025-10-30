// Badge/Status helper utilities

export function getCategoryBadgeVariant(category: string): 'info' | 'error' | 'default' | 'success' {
  const categoryMap: Record<string, 'info' | 'error' | 'default' | 'success'> = {
    navigation: 'info',
    combat: 'error',
    interaction: 'default',
    information: 'info',
    inventory: 'success',
    social: 'default',
    system: 'default'
  };
  return categoryMap[category] || 'default';
}

export function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'working':
      return 'success';
    case 'requires-args':
      return 'warning';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

// Entity name helpers
export function getSingularName(pluralName: string): string {
  if (pluralName.endsWith('ies')) {
    return pluralName.slice(0, -3) + 'y';
  }
  if (pluralName.endsWith('sses') || pluralName.endsWith('xes')) {
    return pluralName.slice(0, -2);
  }
  if (pluralName.endsWith('s')) {
    return pluralName.slice(0, -1);
  }
  return pluralName;
}

// Truncate text helper
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}
