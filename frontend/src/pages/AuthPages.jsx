import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiLock, FiMail, FiShield } from "react-icons/fi";
import { authService } from "../services/authService";
import { Toast } from "../components/Toast";
import { roleDashboards } from "../config/roleMenus";

function AuthShell({ title, subtitle, children, panelClassName = "max-w-md", panelPadding = "p-8" }) {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      <section className="flex items-center justify-center p-6">
        <div className={`w-full ${panelClassName} rounded-3xl bg-white ${panelPadding} shadow-soft`}>
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
            <p className="text-sm font-bold uppercase">Selamat datang, di</p>
            <h3 className="mt-3 text-5xl font-extrabold">Klinik Makmur Jaya</h3>
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
    <AuthShell title="" subtitle="">
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
        <p className="text-center text-sm text-muted">Belum punya akun? <Link className="font-bold text-primary" to="/register">Register</Link></p>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", date_of_birth: "", gender: "", address: "" });
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
    if (!form.phone.trim()) nextErrors.phone = "Nomor telepon wajib diisi.";
    if (!form.date_of_birth) nextErrors.date_of_birth = "Tanggal lahir wajib diisi.";
    if (!form.gender) nextErrors.gender = "Jenis kelamin wajib dipilih.";
    if (!form.address.trim()) nextErrors.address = "Alamat wajib diisi.";
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
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        address: form.address.trim()
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
    <AuthShell title="Register" subtitle="Buat akun pasien untuk belanja obat dan upload resep." panelClassName="max-w-2xl" panelPadding="p-6">
      <form className="grid gap-3 md:grid-cols-2" onSubmit={submit} noValidate>
        <label className="block text-sm font-bold text-muted">
          Nama lengkap
          <input
            className="field mt-1 h-11"
            placeholder="Masukkan nama lengkap"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            required
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <span className="mt-1 block text-[11px] text-red-600">{errors.name}</span>}
        </label>
        <label className="block text-sm font-bold text-muted">
          Email
          <input
            className="field mt-1 h-11"
            type="email"
            placeholder="nama@gmail.com"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            required
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <span className="mt-1 block text-[11px] text-red-600">{errors.email}</span>}
        </label>
        <label className="block text-sm font-bold text-muted">
          Nomor telepon
          <input
            className="field mt-1 h-11"
            type="tel"
            placeholder="08xxxxxxxxxx"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            required
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone && <span className="mt-1 block text-[11px] text-red-600">{errors.phone}</span>}
        </label>
        <label className="block text-sm font-bold text-muted">
          Tanggal lahir
          <input
            className="field mt-1 h-11"
            type="date"
            value={form.date_of_birth}
            onChange={(e) => updateField("date_of_birth", e.target.value)}
            required
            aria-invalid={Boolean(errors.date_of_birth)}
          />
          {errors.date_of_birth && <span className="mt-1 block text-[11px] text-red-600">{errors.date_of_birth}</span>}
        </label>
        <label className="block text-sm font-bold text-muted">
          Jenis kelamin
          <select
            className="field mt-1 h-11"
            value={form.gender}
            onChange={(e) => updateField("gender", e.target.value)}
            required
            aria-invalid={Boolean(errors.gender)}
          >
            <option value="">Pilih jenis kelamin</option>
            <option value="male">Laki-laki</option>
            <option value="female">Perempuan</option>
            <option value="other">Lainnya</option>
          </select>
          {errors.gender && <span className="mt-1 block text-[11px] text-red-600">{errors.gender}</span>}
        </label>
        <label className="block text-sm font-bold text-muted">
          Password
          <input
            className="field mt-1 h-11"
            type="password"
            placeholder="password"
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
            minLength={8}
            required
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && <span className="mt-1 block text-[11px] text-red-600">{errors.password}</span>}
          {!errors.password && <span className="mt-1 block text-[11px] text-muted">Minimal 8 karakter, berisi huruf besar, huruf kecil, dan angka.</span>}
        </label>
        <label className="block text-sm font-bold text-muted md:col-span-2">
          Alamat
          <textarea
            className="field mt-1 h-20 resize-none"
            placeholder="Alamat lengkap"
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            required
            aria-invalid={Boolean(errors.address)}
          />
          {errors.address && <span className="mt-1 block text-[11px] text-red-600">{errors.address}</span>}
        </label>
        {errors.submit && <p className="text-sm font-semibold text-red-600">{errors.submit}</p>}
        <button className="btn-primary w-full md:col-span-2" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Mendaftarkan..." : "Daftar"}
        </button>
        <p className="text-center text-sm text-muted md:col-span-2">
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
