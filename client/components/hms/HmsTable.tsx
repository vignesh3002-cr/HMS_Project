import { type ReactNode, useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface HmsColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface HmsTableProps<T> {
  columns: HmsColumn<T>[];
  data: T[];
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  rowsPerPage: number;
  visibleStart: number;
  visibleEnd: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (val: number) => void;
  rowsPerPageOptions?: number[];
  emptyMessage?: string;
  scrollable?: boolean;
  minWidth?: string;
  rowKey: (row: T, index: number) => string;
}

function RowsPerPageSelect({
  value,
  onChange,
  options = [10, 20, 50],
}: {
  value: number;
  onChange: (val: number) => void;
  options?: number[];
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 text-xs font-semibold text-[#374151] bg-white border rounded-md pl-2.5 pr-2 py-1 transition-colors ${
          open ? "border-[#00488D] ring-2 ring-[#D6E3FF]" : "border-[#E5E7EB] hover:border-[#00488D]"
        }`}
      >
        {value}
        <ChevronDown className={`w-3 h-3 text-[#6B7280] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className={`absolute right-0 top-full mt-1 w-16 bg-white border border-[#E5E7EB] rounded-md shadow-lg overflow-hidden z-20 transition-all duration-150 ${
          open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => { onChange(opt); setOpen(false); }}
            className={`flex items-center justify-between w-full px-2.5 py-1.5 text-xs font-semibold text-left transition-colors ${
              value === opt ? "bg-[#D6E3FF] text-[#00488D]" : "text-[#374151] hover:bg-[#F2F4F6]"
            }`}
          >
            {opt}
            {value === opt && <Check className="w-3 h-3" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PaginationBar({
  currentPage,
  totalPages,
  totalRecords,
  rowsPerPage,
  visibleStart,
  visibleEnd,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions,
}: {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  rowsPerPage: number;
  visibleStart: number;
  visibleEnd: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (val: number) => void;
  rowsPerPageOptions?: number[];
}) {
  return (
    <div className="mt-auto shrink-0 flex flex-wrap items-center justify-between px-5 py-3 border-t border-[rgba(194,198,212,0.10)] bg-[rgba(242,244,246,0.95)] backdrop-blur gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-[#424752] tracking-[0.8px] capitalize">
          Showing {visibleStart} to {visibleEnd} of {totalRecords} entries
        </span>
        <RowsPerPageSelect
          value={rowsPerPage}
          onChange={onRowsPerPageChange}
          options={rowsPerPageOptions}
        />
      </div>
      <div className="flex items-center gap-1">
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="w-6 h-6 flex items-center justify-center rounded-md disabled:opacity-30 hover:bg-[#E5E7EB] transition-colors"
        >
          <svg width="5" height="8" viewBox="0 0 5 8" fill="none">
            <path d="M4 8L0 4L4 0L4.93333.933333L1.86667 4L4.93333 7.06667L4 8Z" fill="#424752"/>
          </svg>
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => (
          <button
            key={index}
            onClick={() => onPageChange(index + 1)}
            className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-semibold transition-colors ${
              currentPage === index + 1
                ? "bg-[#004785] text-white"
                : "text-[#1D1A1A] hover:bg-[#F2F4F6]"
            }`}
          >
            {index + 1}
          </button>
        ))}
        {totalPages > 5 && <span className="text-[#6B7280] text-xs">...</span>}
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="w-6 h-6 flex items-center justify-center rounded-md disabled:opacity-30 hover:bg-[#E5E7EB] transition-colors"
        >
          <svg width="5" height="8" viewBox="0 0 5 8" fill="none">
            <path d="M1 8L5 4L1 0L.0666656.933333L3.13333 4L.0666656 7.06667L1 8Z" fill="#424752"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function HmsTable<T>({
  columns,
  data,
  sortField,
  sortDirection,
  onSort,
  currentPage,
  totalPages,
  totalRecords,
  rowsPerPage,
  visibleStart,
  visibleEnd,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions,
  emptyMessage = "No data found.",
  scrollable = true,
  minWidth = "800px",
  rowKey,
}: HmsTableProps<T>) {
  return (
    <div className="flex flex-col">
      {scrollable ? (
      <div className="overflow-x-auto hide-scrollbar">
        <table className="w-full" style={{ minWidth }}>
          <thead className="hms-columnHeading-style">
            <tr className="bg-[rgba(242,244,246,0.40)]">
              {columns.map((column, idx) => {
                const isSorted = sortField === column.key;
                return (
                  <th
                    key={column.key}
                    className={`px-5 py-3 hms-table-header text-left ${idx === 0 ? "pl-8" : ""} ${
                      column.sortable !== false ? "cursor-pointer select-none" : ""
                    } ${column.headerClassName || ""}`}
                  >
                    <div
                      className="flex items-center gap-1"
                      onClick={() => column.sortable !== false && onSort(column.key)}
                    >
                      <span>{column.label}</span>
                      {column.sortable !== false && (
                        <span className="inline-flex h-3 w-3 items-center justify-center text-[7px] shrink-0">
                          {isSorted ? (sortDirection === "asc" ? "\u2191" : "\u2193") : "\u2195"}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row, index) => (
                <tr
                  key={rowKey(row, index)}
                  className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F7F9FB] transition-colors group"
                >
                  {columns.map((column, colIdx) => (
                    <td
                      key={column.key}
                      className={`px-5 py-4 ${colIdx === 0 ? "pl-8" : ""} ${column.className || ""}`}
                    >
                      {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center text-[#6B7280] text-sm">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      ) : (
        <table className="w-full">
          <thead className="hms-columnHeading-style">
            <tr className="bg-[rgba(242,244,246,0.40)]">
              {columns.map((column, idx) => {
                const isSorted = sortField === column.key;
                return (
                  <th
                    key={column.key}
                    className={`px-5 py-3 hms-table-header text-left ${idx === 0 ? "pl-8" : ""} ${
                      column.sortable !== false ? "cursor-pointer select-none" : ""
                    } ${column.headerClassName || ""}`}
                  >
                    <div
                      className="flex items-center gap-1"
                      onClick={() => column.sortable !== false && onSort(column.key)}
                    >
                      <span>{column.label}</span>
                      {column.sortable !== false && (
                        <span className="inline-flex h-3 w-3 items-center justify-center text-[7px] shrink-0">
                          {isSorted ? (sortDirection === "asc" ? "\u2191" : "\u2193") : "\u2195"}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row, index) => (
                <tr
                  key={rowKey(row, index)}
                  className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F7F9FB] transition-colors group"
                >
                  {columns.map((column, colIdx) => (
                    <td
                      key={column.key}
                      className={`px-5 py-4 ${colIdx === 0 ? "pl-8" : ""} ${column.className || ""}`}
                    >
                      {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center text-[#6B7280] text-sm">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {totalRecords > 0 && (
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          rowsPerPage={rowsPerPage}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={rowsPerPageOptions}
        />
      )}
    </div>
  );
}
