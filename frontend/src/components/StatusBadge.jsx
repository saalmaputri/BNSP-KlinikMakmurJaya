const styles = {
  selesai: "bg-secondary-soft text-secondary",
  paid: "bg-secondary-soft text-secondary",
  aman: "bg-secondary-soft text-secondary",
  approved: "bg-secondary-soft text-secondary",
  active: "bg-secondary-soft text-secondary",
  pending: "bg-warning-soft text-warning",
  waiting: "bg-warning-soft text-warning",
  menipis: "bg-warning-soft text-warning",
  medium: "bg-warning-soft text-warning",
  kritis: "bg-danger-soft text-danger",
  dibatalkan: "bg-danger-soft text-danger",
  rejected: "bg-danger-soft text-danger",
  expired: "bg-danger-soft text-danger",
  cancelled: "bg-danger-soft text-danger",
  canceled: "bg-danger-soft text-danger",
  high: "bg-danger-soft text-danger",
  low: "bg-surface-high text-primary",
  open: "bg-danger-soft text-danger",
  resolved: "bg-secondary-soft text-secondary",
  monitoring: "bg-surface-high text-primary"
};

export default function StatusBadge({ status = "pending" }) {
  const key = String(status).toLowerCase();
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold capitalize ${styles[key] || "bg-surface-high text-primary"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {String(status).replace("_", " ")}
    </span>
  );
}
