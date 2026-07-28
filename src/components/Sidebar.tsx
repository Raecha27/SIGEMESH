import React from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  School,
  UserCheck,
  Calendar,
  BookOpen,
  ClipboardList,
  FileSpreadsheet,
  BookMarked,
  Settings,
  Database,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  LogOut
} from 'lucide-react';
import { Permission } from '../types';
import { db } from '../utils/storage';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefresh: () => void;
  onLogout?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
}

export default function Sidebar({
  collapsed,
  setCollapsed,
  activeTab,
  setActiveTab,
  onRefresh,
  onLogout
}: SidebarProps) {
  const settings = db.getSettings();
  const currentUser = db.getCurrentUser();
  const roles = db.getRoles();
  const currentRole = roles.find(r => r.id === currentUser.roleId);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
    { id: 'guru', label: 'Data Guru', icon: Users, permission: 'guru.view' },
    { id: 'kelas', label: 'Data Kelas', icon: School, permission: 'kelas.view' },
    { id: 'siswa', label: 'Data Siswa', icon: GraduationCap, permission: 'siswa.view' },
    { id: 'mapel', label: 'Mata Pelajaran', icon: BookOpen, permission: 'kelas.view' },
    { id: 'jadwal', label: 'Jadwal Mengajar', icon: Calendar, permission: 'jadwal.view' },
    { id: 'absensi', label: 'Absensi Siswa', icon: UserCheck, permission: 'absensi.view' },
    { id: 'materi', label: 'Materi Pembelajaran', icon: BookMarked, permission: 'materi.view' },
    { id: 'jurnal', label: 'Jurnal Mengajar', icon: ClipboardList, permission: 'jurnal.view' },
    { id: 'nilai', label: 'Daftar Nilai', icon: FileSpreadsheet, permission: 'nilai.view' },
    { id: 'rekap-nilai', label: 'Rekap Nilai', icon: FileSpreadsheet, permission: 'laporan.view' },
    { id: 'rekap-absensi', label: 'Rekap Absensi', icon: UserCheck, permission: 'laporan.view' },
    { id: 'rekap-jurnal', label: 'Rekap Jurnal Mengajar', icon: ClipboardList, permission: 'laporan.view' },
    { id: 'pengaturan', label: 'Pengaturan Sekolah', icon: Settings, permission: 'setting.update' },
    { id: 'database', label: 'Panduan DB & Dev', icon: Database } // accessible to reviewer always
  ];

  const isGuru = db.isGuru();
  const isWaliKelas = db.isWaliKelas();

  const filteredItems = menuItems
    .map(item => {
      if (item.id === 'jadwal' && isWaliKelas) {
        return { ...item, label: 'Jadwal Kelas Perwalian' };
      }
      return item;
    })
    .filter(item => {
      // Requirement 9: Sembunyikan Data Guru dan Panduan DB & Dev untuk Role Guru / Pengajar
      if (isGuru && !db.hasPermission('guru.view') && (item.id === 'guru' || item.id === 'database')) {
        return false;
      }
      // Requirement 7: Sembunyikan Jurnal Mengajar dan Panduan DB & Dev untuk Wali Kelas
      if (isWaliKelas && (item.id === 'jurnal' || item.id === 'database')) {
        return false;
      }
      if (!item.permission) return true;
      return db.hasPermission(item.permission);
    });

  return (
    <aside
      className={`bg-slate-900 text-slate-200 min-h-screen transition-all duration-300 flex flex-col justify-between border-r border-slate-800 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
      id="sidebar"
    >
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Header Logo */}
          <div className="p-5 flex items-center justify-between border-b border-slate-800/80">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-blue-500/20">
                <GraduationCap className="h-5 w-5" />
              </div>
              {!collapsed && (
                <span className="font-bold text-white tracking-tight text-base">
                  AssistantPro
                </span>
              )}
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg hidden md:block transition-colors"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Menu Navigation */}
          <div className="px-3 py-4 text-slate-500 text-[10px] uppercase font-bold tracking-widest px-4 mb-1">
            {!collapsed ? "Menu Utama" : "Menu"}
          </div>
          <nav className="px-3 space-y-1">
            {filteredItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    onRefresh();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={item.label}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer and User Info Capsule */}
        <div className="p-4 bg-slate-950/50 mt-auto border-t border-slate-800/80">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=budi"}
              alt="Avatar"
              className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800/80 flex-shrink-0"
            />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{currentUser.name.split(',')[0]}</p>
                <p className="text-[10px] text-slate-500 truncate">{currentRole?.name}</p>
              </div>
            )}
          </div>
          
          <button
            onClick={() => {
              if (onLogout) onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 mt-3 bg-slate-900 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-700/50 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            title="Keluar dari Aplikasi"
          >
            <LogOut className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
            {!collapsed && <span>Keluar / Logout</span>}
          </button>

          {!collapsed && (
            <div className="mt-2.5 text-[9px] text-slate-500 font-mono tracking-tighter truncate text-center">
              {settings.namaSekolah} • v1.0.0
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
