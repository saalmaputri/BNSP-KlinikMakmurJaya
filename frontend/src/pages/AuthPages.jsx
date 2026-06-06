import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiLock, FiMail, FiShield } from "react-icons/fi";
import { authService } from "../services/authService";
import { Toast } from "../components/Toast";
import { roleDashboards } from "../config/roleMenus";

function AuthShell({ title, subtitle, children }) {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
          <h1 className="text-3xl font-extrabold text-primary">Klinik Makmur Jaya</h1>
          <p className="mt-2 text-muted">Medical e-commerce dashboard</p>
          <div className="my-8">
            <h2 className="text-2xl font-extrabold text-ink">{title}</h2>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          </div>
          {children}
        </div>
      </section>
      <section className="hidden overflow-hidden bg-primary lg:block">
        <div className="flex h-full flex-col justify-end bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center p-12">
          <div className="max-w-xl text-white drop-shadow">
            <p className="text-sm font-bold uppercase">Sertifikasi BNSP Ready</p>
            <h3 className="mt-3 text-5xl font-extrabold">Dashboard klinik, apotek, kasir, dan pasien dalam satu sistem.</h3>
          </div>
        </div>
      </section>
    </main>
  );
}

export function Login() {
  const navigate = useNavigate();
  const demoEmails = {
    admin: "admin@klinikmakmurjaya.com",
    apoteker: "apoteker@klinikmakmurjaya.com",
    kasir: "kasir@klinikmakmurjaya.com",
    pasien: "budi@klinikmakmurjaya.com"
  };
  const [form, setForm] = useState({ email: demoEmails.admin, password: "Password123", role: "admin" });

  const submit = async (event) => {
    event.preventDefault();
    try {
      const { user } = await authService.login(form);
      Toast.success(`Login sebagai ${user.role}`);
      navigate(roleDashboards[user.role] || "/login");
    } catch (error) {
      const message = error?.response?.data?.detail || error?.response?.data?.message || error?.message || "Login gagal. Pastikan backend berjalan dan database sudah diseed.";
      Toast.error(message);
    }
  };

  return (
    <AuthShell title="Login Multi-role" subtitle="Pilih role demo atau gunakan kredensial backend.">
      <form className="space-y-4" onSubmit={submit}>
        <label className="block text-sm font-bold text-muted">Role
          <select className="field mt-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, email: demoEmails[e.target.value] })}>
            <option value="admin">Admin</option>
            <option value="apoteker">Apoteker</option>
            <option value="kasir">Kasir</option>
            <option value="pasien">Pasien</option>
          </select>
        </label>
        <label className="block text-sm font-bold text-muted">Email
          <div className="relative mt-2"><FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" /><input className="field pl-11" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        </label>
        <label className="block text-sm font-bold text-muted">Password
          <div className="relative mt-2"><FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" /><input className="field pl-11" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        </label>
        <button className="btn-primary w-full" type="submit">Masuk</button>
        <p className="rounded-2xl bg-surface-low p-3 text-xs font-semibold text-muted">Akun backend default memakai password <b>Password123</b>. Jalankan seeder backend jika akun belum ada.</p>
        <p className="text-center text-sm text-muted">Belum punya akun? <Link className="font-bold text-primary" to="/register">Register</Link></p>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "pasien" });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", submit: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Nama lengkap wajib diisi.";
    if (!form.email.trim()) nextErrors.email = "Email wajib diisi.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = "Format email tidak valid.";
    if (!form.password) nextErrors.password = "Password wajib diisi.";
    else if (form.password.length < 8) nextErrors.password = "Password minimal 8 karakter.";
    else if (!/[A-Z]/.test(form.password)) nextErrors.password = "Password harus memiliki huruf besar.";
    else if (!/[a-z]/.test(form.password)) nextErrors.password = "Password harus memiliki huruf kecil.";
    else if (!/\d/.test(form.password)) nextErrors.password = "Password harus memiliki angka.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const registered = await authService.register({
        ...form,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase()
      });
      Toast.success("Registrasi berhasil, lanjut verifikasi email");
      navigate("/verify-email", {
        state: {
          email: form.email.trim().toLowerCase(),
          verificationToken: registered?.verification_token || ""
        }
      });
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const validationMessage = Array.isArray(detail) ? detail[0]?.msg?.replace(/^Value error, /, "") : "";
      const message = typeof detail === "string" ? detail : validationMessage || error?.message || "Registrasi gagal";
      const isDuplicateEmail = error?.response?.data?.code === "EMAIL_EXISTS" || message.toLowerCase().includes("email sudah terdaftar");
      setErrors((current) => ({
        ...current,
        ...(isDuplicateEmail ? { email: "Email sudah terdaftar. Gunakan email lain." } : { submit: message })
      }));
      Toast.error(isDuplicateEmail ? "Email sudah terdaftar. Gunakan email lain." : message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell title="Register" subtitle="Buat akun pasien untuk belanja obat dan upload resep.">
      <form className="space-y-4" onSubmit={submit} noValidate>
        <label className="block text-sm font-bold text-muted">
          Nama lengkap
          <input
            className="field mt-2"
            placeholder="Masukkan nama lengkap"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            required
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <span className="mt-1 block text-xs text-red-600">{errors.name}</span>}
        </label>
        <label className="block text-sm font-bold text-muted">
          Email
          <input
            className="field mt-2"
            type="email"
            placeholder="nama@email.com"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            required
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <span className="mt-1 block text-xs text-red-600">{errors.email}</span>}
        </label>
        <label className="block text-sm font-bold text-muted">
          Password
          <input
            className="field mt-2"
            type="password"
            placeholder="Contoh: Password123"
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
            minLength={8}
            required
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && <span className="mt-1 block text-xs text-red-600">{errors.password}</span>}
          {!errors.password && <span className="mt-1 block text-xs text-muted">Minimal 8 karakter, berisi huruf besar, huruf kecil, dan angka.</span>}
        </label>
        {errors.submit && <p className="text-sm font-semibold text-red-600">{errors.submit}</p>}
        <button className="btn-primary w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Mendaftarkan..." : "Daftar"}
        </button>
        <p className="text-center text-sm text-muted">
          Sudah punya akun? <Link className="font-bold text-primary" to="/login">Masuk</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState(location.state?.verificationToken || "");
  const submit = async (event) => {
    event.preventDefault();
    try {
      await authService.verifyEmail({ code });
      Toast.success("Email berhasil diverifikasi");
      navigate("/login");
    } catch (error) {
      Toast.error(error?.response?.data?.detail || error?.message || "Verifikasi email gagal");
    }
  };
  return (
    <AuthShell title="Verify Email" subtitle={`Masukkan kode verifikasi${location.state?.email ? ` untuk ${location.state.email}` : ""}.`}>
      <form className="space-y-4" onSubmit={submit}>
        <div className="flex items-center gap-3 rounded-2xl bg-surface-low p-4 text-primary"><FiShield /><span className="font-bold">{code ? "Token mode development sudah diisi otomatis." : "Masukkan token verifikasi yang diterima."}</span></div>
        <input className="field" placeholder="Kode verifikasi" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn-primary w-full">Verifikasi</button>
      </form>
    </AuthShell>
  );
}
