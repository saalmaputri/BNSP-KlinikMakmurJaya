import { FiInfo } from "react-icons/fi";
import { Link } from "react-router-dom";
import { rupiah } from "../utils/storage";

export default function ProductCard({ product, detailPath }) {
  const currentStock = Number(product.current_stock || 0);
  const isOutOfStock = currentStock <= 0;
  const isLowStock = !isOutOfStock && currentStock <= Number(product.minimum_stock || 0);
  const stockLabel = isOutOfStock ? "STOK HABIS" : isLowStock ? "LOW STOCK" : "IN STOCK";

  return (
    <article className="rounded-2xl border border-outline/50 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
      <div className="relative overflow-hidden rounded-xl bg-surface-low">
        <img src={product.image_url} alt={product.name} className="h-52 w-full object-cover transition duration-500 hover:scale-105" />
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-extrabold ${isOutOfStock ? "bg-danger text-white" : isLowStock ? "bg-warning text-white" : "bg-secondary-soft text-secondary"}`}>
          {stockLabel}
        </span>
      </div>
      <div className="pt-5">
        <Link to={detailPath || `/pasien/products/${product.id}`} className="line-clamp-1 text-xl font-extrabold tracking-tight text-ink hover:text-primary">
          {product.name}
        </Link>
        <div className="mt-3 flex items-center justify-between gap-4">
          <p className={`text-sm font-medium ${isOutOfStock ? "text-danger" : "text-ink"}`}>Stok: {currentStock} Unit</p>
          <p className="text-lg font-extrabold text-primary">{rupiah(product.selling_price)}</p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3">
          <Link to={detailPath || `/pasien/products/${product.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary-soft text-sm font-extrabold text-primary transition hover:bg-surface-high">
            <FiInfo /> Detail
          </Link>
        </div>
      </div>
    </article>
  );
}
