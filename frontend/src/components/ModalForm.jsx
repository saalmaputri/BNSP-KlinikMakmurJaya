import { FiX } from "react-icons/fi";

export default function ModalForm({ open, title, children, onClose, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline/60 bg-surface-low px-6 py-5">
          <h3 className="text-xl font-extrabold text-primary">{title}</h3>
          <button className="icon-btn" onClick={onClose}><FiX /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-outline/60 bg-surface-low px-6 py-5">{footer}</div>}
      </div>
    </div>
  );
}
