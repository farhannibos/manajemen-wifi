const VARIAN = {
  primary:
    'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/20 active:scale-[0.97]',
  destructive: 'bg-red-600 text-white shadow-sm shadow-red-600/20 active:scale-[0.97]',
  success: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 active:scale-[0.97]',
  outline: 'bg-white text-slate-700 border border-slate-200 active:bg-slate-50 active:scale-[0.97]',
  'outline-destructive':
    'bg-white text-red-600 border border-red-200 active:bg-red-50 active:scale-[0.97]',
  ghost: 'text-slate-500 active:bg-slate-100',
}

export default function Button({
  variant = 'primary',
  className = '',
  children,
  icon,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 min-h-11 px-4 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:active:scale-100 cursor-pointer ${VARIAN[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
