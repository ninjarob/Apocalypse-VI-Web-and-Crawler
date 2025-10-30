import { useState } from 'react';

export function useDetailView<T>() {
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  const showDetail = (item: T) => {
    setSelectedItem(item);
  };

  const hideDetail = () => {
    setSelectedItem(null);
  };

  return {
    selectedItem,
    showDetail,
    hideDetail,
    isDetailView: selectedItem !== null,
  };
}
