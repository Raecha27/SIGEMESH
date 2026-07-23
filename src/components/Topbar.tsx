import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, Users, Compass, Clock, RotateCcw } from 'lucide-react';
import { db } from '../utils/storage';

interface TopbarProps {
  onUserChanged: () => void;
  activeTab: string;
}

export default function Topbar({ onUserChanged, activeTab }: TopbarProps) {
  const [time, setTime] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  // Load current profiles & user
  const profiles = db.getProfiles();
  const currentUserId = db.getCurrentUserId();
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

  const handleSwitchUser = (userId: string) => {
    db.setCurrentUserId(userId);
    db.logActivity("Switch User", `Berhasil berganti ke profil ${db.getProfiles().find(p => p.id === userId)?.name}`);
    setShowUserDropdown(false);
    onUserChanged();
  };

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

      {/* Right block with Simulator Switcher & Info */}
      <div className="flex items-center gap-4">
        {/* Real-time Clock */}
        <div className="hidden md:flex items-center gap-2 text-slate-500 text-[11px] font-semibold font-mono bg-slate-50 border border-slate-200/60 px-2.5 py-1.5 rounded">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{dateStr} • {time} WIB</span>
        </div>

        {/* Dynamic Simulator Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-amber-200/80 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            id="role-switcher-btn"
          >
            <Compass className="h-3.5 w-3.5 animate-spin-slow text-amber-600" />
            <span className="hidden sm:inline">Simulasi:</span>
            <span className="font-extrabold">{currentUser.name.split(',')[0]}</span>
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded shadow-lg border border-slate-200 py-1.5 z-50 animate-fade-in">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Simulator Multi-Role
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  Ganti profil untuk menguji tampilan menu & izin modifikasi RLS.
                </p>
              </div>

              <div className="p-1 space-y-0.5">
                {profiles.map(profile => {
                  const role = roles.find(r => r.id === profile.roleId);
                  const isSelected = profile.id === currentUserId;
                  return (
                    <button
                      key={profile.id}
                      onClick={() => handleSwitchUser(profile.id)}
                      className={`w-full text-left p-2 rounded transition-all flex items-center gap-2.5 ${
                        isSelected
                          ? 'bg-blue-50/70 border-l-4 border-blue-500'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <img
                        src={profile.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.id}`}
                        alt="Avatar"
                        className="w-7 h-7 rounded-full bg-slate-100 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{profile.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono truncate">
                          {role?.name} {profile.nip ? `• NIP: ${profile.nip}` : ''}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-100 rounded-b text-[9px] text-slate-400 font-mono text-center flex items-center justify-center gap-1">
                <RotateCcw className="h-3 w-3" />
                Semua perubahan data disimpan di LocalStorage.
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
