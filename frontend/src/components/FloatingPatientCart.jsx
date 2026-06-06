import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiShoppingCart } from "react-icons/fi";
import { cartService } from "../services/cartService";
import { normalizeList } from "../utils/storage";

export default function FloatingPatientCart() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    cartService.get().then((payload) => setCount(normalizeList(payload).length)).catch(() => setCount(0));
  }, []);

  return (
    <Link
      to="/pasien/cart"
      className="fixed bottom-6 right-6 z-40 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-soft transition hover:-translate-y-1"
      title="Keranjang"
    >
      <FiShoppingCart size={24} />
      {count > 0 && <span className="absolute -right-1 -top-1 grid h-7 min-w-7 place-items-center rounded-full bg-danger px-2 text-xs font-extrabold">{count}</span>}
    </Link>
  );
}
