import { IconX } from './icons'

export default function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-slate-900/40 px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center pt-2.5 sm:hidden">
          <span className="w-9 h-1 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 active:bg-slate-100 cursor-pointer"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
