import { FiInbox } from "react-icons/fi";

export default function EmptyState({ title = "Belum ada data", description = "Data akan tampil setelah tersedia dari API." }) {
  return (
    <div className="glass-card flex min-h-64 flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full bg-surface-high p-4 text-primary"><FiInbox size={32} /></div>
      <h3 className="text-xl font-extrabold text-primary">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
    </div>
  );
}
