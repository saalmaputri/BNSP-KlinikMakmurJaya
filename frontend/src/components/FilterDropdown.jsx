export default function FilterDropdown({ label, value, options = [], onChange }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-muted">
      {label}
      <select className="field min-w-44" value={value || ""} onChange={(event) => onChange?.(event.target.value)}>
        {options.map((option) => (
          <option key={option.value || option} value={option.value || option}>
            {option.label || option}
          </option>
        ))}
      </select>
    </label>
  );
}
