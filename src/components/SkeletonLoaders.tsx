export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-white/10 ${className ?? "h-4 w-full"}`}
    />
  )
}

export function SkeletonConverter() {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonLine className="h-12 w-48" />
      <SkeletonLine className="h-8 w-32" />
      <SkeletonLine className="h-6 w-40" />
    </div>
  )
}

export function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-white/5">
      <SkeletonLine className="h-4 w-16" />
      <SkeletonLine className="h-4 w-24" />
      <SkeletonLine className="h-4 w-24" />
      <SkeletonLine className="h-4 w-16" />
      <SkeletonLine className="h-8 w-28" />
    </div>
  )
}
