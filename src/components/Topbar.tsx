import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, User, LogOut } from 'lucide-react';
import { db } from '../utils/storage';

interface TopbarProps {
  onUserChanged?: () => void;
  onLogout?: () => void;
  activeTab: string;
}

export default function Topbar({ activeTab, onLogout }: TopbarProps) {
  const [time, setTime] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  // Load current profile & user
  const currentUser = db.getCurrentUser();
  const roles = db.getRoles();
  const currentRole = roles.find(r => r.id === currentUser.roleId);

  useEffect(() => {
    // Maintain a live clock
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard Sekolah';
      case 'guru':
        return 'Manajemen Tenaga Pendidik (Guru)';
      case 'kelas':
        return 'Manajemen Kelas & Rombel';
      case 'siswa':
        return 'Manajemen Peserta Didik (Siswa)';
      case 'mapel':
        return 'Kurikulum & Mata Pelajaran';
      case 'jadwal':
        return 'Penjadwalan KBM (Kalender)';
      case 'absensi':
        return 'Input & Rekap Absensi Harian';
      case 'materi':
        return 'Repositori Materi & Modul Ajar';
      case 'jurnal':
        return 'Jurnal KBM & Kendala Mengajar';
      case 'nilai':
        return 'Nilai Siswa & Evaluasi Belajar';
      case 'rekap-nilai':
        return 'Rekapitulasi Nilai & Evaluasi Rapor';
      case 'rekap-absensi':
        return 'Rekapitulasi Presensi & Kehadiran Kelas';
      case 'rekap-jurnal':
        return 'Rekapitulasi Jurnal Kegiatan Mengajar';
      case 'pengaturan':
        return 'Profil & Identitas Sekolah';
      case 'database':
        return 'Arsitektur PostgreSQL & Skema Supabase';
      default:
        return 'Teacher Assistant';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 z-10 sticky top-0 shadow-sm">
      {/* Title block */}
      <div className="flex items-center gap-3">
        <h2 className="text-base font-extrabold text-slate-800 tracking-tight">{getPageTitle()}</h2>
        <span className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold uppercase tracking-wider">
          <ShieldCheck className="h-3 w-3" />
          RBAC Secure
        </span>
      </div>

      {/* Right block with Clock and Active User Badge */}
      <div className="flex items-center gap-4">
        {/* Real-time Clock */}
        <div className="hidden md:flex items-center gap-2 text-slate-500 text-[11px] font-semibold font-mono bg-slate-50 border border-slate-200/60 px-2.5 py-1.5 rounded">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{dateStr} • {time} WIB</span>
        </div>

        {/* User Profile Badge & Logout Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded border border-slate-200/80 bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs">
            <img
              src={currentUser.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.id}`}
              alt="Avatar"
              className="w-6 h-6 rounded-full bg-slate-200 flex-shrink-0"
            />
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-slate-800 text-xs">{currentUser.name}</span>
              <span className="text-[9px] text-slate-500 font-mono font-medium">{currentRole?.name}</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (onLogout) onLogout();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded font-extrabold text-xs transition-all cursor-pointer shadow-2xs"
            title="Keluar / Logout"
          >
            <LogOut className="h-3.5 w-3.5 text-rose-600" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
