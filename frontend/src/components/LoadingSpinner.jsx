export default function LoadingSpinner({ label = "Memuat data..." }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-surface-high border-t-primary" />
      <p className="text-sm font-bold text-muted">{label}</p>
    </div>
  );
}
