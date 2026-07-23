import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardView from './components/DashboardView';
import GuruView from './components/GuruView';
import KelasView from './components/KelasView';
import SiswaView from './components/SiswaView';
import MapelView from './components/MapelView';
import JadwalView from './components/JadwalView';
import AbsensiView from './components/AbsensiView';
import MateriView from './components/MateriView';
import JurnalView from './components/JurnalView';
import NilaiView from './components/NilaiView';
import RekapNilaiView from './components/RekapNilaiView';
import RekapAbsensiView from './components/RekapAbsensiView';
import RekapJurnalView from './components/RekapJurnalView';
import PengaturanView from './components/PengaturanView';
import DbGuideView from './components/DbGuideView';
import { db } from './utils/storage';
import { ShieldAlert, LayoutDashboard } from 'lucide-react';

export default function App() {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Re-trigger rendering context on user change
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const renderForbidden = (menuName: string, roleName?: string) => {
    const userRoleName = roleName || (db.isGuru() ? 'Guru / Pengajar' : db.isWaliKelas() ? 'Wali Kelas' : 'Pengguna');
    return (
      <div className="bg-white rounded-2xl p-8 md:p-12 border border-slate-200 shadow-sm text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-extrabold uppercase px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full">
            HTTP 403 Forbidden
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Akses Ditolak</h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            Role <strong>{userRoleName}</strong> tidak memiliki hak akses untuk membuka halaman{' '}
            <span className="font-bold text-slate-800">{menuName}</span>.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  };

  const renderActiveView = () => {
    const isGuru = db.isGuru();
    const isWaliKelas = db.isWaliKelas();

    // Requirement 9: Block direct access to forbidden pages for Role Guru
    if (isGuru && !db.hasPermission('guru.view') && (activeTab === 'guru' || activeTab === 'database')) {
      const pageNames: Record<string, string> = {
        guru: 'Data Guru',
        database: 'Panduan DB & Dev'
      };
      return renderForbidden(pageNames[activeTab] || activeTab, 'Guru / Pengajar');
    }

    // Requirement 7: Block direct URL/tab access to forbidden pages for Wali Kelas
    if (isWaliKelas && (activeTab === 'jurnal' || activeTab === 'database')) {
      const pageNames: Record<string, string> = {
        jurnal: 'Jurnal Mengajar',
        database: 'Panduan DB & Dev'
      };
      return renderForbidden(pageNames[activeTab] || activeTab, 'Wali Kelas');
    }

    switch (activeTab) {
      case 'dashboard':
        return <div key={refreshKey}><DashboardView onNavigate={setActiveTab} /></div>;
      case 'guru':
        return <div key={refreshKey}><GuruView /></div>;
      case 'kelas':
        return <div key={refreshKey}><KelasView /></div>;
      case 'siswa':
        return <div key={refreshKey}><SiswaView /></div>;
      case 'mapel':
        return <div key={refreshKey}><MapelView /></div>;
      case 'jadwal':
        return <div key={refreshKey}><JadwalView /></div>;
      case 'absensi':
        return <div key={refreshKey}><AbsensiView /></div>;
      case 'materi':
        return <div key={refreshKey}><MateriView /></div>;
      case 'jurnal':
        return <div key={refreshKey}><JurnalView /></div>;
      case 'nilai':
        return <div key={refreshKey}><NilaiView /></div>;
      case 'rekap-nilai':
        return <div key={refreshKey}><RekapNilaiView /></div>;
      case 'rekap-absensi':
        return <div key={refreshKey}><RekapAbsensiView /></div>;
      case 'rekap-jurnal':
        return <div key={refreshKey}><RekapJurnalView /></div>;
      case 'pengaturan':
        return <div key={refreshKey}><PengaturanView /></div>;
      case 'database':
        return <div key={refreshKey}><DbGuideView /></div>;
      default:
        return <div key={refreshKey}><DashboardView onNavigate={setActiveTab} /></div>;
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-800 antialiased font-sans">
      {/* Sidebar Panel */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={handleRefresh}
      />

      {/* Primary Layout Engine */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header containing metadata indicators and interactive role switchers */}
        <Topbar onUserChanged={handleRefresh} activeTab={activeTab} />

        {/* Centered Main viewport constrained on fluid desktop limits */}
        <main className="flex-1 p-6 overflow-y-auto max-w-[1400px] w-full mx-auto space-y-6">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
