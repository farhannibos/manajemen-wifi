export default function Skeleton({ jumlah = 3 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: jumlah }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
          <div className="h-4 w-2/3 bg-slate-200 rounded mb-2.5" />
          <div className="h-3 w-1/2 bg-slate-100 rounded mb-2" />
          <div className="h-3 w-1/3 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  )
}
