import { useEffect, useState } from "react";
import { FiUploadCloud } from "react-icons/fi";

export default function UploadPreview({ label = "Upload gambar", onChange, accept = "image/jpeg,image/png,image/webp", hint = "JPG, PNG, atau WEBP. Maksimal 5 MB.", initialPreview = "" }) {
  const [preview, setPreview] = useState(initialPreview);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const handleChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("File harus berupa gambar JPG, PNG, atau WEBP.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 5 MB.");
      event.target.value = "";
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setError("");
    setPreview(URL.createObjectURL(file));
    onChange?.(file);
  };
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-muted">{label}</span>
      <div className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline bg-surface-low p-6 text-center transition hover:border-primary hover:bg-surface-high">
        {preview ? <img src={preview} alt="Preview upload" className="max-h-52 rounded-xl object-contain" /> : <><FiUploadCloud className="mb-3 text-4xl text-primary" /><p className="font-bold">Klik untuk pilih gambar</p><p className="text-sm text-muted">{hint}</p></>}
      </div>
      {error && <span className="mt-2 block text-xs font-semibold text-danger">{error}</span>}
      <input type="file" className="hidden" accept={accept} onChange={handleChange} />
    </label>
  );
}
