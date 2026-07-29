import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';

interface TableProps {
  data?: Array<Record<string, unknown>>;
  columns?: string[];
  filterPlaceholder?: string;
  children?: React.ReactNode;
}

const tableColumnHelper = createColumnHelper<Record<string, unknown>>();

export function Table({
  data = [],
  columns,
  filterPlaceholder = 'Filter rows...',
  children,
}: TableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const hasData = Array.isArray(data) && data.length > 0;
  const safeData = hasData ? data : [];
  const columnKeys = columns && columns.length > 0
    ? columns
    : Object.keys(safeData[0] || {});

  const tableColumns = useMemo(() => {
    return columnKeys.map((key) =>
      tableColumnHelper.accessor((row) => row[key], {
        id: key,
        header: key,
        cell: (info) => {
          const value = info.getValue();
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return String(value);
        },
      })
    );
  }, [columnKeys]);

  const table = useReactTable({
    data: safeData,
    columns: tableColumns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  });

  if (!hasData) {
    return (
      <div className="my-4 overflow-x-auto">
        <table>{children}</table>
      </div>
    );
  }

  return (
    <div className="my-4">
      <input
        className="input mb-3"
        value={globalFilter ?? ''}
        onChange={(e) => setGlobalFilter(e.target.value)}
        placeholder={filterPlaceholder}
      />
      <div className="overflow-x-auto rounded border border-tab-border">
        <table className="w-full border-collapse">
          <thead style={{ background: 'var(--sidebar-bg)' }}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left border-b border-tab-border"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="inline-flex items-center gap-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? '↑' : ''}
                      {header.column.getIsSorted() === 'desc' ? '↓' : ''}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} style={{ borderTop: '1px solid var(--tab-border)' }}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
