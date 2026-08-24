import { Skeleton } from "@/components/ui/skeleton";

export function AdminDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col p-4 rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
            <div className="flex justify-between items-start">
              <Skeleton className="w-8 h-8 rounded-[4px]" />
              <Skeleton className="w-10 h-3 rounded" />
            </div>
            <div className="pt-3 space-y-2">
              <Skeleton className="w-16 h-6 rounded" />
              <Skeleton className="w-20 h-3 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Overview Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="w-36 h-5 rounded" />
          <Skeleton className="w-64 h-3 rounded" />
        </div>
        <Skeleton className="w-36 h-9 rounded-[10px]" />
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(194,198,212,0.10)]">
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-6 rounded" />
            <Skeleton className="w-20 h-6 rounded" />
            <Skeleton className="w-20 h-6 rounded" />
          </div>
          <Skeleton className="w-48 h-7 rounded-md" />
        </div>
        {/* Table Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <Skeleton className="w-40 h-7 rounded-md" />
          <Skeleton className="w-32 h-7 rounded-md" />
        </div>
        {/* Table Rows */}
        <div className="flex flex-col">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-32 h-4 rounded" />
                <Skeleton className="w-20 h-3 rounded" />
              </div>
              <Skeleton className="w-24 h-4 rounded" />
              <Skeleton className="w-20 h-6 rounded-full" />
              <Skeleton className="w-8 h-8 rounded-md" />
            </div>
          ))}
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
          <Skeleton className="w-32 h-4 rounded" />
          <div className="flex gap-2">
            <Skeleton className="w-8 h-8 rounded" />
            <Skeleton className="w-8 h-8 rounded" />
            <Skeleton className="w-8 h-8 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardSkeleton;
