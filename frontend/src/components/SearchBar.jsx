import { FiSearch } from "react-icons/fi";

export default function SearchBar({ value, onChange, placeholder = "Cari data...", suggestions = [], onSelect }) {
  return (
    <div className="group relative w-full max-w-md">
      <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input className="field pl-11" value={value || ""} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} />
      {value && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-outline bg-white shadow-soft">
          {suggestions.slice(0, 5).map((item) => (
            <button key={item} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-surface-low" onClick={() => onSelect?.(item)}>
              <FiSearch className="text-primary" />
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
