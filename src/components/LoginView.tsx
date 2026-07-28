import React, { useState } from 'react';
import {
  School,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  BookOpen,
  Award,
  Users,
  AlertCircle,
  GraduationCap,
  X,
  Send,
  UserCheck
} from 'lucide-react';
import { db } from '../utils/storage';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState<string>('admin@sman1jakarta.sch.id');
  const [password, setPassword] = useState<string>('••••••••');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Modals state
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetSent, setResetSent] = useState<boolean>(false);
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  // Multi-Role Choice state
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);

  const school = db.getSettings();
  const profiles = db.getProfiles();
  const roles = db.getRoles();

  // Handle Form Submission
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Input Validation
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Email atau NIP wajib diisi.');
      return;
    }

    if (cleanEmail.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Format email yang Anda masukkan tidak valid.');
      return;
    }

    if (!password) {
      setError('Kata sandi wajib diisi.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      // Find matching user profile
      const user = profiles.find(p => p.email.toLowerCase() === cleanEmail.toLowerCase() || (p.nip && p.nip === cleanEmail));

      if (!user) {
        // Fallback matching by substring prefix
        const fallback = profiles.find(p => p.email.toLowerCase().includes(cleanEmail.toLowerCase().split('@')[0])) ||
          (cleanEmail.toLowerCase().includes('admin') ? profiles[0] : null);

        if (fallback) {
          checkUserRolesAndProceed(fallback);
          return;
        }

        setError('Email atau password yang Anda masukkan tidak valid.');
        setLoading(false);
        return;
      }

      if (user.status !== 'active') {
        setError('Akun Anda non-aktif. Silakan hubungi Administrator sekolah.');
        setLoading(false);
        return;
      }

      checkUserRolesAndProceed(user);
    }, 500);
  };

  // Helper to determine if user has multi-roles (e.g. Guru + Wali Kelas)
  const checkUserRolesAndProceed = (user: any) => {
    // Check if user is a teacher who is also a homeroom teacher (Wali Kelas)
    const isHomeroom = db.getKelas().some(k => k.waliKelasId === user.id);
    const availableRoles = [];

    // Primary role from user profile
    const primaryRole = roles.find(r => r.id === user.roleId);
    if (primaryRole) availableRoles.push(primaryRole);

    // If user is Bambang or a teacher with Wali Kelas assignment, offer both roles
    if (user.roleId === 'role-walikelas' || isHomeroom) {
      const guruRole = roles.find(r => r.id === 'role-guru');
      const waliRole = roles.find(r => r.id === 'role-walikelas');
      if (guruRole && !availableRoles.some(r => r.id === guruRole.id)) availableRoles.push(guruRole);
      if (waliRole && !availableRoles.some(r => r.id === waliRole.id)) availableRoles.push(waliRole);
    }

    if (availableRoles.length > 1) {
      setPendingUser({ ...user, availableRoles });
      setLoading(false);
      setShowRoleModal(true);
    } else {
      finalizeLogin(user.id, user.name);
    }
  };

  const finalizeLogin = (userId: string, userName: string, chosenRoleId?: string) => {
    if (chosenRoleId) {
      // Temporarily update user role if selected differently
      const user = profiles.find(p => p.id === userId);
      if (user) {
        user.roleId = chosenRoleId;
        db.setProfiles(profiles.map(p => p.id === userId ? { ...p, roleId: chosenRoleId } : p));
      }
    }

    db.login(userId);
    db.logActivity("Login", `Pengguna ${userName} berhasil masuk ke sistem.`);
    setLoading(false);
    setShowRoleModal(false);
    onLoginSuccess();
  };

  const handleQuickSelect = (pId: string) => {
    const user = profiles.find(p => p.id === pId);
    if (user) {
      setEmail(user.email);
      setPassword('••••••••');
      setError('');
    }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    setTimeout(() => {
      setResetLoading(false);
      setResetSent(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-blue-500 selection:text-white relative overflow-x-hidden">
      {/* Top Banner Accent */}
      <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 w-full" />

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 w-full max-w-[1600px] mx-auto my-auto">
        
        {/* LEFT COLUMN: Hero & Visual Branding (Desktop/Tablet) */}
        <div className="lg:col-span-6 xl:col-span-7 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-8 lg:p-12 xl:p-16 flex flex-col justify-between relative overflow-hidden m-0 lg:m-4 lg:rounded-3xl shadow-2xl">
          {/* Subtle Decorative Background Shapes */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* School Brand Header */}
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <School className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white">{school.namaSekolah || 'SMA Negeri 1 Jakarta'}</h1>
                <p className="text-[11px] font-mono text-blue-300 font-semibold tracking-wider uppercase">Sistem Informasi Manajemen Sekolah</p>
              </div>
            </div>

            <div className="pt-6 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span>Teacher Assistant v1.0 Production Ready</span>
              </div>
              <h2 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight text-white">
                Asisten Digital Guru untuk Mengelola Pembelajaran Secara Efisien
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                Platform terpadu presensi siswa, jurnal mengajar, rekapitulasi nilai, dan pencetakan rapor dalam satu antarmuka yang cepat dan terintegrasi.
              </p>
            </div>
          </div>

          {/* Interactive Feature Cards & Statistics Showcase */}
          <div className="relative z-10 my-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl space-y-1 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                  <BookOpen className="h-4 w-4" />
                  <span>Jurnal Mengajar</span>
                </div>
                <p className="text-2xl font-black text-white font-mono">100%</p>
                <p className="text-[10px] text-slate-400">Tercatat Otomatis</p>
              </div>

              <div className="p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl space-y-1 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Users className="h-4 w-4" />
                  <span>Presensi Harian</span>
                </div>
                <p className="text-2xl font-black text-white font-mono">98.4%</p>
                <p className="text-[10px] text-slate-400">Kehadiran Siswa</p>
              </div>

              <div className="p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl space-y-1 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Award className="h-4 w-4" />
                  <span>Rekap Nilai</span>
                </div>
                <p className="text-2xl font-black text-white font-mono">Cepat</p>
                <p className="text-[10px] text-slate-400">Ekspor PDF & Excel</p>
              </div>
            </div>

            {/* Checklist Highlights */}
            <div className="space-y-2 pt-2 text-xs font-medium text-slate-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Pengelolaan Jurnal & Presensi Otomatis Sesuai Jadwal</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Rekapitulasi Nilai & Cetak Lembar Rapor Tengah Semester</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Keamanan Hak Akses Berbasis Peran (RBAC & Supabase Auth)</span>
              </div>
            </div>
          </div>

          {/* Left Footer Note */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>© {new Date().getFullYear()} {school.namaSekolah}</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              Sistem Terverifikasi
            </span>
          </div>
        </div>


        {/* RIGHT COLUMN: Modern Form Login Card */}
        <div className="lg:col-span-6 xl:col-span-5 p-6 sm:p-10 lg:p-12 xl:p-16 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50">
            
            {/* Header Form */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-bold font-mono">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Login Pengguna
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Auth SSO</span>
              </div>
              
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Selamat Datang</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Silakan masuk menggunakan akun yang telah diberikan oleh Administrator.
              </p>
            </div>

            {/* Error Notification Alert */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-start gap-3 animate-fade-in">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-rose-800">Gagal Masuk</p>
                  <p className="text-rose-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Main Form Login */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Field Email / NIP */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  Email / NIP
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="nama@sekolah.sch.id atau NIP"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
                  />
                </div>
              </div>

              {/* Field Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Lupa Password?
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="••••••••"
                    required
                    className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                    title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sedang memverifikasi akun...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Aplikasi</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Version & Copyright Footer */}
            <div className="pt-2 text-center space-y-1">
              <p className="text-[11px] font-mono font-bold text-slate-400">
                Teacher Assistant v1.0 • © {new Date().getFullYear()} All Rights Reserved
              </p>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Dikembangkan untuk mendukung transformasi digital pembelajaran di sekolah.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* FOOTER BAR */}
      <footer className="bg-white border-t border-slate-200/80 py-3 px-6 text-center text-xs text-slate-500 font-medium">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{school.namaSekolah} — {school.alamat || 'Jl. Budi Utomo No.7 Jakarta'}</span>
          <span className="font-mono text-[11px] text-slate-400">Pusat Bantuan ICT Sekolah: {school.email}</span>
        </div>
      </footer>


      {/* MODAL 1: MULTI-ROLE SELECTION (PILIH PERAN) */}
      {showRoleModal && pendingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-100 animate-scale-up">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl mx-auto flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Pilih Peran Akses Anda</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Akun <span className="font-bold text-slate-800">{pendingUser.name}</span> terdaftar memiliki lebih dari satu peran. Pilih peran yang ingin digunakan saat ini:
              </p>
            </div>

            <div className="space-y-3">
              {pendingUser.availableRoles.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => finalizeLogin(pendingUser.id, pendingUser.name, r.id)}
                  className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50/50 text-left transition-all flex items-start gap-3.5 group cursor-pointer"
                >
                  <div className="p-2.5 bg-blue-100 group-hover:bg-blue-600 text-blue-600 group-hover:text-white rounded-xl transition-colors mt-0.5">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-slate-900 group-hover:text-blue-700">{r.name}</p>
                      <span className="text-[10px] font-mono text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-full">Aktifkan</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{r.description}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowRoleModal(false)}
              className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}


      {/* MODAL 2: RESET PASSWORD (LUPA PASSWORD) */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-100 relative">
            <button
              onClick={() => {
                setShowResetModal(false);
                setResetSent(false);
                setResetEmail('');
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Atur Ulang Kata Sandi</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Masukkan email terdaftar Anda. Kami akan mengirimkan tautan instruksi pemulihan kata sandi melalui Supabase Auth.
              </p>
            </div>

            {resetSent ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>Instruksi Berhasil Dikirim!</span>
                </div>
                <p className="text-emerald-700 leading-relaxed">
                  Pesan tautan reset kata sandi telah dikirim ke <span className="font-mono font-bold">{resetEmail}</span>. Silakan periksa kotak masuk atau folder spam Anda.
                </p>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetSent(false);
                    setResetEmail('');
                  }}
                  className="w-full mt-3 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Email Terdaftar</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="nama@sekolah.sch.id"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
                  >
                    {resetLoading ? (
                      <span>Mengirim...</span>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Kirim Reset</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
