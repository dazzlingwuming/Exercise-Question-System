/** 列表骨架：题目/错题加载时占位，避免整页只剩一个加载条。 */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="panel p-5">
          <div className="flex gap-2">
            <div className="skeleton h-5 w-14 rounded-full" />
            <div className="skeleton h-5 w-20 rounded-full" />
          </div>
          <div className="skeleton mt-4 h-4 w-3/4 rounded-md" />
          <div className="skeleton mt-2 h-4 w-1/2 rounded-md" />
          <div className="mt-4 flex gap-2">
            <div className="skeleton h-8 w-16 rounded-lg" />
            <div className="skeleton h-8 w-16 rounded-lg" />
            <div className="skeleton h-8 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
