import StatusBadge from "./StatusBadge";
import EmptyState from "./EmptyState";
import Pagination from "./Pagination";
import { FiEdit2, FiEye, FiTrash2 } from "react-icons/fi";

export default function DataTable({
  columns = [],
  rows = [],
  onView,
  onEdit,
  onDelete,
  renderActions,
  editLabel = "Edit",
  editTitle = "Edit",
  deleteLabel = "Hapus",
  deleteTitle = "Hapus",
  page,
  totalPages,
  onPageChange
}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const hasActions = Boolean(onView || onEdit || onDelete || renderActions);
  if (!safeRows.length) return <EmptyState title="Data belum tersedia" description="Coba ubah filter atau tambah data baru." />;

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-surface-low">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-5 py-4 text-xs font-extrabold uppercase text-muted">{column.label}</th>
              ))}
              {hasActions && <th className="px-5 py-4 text-right text-xs font-extrabold uppercase text-muted">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline/60">
            {safeRows.map((row, index) => (
              <tr key={row.id || index} className="group transition hover:bg-primary/5">
                {columns.map((column) => (
                  <td key={column.key} className="px-5 py-4 text-sm">
                    {column.type === "badge" ? <StatusBadge status={row[column.key]} /> : column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
                {hasActions && <td className="px-5 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    {renderActions && renderActions(row)}
                    {onView && (
                      <button className="btn-secondary px-3 py-2 text-xs" title="Detail" onClick={() => onView(row)}>
                        <FiEye /> Detail
                      </button>
                    )}
                    {onEdit && (
                      <button className="btn-secondary px-3 py-2 text-xs" title={editTitle} onClick={() => onEdit(row)}>
                        <FiEdit2 /> {editLabel}
                      </button>
                    )}
                    {onDelete && (
                      <button className="inline-flex items-center justify-center gap-2 rounded-full border border-danger/30 bg-danger-soft px-3 py-2 text-xs font-bold text-danger transition hover:bg-danger hover:text-white" title={deleteTitle} onClick={() => onDelete(row)}>
                        <FiTrash2 /> {deleteLabel}
                      </button>
                    )}
                  </div>
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {onPageChange && totalPages > 1 && <Pagination page={page || 1} total={totalPages} onChange={onPageChange} />}
    </div>
  );
}
