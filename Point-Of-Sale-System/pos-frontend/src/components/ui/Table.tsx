import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
}

export function Table<T>({ columns, data, keyExtractor, isLoading }: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full h-32 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-4 text-center text-sm text-slate-500">
                  No data found
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={keyExtractor(item)} className="hover:bg-slate-50 transition-colors">
                  {columns.map((col, idx) => (
                    <td key={idx} className={`px-6 py-4 whitespace-nowrap text-sm text-slate-700 ${col.className || ''}`}>
                      {typeof col.accessor === 'function'
                        ? col.accessor(item)
                        : (item[col.accessor] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {data.length === 0 ? (
          <div className="text-center p-4 text-slate-500 bg-white rounded-lg border border-slate-200 shadow-sm">
            No data found
          </div>
        ) : (
          data.map((item) => (
            <div key={keyExtractor(item)} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col gap-2">
              {columns.map((col, idx) => (
                <div key={idx} className={`flex justify-between items-start text-sm ${col.className || ''}`}>
                  <span className="text-slate-500 font-medium mr-4">{col.header}</span>
                  <span className="text-right text-slate-800 break-words max-w-[70%]">
                    {typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor] as React.ReactNode)}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </>
  );
}
