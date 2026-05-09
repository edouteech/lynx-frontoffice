import { type ReactNode, useState, useMemo } from 'react';
import { Search, Download, ChevronDown, Printer } from 'lucide-react';
import {
  exportToCsv,
  exportToPdf,
  exportToXlsx,
  type ExportCell,
} from '../lib/tableExport';

export interface SummaryColumn<T> {
  key: keyof T | string;
  label: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, item: T) => ReactNode;
}

interface SummaryTableProps<T extends object> {
  data: T[];
  columns: SummaryColumn<T>[];
  title?: string;
  description?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onPrint?: () => void;
  getRowType?: (item: T) => 'normal' | 'subtotal' | 'partner' | 'grandtotal';
  getNestedValue: (obj: T, path: string) => unknown;
  exportFilename?: string;
}

export default function SummaryTable<T extends object>({
  data,
  columns,
  title,
  description,
  searchable = true,
  searchPlaceholder = 'Rechercher...',
  onPrint,
  getRowType,
  getNestedValue,
  exportFilename,
}: SummaryTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [exportOpen, setExportOpen] = useState(false);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const q = searchTerm.toLowerCase();
    return data.filter((item) =>
      columns.some((col) => {
        const v = getNestedValue(item, String(col.key));
        return v?.toString().toLowerCase().includes(q);
      })
    );
  }, [data, searchTerm, columns, getNestedValue]);

  const exportHeaders = useMemo(() => columns.map((c) => c.label), [columns]);
  const exportRows = useMemo((): ExportCell[][] => {
    return filteredData.map((item) =>
      columns.map((c) => {
        const v = getNestedValue(item, String(c.key));
        if (v == null) return null;
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
          return v;
        try {
          return JSON.stringify(v);
        } catch {
          return String(v);
        }
      })
    );
  }, [filteredData, columns, getNestedValue]);

  const showToolbar = title || description || searchable || exportFilename || onPrint;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Toolbar */}
      {showToolbar && (
        <div className="border-b border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onPrint && (
                <button
                  onClick={onPrint}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Imprimer
                </button>
              )}
              {searchable && (
                <div className="relative min-w-[200px] flex-1 lg:max-w-xs lg:flex-initial">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
              {exportFilename && (
                <div className="relative">
                  <button
                    onClick={() => setExportOpen(!exportOpen)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4" />
                    Exporter
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </button>
                  {exportOpen && (
                    <div className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            if (exportFilename) {
                              exportToCsv({
                                headers: exportHeaders,
                                rows: exportRows,
                                filename: exportFilename,
                              });
                            }
                            setExportOpen(false);
                          }}
                          className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          CSV
                        </button>
                        <button
                          onClick={() => {
                            if (exportFilename) {
                              exportToXlsx({
                                headers: exportHeaders,
                                rows: exportRows,
                                filename: exportFilename,
                              });
                            }
                            setExportOpen(false);
                          }}
                          className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Excel
                        </button>
                        <button
                          onClick={() => {
                            if (exportFilename) {
                              exportToPdf({
                                headers: exportHeaders,
                                rows: exportRows,
                                filename: exportFilename,
                                title: title,
                              });
                            }
                            setExportOpen(false);
                          }}
                          className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`border-r border-slate-300 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, rowIndex) => {
              const type = getRowType ? getRowType(item) : 'normal';
              
              if (type === 'subtotal') {
                return (
                  <tr key={rowIndex} className="bg-slate-200 border-y border-slate-400 font-black">
                    <td colSpan={4} className="border-r border-slate-400 px-4 py-3 text-center uppercase tracking-widest text-slate-900">
                      TOTAL ALUTRACO
                    </td>
                    {columns.slice(4).map((col, i) => (
                      <td
                        key={i}
                        className={`border-r border-slate-400 px-4 py-3 last:border-r-0 ${
                          col.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {col.render ? col.render(getNestedValue(item, String(col.key)), item) : String(getNestedValue(item, String(col.key)) ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              }

              if (type === 'grandtotal') {
                return (
                  <tr key={rowIndex} className="border-t-2 border-slate-900 font-black bg-slate-50">
                    {columns.map((col, i) => (
                      <td
                        key={i}
                        className={`border-r border-slate-900 px-4 py-4 last:border-r-0 ${
                          col.align === 'right' ? 'text-right' : 'text-left'
                        } text-slate-900`}
                      >
                        {col.render ? col.render(getNestedValue(item, String(col.key)), item) : String(getNestedValue(item, String(col.key)) ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              }

              const rowClass = type === 'partner' ? 'bg-indigo-50/30' : 'hover:bg-slate-50/80';
              
              return (
                <tr key={rowIndex} className={`${rowClass} border-b border-slate-200 transition-colors`}>
                  {columns.map((col, i) => {
                    const isGreenCell = col.key === 'total_vente';
                    return (
                      <td
                        key={i}
                        className={`border-r border-slate-300 px-4 py-3 last:border-r-0 ${
                          col.align === 'right' ? 'text-right' : 'text-left'
                        } ${isGreenCell && type === 'normal' ? 'bg-emerald-50/50' : ''}`}
                      >
                        {col.render ? col.render(getNestedValue(item, String(col.key)), item) : String(getNestedValue(item, String(col.key)) ?? '')}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
