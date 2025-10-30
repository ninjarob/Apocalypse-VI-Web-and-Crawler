import { ReactNode } from 'react';
import { useApi, useSearch, useDetailView } from '../hooks';
import { Loading, SearchBox, EmptyState } from '../components';

export interface ColumnConfig<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
}

export interface GenericEntityPageProps<T> {
  endpoint: string;
  entityName: string;
  entityNameSingular: string;
  columns: ColumnConfig<T>[];
  searchFields: (keyof T)[];
  searchPlaceholder?: string;
  DetailView: React.ComponentType<{ item: T; onBack: () => void }>;
  emptyMessage?: string;
}

export function GenericEntityPage<T extends { id: number | string; name: string }>({
  endpoint,
  entityName,
  columns,
  searchFields,
  searchPlaceholder,
  DetailView,
  emptyMessage
}: GenericEntityPageProps<T>) {
  const { data: items, loading } = useApi<T>(endpoint);
  const { selectedItem, showDetail, hideDetail } = useDetailView<T>();

  const { searchTerm, setSearchTerm, filteredItems } = useSearch(
    items,
    (item, term) => {
      const lowerTerm = term.toLowerCase();
      return searchFields.some(field => {
        const value = item[field];
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.toLowerCase().includes(lowerTerm);
        if (Array.isArray(value)) return value.some(v => String(v).toLowerCase().includes(lowerTerm));
        return String(value).toLowerCase().includes(lowerTerm);
      });
    }
  );

  if (loading) {
    return <Loading message={`Loading ${entityName.toLowerCase()}...`} />;
  }

  // Detail View
  if (selectedItem) {
    return <DetailView item={selectedItem} onBack={hideDetail} />;
  }

  // List View
  return (
    <div>
      <h2>{entityName} ({items.length})</h2>

      <SearchBox
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder={searchPlaceholder || `Search ${entityName.toLowerCase()}...`}
      />

      {filteredItems.length === 0 ? (
        <EmptyState
          message={
            items.length === 0
              ? emptyMessage || `No ${entityName.toLowerCase()} discovered yet. The crawler will populate this data during exploration.`
              : `No ${entityName.toLowerCase()} found matching your search.`
          }
        />
      ) : (
        <table className="entity-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id} onClick={() => showDetail(item)} style={{ cursor: 'pointer' }}>
                {columns.map(col => (
                  <td key={col.key}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
