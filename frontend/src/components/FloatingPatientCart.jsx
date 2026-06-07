import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiShoppingCart } from "react-icons/fi";
import { cartService } from "../services/cartService";
import { normalizeList } from "../utils/storage";

export default function FloatingPatientCart() {
  const [count, setCount] = useState(0);

  const loadCount = async () => {
    try {
      const payload = await cartService.get();
      const items = normalizeList(payload);
      setCount(items.reduce((total, item) => total + Number(item.quantity || 0), 0));
    } catch {
      setCount(0);
    }
  };

  useEffect(() => {
    loadCount();
    const onCartChanged = () => loadCount();
    const onFocus = () => loadCount();
    window.addEventListener("cart:changed", onCartChanged);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("cart:changed", onCartChanged);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <Link
      to="/pasien/cart"
      className="fixed bottom-6 right-6 z-40 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white shadow-soft transition duration-200 hover:-translate-y-1 hover:scale-105"
      title="Keranjang"
    >
      <FiShoppingCart size={30} />
      {count > 0 && <span className="absolute -right-1 -top-1 grid h-7 min-w-7 place-items-center rounded-full bg-danger px-2 text-xs font-extrabold">{count}</span>}
    </Link>
  );
}
