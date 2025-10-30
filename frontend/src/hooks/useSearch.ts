import { useState, useMemo } from 'react';

type SearchFunction<T> = (item: T, searchTerm: string) => boolean;

export function useSearch<T>(
  items: T[],
  searchFunction: SearchFunction<T>
) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return items;
    }
    return items.filter(item => searchFunction(item, searchTerm.toLowerCase()));
  }, [items, searchTerm, searchFunction]);

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
  };
}
