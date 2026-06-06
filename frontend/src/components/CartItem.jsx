import { FiMinus, FiPlus, FiTrash2 } from "react-icons/fi";
import { rupiah } from "../utils/storage";

export default function CartItem({ item, onInc, onDec, onRemove }) {
  const medicine = item.medicine || item;
  const name = medicine.name || medicine.medicine_name_snapshot || item.medicine_id || "Item keranjang";
  const price = medicine.selling_price ?? item.unit_price_snapshot ?? 0;
  return (
    <div className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm">
      <img src={medicine.image_url || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80"} alt={name} className="h-20 w-20 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <h4 className="font-bold text-primary">{name}</h4>
        <p className="text-sm text-muted">{rupiah(price)}</p>
        <div className="mt-3 flex items-center gap-2">
          <button className="icon-btn h-8 w-8" onClick={onDec}><FiMinus /></button>
          <span className="w-8 text-center font-bold">{item.quantity || 1}</span>
          <button className="icon-btn h-8 w-8" onClick={onInc}><FiPlus /></button>
          <button className="icon-btn ml-auto h-8 w-8 text-danger" onClick={onRemove}><FiTrash2 /></button>
        </div>
      </div>
    </div>
  );
}
