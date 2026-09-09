import { Skeleton } from "@/components/ui/skeleton";

export function PatientDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] p-4 max-w-[1200px] mx-auto animate-fade-in">
      <div className="flex items-start gap-2 mb-4">
        <Skeleton className="w-9 h-9 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="w-1/3 h-6 rounded mb-2" />
          <Skeleton className="w-1/4 h-4 rounded" />
        </div>
      </div>

      <div className="space-y-6">
        <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[21px]">
          <Skeleton className="w-1/4 h-5 rounded mb-4" />
          <div className="flex flex-col md:flex-row gap-6 mb-4">
            <Skeleton className="w-32 h-32 rounded-lg shrink-0" />
            <div className="flex-1 space-y-4">
              <div className="flex gap-2">
                <Skeleton className="w-24 h-6 rounded-full" />
                <Skeleton className="w-20 h-6 rounded-full" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="w-3/4 h-3 rounded" />
                    <Skeleton className="w-full h-4 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-[23px] h-[23px] rounded shrink-0" />
                <div className="flex flex-col gap-[3px]">
                  <Skeleton className="w-1/2 h-3 rounded" />
                  <Skeleton className="w-3/4 h-3 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[21px]">
          <Skeleton className="w-1/4 h-5 rounded mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-[23px] h-[23px] rounded shrink-0" />
                <div className="flex flex-col gap-[3px]">
                  <Skeleton className="w-1/2 h-3 rounded" />
                  <Skeleton className="w-3/4 h-3 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[21px]">
          <Skeleton className="w-1/4 h-5 rounded mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 flex items-start gap-3">
              <Skeleton className="w-[23px] h-[23px] rounded shrink-0" />
              <div className="flex flex-col gap-[3px]">
                <Skeleton className="w-1/2 h-3 rounded" />
                <Skeleton className="w-3/4 h-3 rounded" />
              </div>
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-[23px] h-[23px] rounded shrink-0" />
                <div className="flex flex-col gap-[3px]">
                  <Skeleton className="w-1/2 h-3 rounded" />
                  <Skeleton className="w-3/4 h-3 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[21px]">
          <Skeleton className="w-1/4 h-5 rounded mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-[23px] h-[23px] rounded shrink-0" />
                <div className="flex flex-col gap-[3px]">
                  <Skeleton className="w-1/2 h-3 rounded" />
                  <Skeleton className="w-3/4 h-3 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-[#edf0f4] rounded-[10px] p-[21px]">
          <Skeleton className="w-1/4 h-5 rounded mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-[23px] h-[23px] rounded shrink-0" />
                <div className="flex flex-col gap-[3px]">
                  <Skeleton className="w-1/2 h-3 rounded" />
                  <Skeleton className="w-3/4 h-3 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}