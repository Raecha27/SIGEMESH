import React, { useState } from 'react';
import {
  ClipboardList,
  Save,
  Plus,
  BookOpen,
  Users,
  Clock,
  History,
  AlertTriangle,
  FileSpreadsheet,
  ShieldAlert,
  Printer,
  Download
} from 'lucide-react';
import { db } from '../utils/storage';
import { exportToExcel, exportToPDF, showDirectToast } from '../utils/exportUtils';
import { PrintHeader } from './print/PrintHeader';
import { PrintFooter } from './print/PrintFooter';
import { PrintButton } from './print/PrintButton';
import { Jurnal, Kelas, MataPelajaran, Jadwal } from '../types';

export default function JurnalView() {
  // DB States
  const [jurnals, setJurnals] = useState<Jurnal[]>(() => db.getJurnals());
  const kelasList = db.getKelas();
  const mapelList = db.getMapels();
  const jadwalList = db.getJadwals();

  // Role Scoping & Gates
  const isGuru = db.isGuru();
  const currentTeacher = db.getTeacherProfile();
  const teacherClasses = db.getTeacherClasses();
  const teacherJadwals = db.getTeacherJadwals();

  const availableKelasList = isGuru ? teacherClasses : kelasList;
  const availableJadwalList = isGuru ? teacherJadwals : jadwalList;

  // Permission gates
  const canCreate = db.hasPermission('jurnal.create');

  // Scoped journals list
  const teacherMapelIds = new Set(db.getTeacherMapels().map(m => m.id));
  const activeJurnals = isGuru
    ? jurnals.filter(j => teacherMapelIds.has(j.mapelId) || (currentTeacher && j.diisiOleh === currentTeacher.id))
    : jurnals;

  // Form Fields
  const [kelasId, setKelasId] = useState<string>('');
  const [mapelId, setMapelId] = useState<string>('');
  const [jadwalId, setJadwalId] = useState<string>('');
  
  const [materi, setMateri] = useState<string>('');
  const [tujuanPembelajaran, setTujuanPembelajaran] = useState<string>('');
  const [kehadiranRingkasan, setKehadiranRingkasan] = useState<string>('Semua siswa hadir lengkap');
  const [kendala, setKendala] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');

  // Auto-derived fields based on selected schedule
  const selectedJadwal = jadwalList.find(j => j.id === jadwalId);
  const derivedHari = selectedJadwal?.hari || 'Senin';
  const derivedJam = selectedJadwal ? `${selectedJadwal.jamMulai} - ${selectedJadwal.jamSelesai}` : '07:30 - 09:00';

  const handleSaveJurnal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kelasId || !mapelId || !materi || !tujuanPembelajaran) {
      alert("Silakan lengkapi seluruh kolom wajib!");
      return;
    }

    const currentUser = db.getCurrentUser();
    const newJurnal: Jurnal = {
      id: `jur-${Date.now()}`,
      tanggal: new Date().toISOString().split('T')[0],
      hari: derivedHari,
      jam: derivedJam,
      mapelId,
      kelasId,
      materi,
      tujuanPembelajaran,
      kehadiranRingkasan,
      kendala: kendala || undefined,
      catatan: catatan || undefined,
      diisiOleh: currentUser.id
    };

    const updated = [newJurnal, ...jurnals];
    db.setJurnals(updated);
    setJurnals(updated);

    const kName = kelasList.find(k => k.id === kelasId)?.nama || '';
    db.logActivity("Isi Jurnal", `Mengisi jurnal mengajar untuk kelas ${kName}`);
    alert("Jurnal KBM harian berhasil disimpan!");

    // Reset Form
    setMateri('');
    setTujuanPembelajaran('');
    setKehadiranRingkasan('Semua siswa hadir lengkap');
    setKendala('');
    setCatatan('');
  };

  const handleExportExcel = () => {
    const headers = ["Tanggal", "Hari", "Jam Pelajaran", "Mata Pelajaran", "Kelas", "Materi Ajar", "Tujuan Pembelajaran", "Ringkasan Kehadiran", "Kendala", "Catatan"];
    const keys = ["tanggal", "hari", "jam", "mapelNama", "kelasNama", "materi", "tujuanPembelajaran", "kehadiranRingkasan", "kendala", "catatan"];
    
    const exportData = activeJurnals.map(j => {
      const mapel = mapelList.find(m => m.id === j.mapelId);
      const kelas = kelasList.find(k => k.id === j.kelasId);
      return {
        ...j,
        mapelNama: mapel ? mapel.nama : '-',
        kelasNama: kelas ? kelas.nama : '-',
        kendala: j.kendala || '-',
        catatan: j.catatan || '-'
      };
    });

    exportToExcel(exportData, headers, keys, "Jurnal_Mengajar_Guru");
    db.logActivity("Ekspor Jurnal Excel", "Melakukan ekspor jurnal mengajar ke file Excel");
  };

  const handleExportPDF = () => {
    if (!db.hasPermission('jurnal.print')) {
      showDirectToast("Anda tidak memiliki hak akses untuk mengekspor Jurnal! (jurnal.print)", "error");
      return;
    }
    const headers = ["#", "Tanggal/Jam", "Mapel & Kelas", "Materi & Kegiatan", "Ringkasan Hadir"];
    const body = jurnals.map((j, idx) => {
      const mapel = mapelList.find(m => m.id === j.mapelId);
      const kelas = kelasList.find(k => k.id === j.kelasId);
      return [
        idx + 1,
        `${j.tanggal}\n${j.jam}`,
        `${mapel ? mapel.nama : '-'}\nKelas: ${kelas ? kelas.nama : '-'}`,
        `Materi: ${j.materi}\nTujuan: ${j.tujuanPembelajaran}`,
        j.kehadiranRingkasan
      ];
    });

    const activeUser = db.getCurrentUser();
    exportToPDF("Jurnal Mengajar & Agenda Harian Guru SMK Negeri 1 Jakarta", headers, body, "Jurnal_Mengajar_Guru", {
      subtitle: `Tahun Ajaran: 2026/2027 | Semester: Ganjil`,
      guruNama: activeUser.name,
      guruNip: activeUser.nip || '........................'
    });
    db.logActivity("Ekspor Jurnal PDF", "Melakukan ekspor jurnal mengajar ke file PDF");
  };


  return (
    <div className="space-y-6">
      {/* RBAC Readonly view warning */}
      {!canCreate && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium">
          <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Akses Diperketat:</strong> Pengisian jurnal mengajar harian hanya diperuntukkan bagi Guru Pengajar aktif setelah sesi KBM selesai.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column (3 units wide): Journal logging form */}
        {canCreate && (
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4 h-fit">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <ClipboardList className="h-4.5 w-4.5 text-emerald-500 animate-pulse" />
              Input Jurnal Mengajar Baru
            </h3>

            <form onSubmit={handleSaveJurnal} className="space-y-4 text-xs font-semibold text-slate-600">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Kelas */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Pilih Kelas</label>
                  <select
                    required
                    value={kelasId}
                    onChange={(e) => setKelasId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {availableKelasList.map(k => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Sesi & Mapel */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Sesi KBM & Jadwal</label>
                  <select
                    required
                    value={jadwalId}
                    onChange={(e) => {
                      setJadwalId(e.target.value);
                      const sched = availableJadwalList.find(j => j.id === e.target.value);
                      if (sched) setMapelId(sched.mapelId);
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="">-- Pilih Sesi --</option>
                    {availableJadwalList
                      .filter(j => !kelasId || j.kelasId === kelasId)
                      .map(j => {
                        const mName = mapelList.find(m => m.id === j.mapelId)?.nama || 'Mapel';
                        return (
                          <option key={j.id} value={j.id}>
                            {j.hari} • {j.jamMulai}-{j.jamSelesai} ({mName})
                          </option>
                        );
                      })}
                  </select>
                </div>

                {/* Materi Pokok */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Materi Pokok Pembelajaran</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Turunan Fungsi Aljabar dan Latihan"
                    value={materi}
                    onChange={(e) => setMateri(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700"
                  />
                </div>

                {/* Tujuan Pembelajaran */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Tujuan & Pencapaian Belajar</label>
                  <textarea
                    required
                    placeholder="Contoh: Siswa dapat menghitung laju perubahan fungsi..."
                    value={tujuanPembelajaran}
                    onChange={(e) => setTujuanPembelajaran(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 h-16"
                  />
                </div>

                {/* Kehadiran */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Ringkasan Kehadiran Rinci</label>
                  <input
                    type="text"
                    required
                    value={kehadiranRingkasan}
                    onChange={(e) => setKehadiranRingkasan(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700"
                  />
                </div>

                {/* Kendala */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    Kendala / Hambatan Kelas (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Ada pemadaman listrik sebentar di pertengahan jam"
                    value={kendala}
                    onChange={(e) => setKendala(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-medium"
                  />
                </div>

                {/* Catatan Tindak Lanjut */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Solusi & Catatan Tindak Lanjut (Opsional)</label>
                  <textarea
                    placeholder="Tuliskan solusi yang direncanakan untuk pertemuan berikutnya..."
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 h-14 font-medium"
                  />
                </div>
              </div>

              {/* Save trigger */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-900/10 transition-colors cursor-pointer"
              >
                <Save className="h-4 w-4" />
                Simpan Jurnal KBM
              </button>
            </form>
          </div>
        )}

        {/* Right Column (2 units wide or full on read-only): Historical Logs Timeline */}
        <div className={`lg:col-span-3 space-y-4 ${!canCreate ? 'lg:col-span-5 max-w-4xl mx-auto' : ''}`}>
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <History className="h-4.5 w-4.5 text-slate-500" />
                Histori Jurnal Mengajar Sekolah
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-100 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="h-3 w-3 text-emerald-600" /> Excel
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-100 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                >
                  <Download className="h-3 w-3 text-rose-500" /> PDF
                </button>
                <PrintButton
                  elementId="jurnal-table-print"
                  title="Jurnal Catatan Mengajar Guru"
                  permission="jurnal.print"
                  activityLogDetail="Mencetak jurnal mengajar harian guru"
                  variant="outline"
                />
              </div>
            </div>

            <div id="jurnal-table-print" className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-6">
              <PrintHeader
                title="JURNAL CATATAN MENGAJAR GURU"
                subtitle="Laporan Agenda Harian Mengajar Guru di Kelas"
                metadata={[
                  { label: 'Total Catatan', value: `${activeJurnals.length} Agenda Jurnal` }
                ]}
              />
              {activeJurnals.length > 0 ? (
                activeJurnals.map((j) => {
                  const kName = kelasList.find(k => k.id === j.kelasId)?.nama || 'Umum';
                  const mName = mapelList.find(m => m.id === j.mapelId)?.nama || 'Mapel';
                  const teacher = db.getGurus().find(g => g.id === j.diisiOleh)?.nama || 'Guru Pengampu';

                  return (
                    <div
                      key={j.id}
                      className="border-l-4 border-emerald-500 pl-4 py-1 space-y-2.5 relative hover:bg-slate-50/50 p-2 rounded-r-lg transition-colors"
                    >
                      {/* Meta block */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                            Hari {j.hari}, {new Date(j.tanggal).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                          <h4 className="text-sm font-extrabold text-slate-800">
                            {mName} • <span className="text-emerald-700">{kName}</span>
                          </h4>
                        </div>
                        <span className="w-fit text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {j.jam}
                        </span>
                      </div>

                      {/* Content details */}
                      <div className="space-y-1.5 text-xs">
                        <p className="text-slate-700">
                          <span className="font-extrabold text-slate-500 uppercase text-[9px] font-mono block">Materi Pokok:</span>
                          <span className="font-semibold text-slate-800">{j.materi}</span>
                        </p>
                        <p className="text-slate-600">
                          <span className="font-extrabold text-slate-500 uppercase text-[9px] font-mono block">Tujuan Pembelajaran:</span>
                          <span>{j.tujuanPembelajaran}</span>
                        </p>
                        <p className="text-slate-600 font-semibold font-mono text-[10px] bg-slate-50 p-1.5 rounded-md border border-slate-100 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <span>Absensi: {j.kehadiranRingkasan}</span>
                        </p>

                        {/* Optional obstacles & suggestions */}
                        {j.kendala && (
                          <div className="bg-amber-50 border border-amber-200/60 rounded-lg p-2 text-[11px] text-amber-900 font-semibold flex gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-extrabold text-amber-800 uppercase text-[9px] tracking-wide font-mono">Hambatan Kelas:</p>
                              <p className="mt-0.5 leading-relaxed">{j.kendala}</p>
                              {j.catatan && (
                                <p className="mt-1.5 pt-1.5 border-t border-amber-200/60 font-medium italic text-amber-700 leading-normal">
                                  Tindak Lanjut: {j.catatan}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Teacher signature */}
                      <div className="text-[10px] text-slate-400 font-mono text-right border-t border-slate-100 pt-1.5">
                        Dicatat oleh: <span className="font-bold text-slate-500">{teacher}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-10">
                  Belum ada catatan jurnal mengajar harian di sekolah ini.
                </p>
              )}

              <PrintFooter showKepalaSekolah={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
