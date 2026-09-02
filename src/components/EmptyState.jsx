export default function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-4">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-400 mt-1 max-w-[24rem]">{description}</p>}
    </div>
  )
}
