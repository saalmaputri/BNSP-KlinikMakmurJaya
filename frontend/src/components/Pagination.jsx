export default function Pagination({ page = 1, total = 3, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-outline/60 bg-surface-low px-5 py-4">
      <p className="text-sm text-muted">Halaman {page} dari {total}</p>
      <div className="flex gap-2">
        {Array.from({ length: total }, (_, index) => index + 1).map((item) => (
          <button key={item} className={`h-10 w-10 rounded-full text-sm font-bold ${item === page ? "bg-primary text-white" : "bg-white text-primary hover:bg-surface-high"}`} onClick={() => onChange?.(item)}>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
