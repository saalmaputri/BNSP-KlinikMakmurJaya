export default function StatCard({ icon: Icon, label, value, trend, danger }) {
  const displayValue = typeof value === "object" ? (Array.isArray(value) ? value.length : 0) : value;

  return (
    <div className={`glass-card p-6 transition hover:-translate-y-1 ${danger ? "border-danger/20 bg-danger-soft/40" : ""}`}>
      <div className="mb-6 flex items-start justify-between">
        <div className={`rounded-2xl p-3 ${danger ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary"}`}>{Icon && <Icon size={24} />}</div>
        {trend && <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-secondary">{trend}</span>}
      </div>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <h3 className={`mt-1 text-2xl font-extrabold ${danger ? "text-danger" : "text-ink"}`}>{displayValue}</h3>
    </div>
  );
}
