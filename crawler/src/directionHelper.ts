/**
 * Direction Helper Utilities
 * 
 * Provides utilities for working with MUD directions including
 * opposite direction mapping and direction normalization.
 */

export const OPPOSITE_DIRECTIONS: { [key: string]: string } = {
  'north': 'south',
  'south': 'north',
  'east': 'west',
  'west': 'east',
  'up': 'down',
  'down': 'up',
  'northeast': 'southwest',
  'southwest': 'northeast',
  'northwest': 'southeast',
  'southeast': 'northwest',
  // Short forms
  'n': 's',
  's': 'n',
  'e': 'w',
  'w': 'e',
  'u': 'd',
  'd': 'u',
  'ne': 'sw',
  'sw': 'ne',
  'nw': 'se',
  'se': 'nw'
};

export const DIRECTION_EXPANSIONS: { [key: string]: string } = {
  'n': 'north',
  's': 'south',
  'e': 'east',
  'w': 'west',
  'u': 'up',
  'd': 'down',
  'ne': 'northeast',
  'nw': 'northwest',
  'se': 'southeast',
  'sw': 'southwest'
};

/**
 * Get the opposite direction
 * @param direction The direction (north, south, n, s, etc.)
 * @returns The opposite direction in expanded form
 */
export function getOppositeDirection(direction: string): string {
  const normalized = normalizeDirection(direction);
  return OPPOSITE_DIRECTIONS[normalized] || normalized;
}

/**
 * Normalize a direction to its full form
 * @param direction The direction (n, north, etc.)
 * @returns The full direction name (north, south, etc.)
 */
export function normalizeDirection(direction: string): string {
  const lower = direction.toLowerCase();
  return DIRECTION_EXPANSIONS[lower] || lower;
}

/**
 * Check if a direction is valid
 * @param direction The direction to check
 * @returns True if valid
 */
export function isValidDirection(direction: string): boolean {
  const normalized = normalizeDirection(direction);
  return normalized in OPPOSITE_DIRECTIONS;
}

/**
 * Get all standard directions (full form)
 */
export function getAllDirections(): string[] {
  return ['north', 'south', 'east', 'west', 'up', 'down', 'northeast', 'northwest', 'southeast', 'southwest'];
}

/**
 * Get basic cardinal directions (no diagonals, no up/down)
 */
export function getCardinalDirections(): string[] {
  return ['north', 'south', 'east', 'west'];
}

/**
 * Get basic directions (cardinals + up/down, no diagonals)
 */
export function getBasicDirections(): string[] {
  return ['north', 'south', 'east', 'west', 'up', 'down'];
}
