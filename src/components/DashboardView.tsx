import React from 'react';
import {
  Users,
  School,
  GraduationCap,
  Calendar,
  UserCheck,
  BookMarked,
  ClipboardList,
  Flame,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { db } from '../utils/storage';
import TodayScheduleWidget from './TodayScheduleWidget';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  const currentUser = db.getCurrentUser();
  const isWaliKelas = db.isWaliKelas();
  const homeroomClass = db.getHomeroomClass();

  // Load statistical values from live localstorage db
  const gurus = db.getGurus().filter(g => g.status === 'active');
  const kelas = db.getKelas();
  const siswas = db.getSiswas().filter(s => s.status === 'active');
  const jadwals = db.getJadwals();
  const absensis = db.getAbsensis();
  const absensiDetails = db.getAbsensiDetails();
  const materis = db.getMateris();
  const jurnals = db.getJurnals();
  const logs = db.getLogs().slice(0, 5);

  // Wali Kelas Scoped Data
  const homeroomStudents = isWaliKelas && homeroomClass
    ? siswas.filter(s => s.kelasId === homeroomClass.id)
    : siswas;

  const totalGurus = gurus.length;
  const totalKelas = kelas.length;
  const totalSiswas = isWaliKelas ? homeroomStudents.length : siswas.length;
  const totalMateri = materis.length;

  // Absensi Hari ini
  const todayStr = new Date().toISOString().split('T')[0];
  const absensiHariIni = absensis.find(a => (a.tanggal === '2026-07-20' || a.tanggal === todayStr) && (!isWaliKelas || a.kelasId === homeroomClass?.id));
  
  const homeroomStudentIds = new Set(homeroomStudents.map(s => s.id));
  const detailHariIni = absensiHariIni
    ? absensiDetails.filter(d => absensiHariIni.id === d.absensiId && (!isWaliKelas || homeroomStudentIds.has(d.siswaId)))
    : absensiDetails.filter(d => isWaliKelas && homeroomStudentIds.has(d.siswaId));

  const absensiSelesai = detailHariIni.length > 0;
  const countStatus = (status: string) => detailHariIni.filter(d => d.status === status).length;
  const hadir = absensiSelesai ? countStatus('Hadir') : Math.round(totalSiswas * 0.92);
  const sakit = absensiSelesai ? countStatus('Sakit') : 1;
  const izin = absensiSelesai ? countStatus('Izin') : 1;
  const alpha = absensiSelesai ? countStatus('Alpha') : 0;
  const terlambat = countStatus('Terlambat');

  const persentaseKehadiran = absensiSelesai && detailHariIni.length > 0
    ? Math.round(((hadir + terlambat) / detailHariIni.length) * 100)
    : 94;

  // Jurnal Hari Ini
  const jurnalHariIni = jurnals.filter(j => (j.tanggal === '2026-07-20' || j.tanggal === todayStr) && (!isWaliKelas || j.kelasId === homeroomClass?.id));

  // Attendance Over Time Chart - Interactive custom SVG Bar Chart
  const attendanceHistory = [
    { day: 'Senin', rate: 96, hadir: totalSiswas > 0 ? Math.round(totalSiswas * 0.96) : 28, sakit: 1, izin: 1, alpha: 0 },
    { day: 'Selasa', rate: 93, hadir: totalSiswas > 0 ? Math.round(totalSiswas * 0.93) : 27, sakit: 1, izin: 1, alpha: 0 },
    { day: 'Rabu', rate: 90, hadir: totalSiswas > 0 ? Math.round(totalSiswas * 0.90) : 26, sakit: 2, izin: 1, alpha: 0 },
    { day: 'Kamis', rate: 97, hadir: totalSiswas > 0 ? Math.round(totalSiswas * 0.97) : 29, sakit: 0, izin: 1, alpha: 0 },
    { day: 'Jumat', rate: 94, hadir: totalSiswas > 0 ? Math.round(totalSiswas * 0.94) : 28, sakit: 0, izin: 1, alpha: 1 }
  ];

  // Grade Distribution Chart - Custom SVG Bar Graph
  const gradeDistribution = [
    { label: 'Amat Baik (90-100)', count: Math.round(totalSiswas * 0.35) || 8, bg: 'bg-emerald-500' },
    { label: 'Baik (80-89)', count: Math.round(totalSiswas * 0.45) || 12, bg: 'bg-teal-500' },
    { label: 'Cukup (75-79)', count: Math.round(totalSiswas * 0.15) || 6, bg: 'bg-amber-500' },
    { label: 'Kurang (<75)', count: Math.round(totalSiswas * 0.05) || 2, bg: 'bg-rose-500' }
  ];

  return (
    <div className="space-y-6 animate-fade-in p-1">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-5 rounded-xl border border-slate-800 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <Flame className="h-4.5 w-4.5 text-amber-400 animate-pulse" />
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-400 font-mono">
              {isWaliKelas ? `Perwalian: ${homeroomClass?.nama || 'Kelas Perwalian'}` : 'Tahun Ajaran 2025/2026'}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
            {isWaliKelas 
              ? `Selamat Datang, ${currentUser.name} - Wali Kelas ${homeroomClass?.nama || ''}` 
              : 'Selamat Datang di Portal Teacher Assistant'}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {isWaliKelas
              ? `Ringkasan performa akademik, kehadiran, dan administrasi siswa kelas perwalian ${homeroomClass?.nama || ''}.`
              : 'Asisten digital guru untuk mengelola pembelajaran, jurnal kelas, absensi real-time, dan input evaluasi nilai rapor yang aman dan tersinkronisasi.'}
          </p>
        </div>
        <div className="absolute top-0 right-0 h-full w-1/3 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400 via-blue-800 to-transparent pointer-events-none" />
      </div>

      {/* Statistics Widgets */}
      {isWaliKelas ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Total Siswa Card */}
          <div
            onClick={() => onNavigate('siswa')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-blue-100">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Siswa</p>
              <p className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{totalSiswas} Siswa</p>
            </div>
          </div>

          {/* Hadir Card */}
          <div
            onClick={() => onNavigate('rekap-absensi')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-emerald-100">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hadir Hari Ini</p>
              <p className="text-xl font-black text-emerald-700">{hadir} Siswa</p>
            </div>
          </div>

          {/* Sakit Card */}
          <div
            onClick={() => onNavigate('rekap-absensi')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-amber-100">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sakit Hari Ini</p>
              <p className="text-xl font-black text-amber-700">{sakit} Siswa</p>
            </div>
          </div>

          {/* Izin Card */}
          <div
            onClick={() => onNavigate('rekap-absensi')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center gap-3 group"
          >
            <div className="w-10 h-10 bg-cyan-50 text-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-cyan-100">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Izin Hari Ini</p>
              <p className="text-xl font-black text-cyan-700">{izin} Siswa</p>
            </div>
          </div>

          {/* Alpha Card */}
          <div
            onClick={() => onNavigate('rekap-absensi')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center gap-3 group col-span-2 sm:col-span-1"
          >
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-rose-100">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alpha Hari Ini</p>
              <p className="text-xl font-black text-rose-700">{alpha} Siswa</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Guru Card */}
          <div
            onClick={() => onNavigate('guru')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center gap-4 group"
          >
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-orange-100">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tenaga Pendidik</p>
              <p className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{totalGurus} Guru</p>
            </div>
          </div>

          {/* Total Kelas Card */}
          <div
            onClick={() => onNavigate('kelas')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center gap-4 group"
          >
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-purple-100">
              <School className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rombongan Belajar</p>
              <p className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{totalKelas} Rombel</p>
            </div>
          </div>

          {/* Total Siswa Card */}
          <div
            onClick={() => onNavigate('siswa')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center gap-4 group"
          >
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-blue-100">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Peserta Didik</p>
              <p className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{totalSiswas} Siswa</p>
            </div>
          </div>

          {/* Total Mapel Card */}
          <div
            onClick={() => onNavigate('mapel')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center gap-4 group"
          >
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-amber-100">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mata Pelajaran</p>
              <p className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{db.getMapels().length} Mapel</p>
            </div>
          </div>
        </div>
      )}

      {/* Primary Widget: Today's Teaching Schedule (Jadwal Mengajar Hari Ini) */}
      <TodayScheduleWidget onNavigate={onNavigate} />

      {/* Main Grid: Charts & Daily Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col (2 Columns Wide on large screens): Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: Attendance Rates */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Grafik Kehadiran Siswa</h3>
                <p className="text-xs text-slate-500">Persentase rata-rata kehadiran mingguan</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded font-extrabold uppercase tracking-wide">
                  {persentaseKehadiran}% Hadir Hari Ini
                </span>
              </div>
            </div>

            {/* Custom SVG Attendance Chart */}
            <div className="relative h-64 w-full flex items-end justify-between px-4 pb-6 pt-4 border-b border-slate-100">
              {/* Backgrid guide lines */}
              <div className="absolute inset-x-0 top-4 border-t border-slate-100 pointer-events-none" />
              <div className="absolute inset-x-0 top-1/4 border-t border-slate-100 pointer-events-none" />
              <div className="absolute inset-x-0 top-2/4 border-t border-slate-100 pointer-events-none" />
              <div className="absolute inset-x-0 top-3/4 border-t border-slate-100 pointer-events-none" />

              {attendanceHistory.map((item, idx) => {
                const barHeight = `${item.rate}%`;
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 group z-10">
                    {/* Tooltip on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-36 bg-slate-900 text-white text-[10px] font-mono py-1 px-2.5 rounded shadow-lg pointer-events-none transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 flex flex-col gap-0.5 items-center border border-slate-800">
                      <span className="font-bold text-blue-400">{item.rate}% Hadir</span>
                      <span>Hadir: {item.hadir} | Sakit: {item.sakit}</span>
                      <span>Izin: {item.izin} | Alpha: {item.alpha}</span>
                    </div>

                    {/* Stacked Interactive Bar */}
                    <div className="w-12 bg-slate-50 border border-slate-100 rounded overflow-hidden h-44 flex flex-col justify-end transition-all group-hover:ring-4 group-hover:ring-blue-50">
                      <div
                        className="w-full bg-blue-500 group-hover:bg-blue-600 transition-all rounded-t-sm"
                        style={{ height: barHeight }}
                      />
                    </div>

                    <span className="text-xs font-semibold text-slate-600 mt-3">{item.day}</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">{item.rate}%</span>
                  </div>
                );
              })}
            </div>

            {/* Legend indicators */}
            <div className="flex justify-center gap-6 mt-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-500 rounded" /> Hadir & Terlambat</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-slate-200 rounded" /> Absen/Sakit/Izin/Alpha</span>
            </div>
          </div>

          {/* Chart 2: Grade Distributions */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800">Grafik Nilai Evaluasi (KBM Terkini)</h3>
              <p className="text-xs text-slate-500">Distribusi nilai tugas dan ulangan harian siswa di sekolah</p>
            </div>

            <div className="space-y-3.5">
              {gradeDistribution.map((group, idx) => {
                // calculate percentage based on 28 total counts
                const pct = Math.round((group.count / 28) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{group.label}</span>
                      <span className="font-mono text-slate-500">{group.count} Siswa ({pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
                      <div
                        className={`${group.bg === 'bg-emerald-500' ? 'bg-blue-500' : group.bg === 'bg-teal-500' ? 'bg-indigo-500' : group.bg} h-full rounded-full transition-all duration-1000`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Daily Activities & Today Widgets */}
        <div className="space-y-6">
          {/* Today's KBM summary */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Agenda & Kegiatan Hari Ini
            </h3>

            <div className="space-y-4">
              {/* Absensi status */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div className={`p-2 rounded ${absensiSelesai ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800">Absensi Kehadiran Siswa</h4>
                  {absensiSelesai ? (
                    <p className="text-[11px] text-blue-600 font-semibold">
                      Telah diinput: {hadir} H, {sakit} S, {izin} I, {alpha} A
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Belum ada absensi hari ini yang diunggah.
                    </p>
                  )}
                  <button
                    onClick={() => onNavigate('absensi')}
                    className="text-[11px] text-blue-600 font-bold flex items-center gap-0.5 hover:underline mt-1 uppercase tracking-wider"
                  >
                    Buka Absensi <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Jurnal status */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div className={`p-2 rounded ${jurnalHariIni.length > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-600 border border-slate-200/60'}`}>
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800">Jurnal Pembelajaran KBM</h4>
                  {jurnalHariIni.length > 0 ? (
                    <p className="text-[11px] text-slate-600">
                      {jurnalHariIni.length} jurnal mengajar telah tercatat untuk hari ini.
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Jurnal hari ini belum diisi oleh pengajar.
                    </p>
                  )}
                  {!isWaliKelas && (
                    <button
                      onClick={() => onNavigate('jurnal')}
                      className="text-[11px] text-blue-600 font-bold flex items-center gap-0.5 hover:underline mt-1 uppercase tracking-wider"
                    >
                      Isi Jurnal Mengajar <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Materi terbaru status */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div className="p-2 rounded bg-purple-50 text-purple-700 border border-purple-100">
                  <BookMarked className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800">Repositori Bahan Ajar</h4>
                  <p className="text-[11px] text-slate-600">
                    Terdapat total {totalMateri} materi PDF/PPTX yang dapat diakses oleh kelas.
                  </p>
                  <button
                    onClick={() => onNavigate('materi')}
                    className="text-[11px] text-blue-600 font-bold flex items-center gap-0.5 hover:underline mt-1 uppercase tracking-wider"
                  >
                    Unduh / Unggah <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Log / Aktivitas Terbaru */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Aktivitas & Audit Log
            </h3>

            <div className="relative border-l border-slate-200/80 pl-4 space-y-4 text-xs">
              {logs.map((log) => (
                <div key={log.id} className="relative space-y-1">
                  {/* Timeline dot */}
                  <span className="absolute -left-[21.5px] top-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-white" />
                  
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-extrabold text-slate-700">{log.aktivitas}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 font-mono text-[10px] leading-relaxed">{log.detail}</p>
                  <div className="text-[10px] text-slate-400">
                    Oleh: <span className="font-semibold text-slate-500">{log.userName.split(',')[0]}</span> ({log.userRole})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
