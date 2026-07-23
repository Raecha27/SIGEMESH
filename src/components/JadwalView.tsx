import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  MapPin,
  BookOpen,
  User,
  Users,
  X,
  Save,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Printer,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { db } from '../utils/storage';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { PrintHeader } from './print/PrintHeader';
import { PrintFooter } from './print/PrintFooter';
import { PrintButton } from './print/PrintButton';
import { Jadwal, Kelas, MataPelajaran, Guru } from '../types';

export default function JadwalView() {
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [selectedDay, setSelectedDay] = useState<string>('Senin');

  // DB States
  const [jadwals, setJadwals] = useState<Jadwal[]>(() => db.getJadwals());
  const kelasList = db.getKelas();
  const mapelList = db.getMapels();
  const gurus = db.getGurus().filter(g => g.status === 'active');

  // Permissions & Role Check
  const isGuru = db.isGuru();
  const isWaliKelas = db.isWaliKelas();
  const homeroomClass = db.getHomeroomClass();
  const teacherJadwals = db.getTeacherJadwals();

  const canCreate = !isGuru && !isWaliKelas && db.hasPermission('jadwal.create');
  const canDelete = !isGuru && !isWaliKelas && db.hasPermission('jadwal.delete');

  // Scoped schedule list for Role Guru / Wali Kelas
  const displayJadwals = isGuru
    ? teacherJadwals
    : isWaliKelas && homeroomClass
    ? jadwals.filter(j => j.kelasId === homeroomClass.id)
    : jadwals;

  // Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Delete confirm modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Form Fields
  const [hari, setHari] = useState<Jadwal['hari']>('Senin');
  const [jamMulai, setJamMulai] = useState<string>('07:30');
  const [jamSelesai, setJamSelesai] = useState<string>('09:00');
  const [mapelId, setMapelId] = useState<string>('');
  const [kelasId, setKelasId] = useState<string>('');
  const [ruangan, setRuangan] = useState<string>('');

  const days: Jadwal['hari'][] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const handleSaveJadwal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapelId || !kelasId || !ruangan) return;

    const newJadwal: Jadwal = {
      id: `j-${Date.now()}`,
      hari,
      jamMulai,
      jamSelesai,
      mapelId,
      kelasId,
      ruangan
    };

    const updated = [...jadwals, newJadwal];
    db.setJadwals(updated);
    setJadwals(updated);
    
    const mapelName = mapelList.find(m => m.id === mapelId)?.nama || '';
    const kelasName = kelasList.find(k => k.id === kelasId)?.nama || '';
    db.logActivity("Tambah Jadwal", `Menambah jadwal pelajaran ${mapelName} di ${kelasName} hari ${hari}`);

    setShowAddModal(false);
  };

  const handleExportExcel = () => {
    const headers = ["Hari", "Jam Mulai", "Jam Selesai", "Mata Pelajaran", "Kelas", "Guru", "Ruangan"];
    const keys = ["hari", "jamMulai", "jamSelesai", "mapelNama", "kelasNama", "guruNama", "ruangan"];
    
    const exportData = displayJadwals.map(j => {
      const mapel = mapelList.find(m => m.id === j.mapelId);
      const kelas = kelasList.find(k => k.id === j.kelasId);
      const guru = gurus.find(g => g.id === mapel?.guruId);
      return {
        ...j,
        mapelNama: mapel ? mapel.nama : '-',
        kelasNama: kelas ? kelas.nama : '-',
        guruNama: guru ? guru.nama : '-',
      };
    });

    exportToExcel(exportData, headers, keys, isWaliKelas ? `Jadwal_Kelas_${homeroomClass?.nama || 'Perwalian'}` : "Jadwal_Mengajar");
    db.logActivity("Ekspor Jadwal Excel", "Melakukan ekspor jadwal mengajar ke file Excel");
  };

  const handleExportPDF = () => {
    const headers = ["#", "Hari", "Waktu", "Mata Pelajaran", "Kelas", "Pendidik", "Ruangan"];
    const body = displayJadwals.map((j, idx) => {
      const mapel = mapelList.find(m => m.id === j.mapelId);
      const kelas = kelasList.find(k => k.id === j.kelasId);
      const guru = gurus.find(g => g.id === mapel?.guruId);
      return [
        idx + 1,
        j.hari,
        `${j.jamMulai} - ${j.jamSelesai}`,
        mapel ? mapel.nama : '-',
        kelas ? kelas.nama : '-',
        guru ? guru.nama : '-',
        j.ruangan || '-'
      ];
    });

    const activeUser = db.getCurrentUser();
    exportToPDF("Jadwal Kegiatan Belajar Mengajar (KBM) SMK Negeri 1 Jakarta", headers, body, "Jadwal_Mengajar", {
      subtitle: `Tahun Ajaran: 2026/2027 | Semester: Ganjil`,
      guruNama: activeUser.name,
      guruNip: activeUser.nip || '........................'
    });
    db.logActivity("Ekspor Jadwal PDF", "Melakukan ekspor jadwal mengajar ke file PDF");
  };


  const handleDeleteJadwal = (id: string, label: string) => {
    setDeleteId(id);
    setDeleteName(label);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setIsDeleting(true);

    setTimeout(() => {
      try {
        const updated = jadwals.filter(j => j.id !== deleteId);
        db.setJadwals(updated);
        setJadwals(updated);
        db.logActivity("Hapus Jadwal", `Menghapus jadwal mengajar: ${deleteName}`);
        showToast("Berhasil menghapus sesi jadwal pelajaran!", "success");
      } catch (err) {
        showToast("Terjadi kesalahan saat menghapus jadwal.", "error");
      } finally {
        setIsDeleting(false);
        setDeleteId(null);
        setDeleteName('');
      }
    }, 500); // 500ms simulated delay
  };

  return (
    <div className="space-y-6">
      {/* Non-admin banner */}
      {!canCreate && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium">
          <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Mode Lihat-Saja (Read-Only):</strong> Hanya Administrator Kurikulum yang diizinkan merilis, merevisi, atau menghapus jadwal pembelajaran KBM sekolah.
          </span>
        </div>
      )}

      {/* Mode controls & triggers */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Toggle Weekly vs Daily view */}
        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1 w-full sm:w-auto">
          <button
            onClick={() => setViewMode('weekly')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'weekly'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tampilan Mingguan
          </button>
          <button
            onClick={() => setViewMode('daily')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'daily'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Agenda Harian
          </button>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          {viewMode === 'daily' && (
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-600"
            >
              {days.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}

          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Unduh Excel
          </button>

          {/* PDF Export */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-rose-500" />
            Unduh PDF
          </button>

          {/* Print */}
          <PrintButton
            elementId="jadwal-content-print"
            title="Jadwal Kegiatan Belajar Mengajar"
            permission="jadwal.print"
            activityLogDetail="Mencetak jadwal pelajaran sekolah"
            variant="outline"
          />

          {canCreate && (
            <button
              onClick={() => {
                setMapelId(mapelList[0]?.id || '');
                setKelasId(kelasList[0]?.id || '');
                setRuangan('');
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-900/10 cursor-pointer transition-colors"
            >
              <Plus className="h-4 w-4" />
              Tambah Jadwal
            </button>
          )}
        </div>
      </div>

      {/* Printable Wrapper for Board/Agenda view */}
      <div id="jadwal-content-print" className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-6">
        <PrintHeader
          title="JADWAL KEGIATAN BELAJAR MENGAJAR (KBM)"
          subtitle={`Jadwal Pelajaran ${viewMode === 'daily' ? `Hari ${selectedDay}` : 'Mingguan'}`}
          metadata={[
            { label: 'Mode Tampilan', value: viewMode === 'daily' ? `Hari ${selectedDay}` : 'Mingguan (Senin - Sabtu)' },
            { label: 'Total Sesi KBM', value: `${jadwals.length} Sesi Terjadwal` }
          ]}
        />

      {/* 1. WEEKLY BOARD VIEW */}
      {viewMode === 'weekly' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {days.map((day) => {
            const dayJadwals = jadwals.filter(j => j.hari === day).sort((a,b) => a.jamMulai.localeCompare(b.jamMulai));
            return (
              <div key={day} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    Hari {day}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">{dayJadwals.length} Sesi KBM</span>
                </div>

                <div className="space-y-3">
                  {dayJadwals.length > 0 ? (
                    dayJadwals.map((j) => {
                      const mapel = mapelList.find(m => m.id === j.mapelId);
                      const kelas = kelasList.find(k => k.id === j.kelasId);
                      const guru = mapel ? gurus.find(g => g.id === mapel.guruId) : null;
                      
                      return (
                        <div
                          key={j.id}
                          className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2 relative group hover:ring-2 hover:ring-emerald-500/10 transition-all"
                        >
                          {/* Top row: Subject & Class */}
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-extrabold text-slate-800 text-xs">{mapel?.nama || 'Unknown'}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Kode: {mapel?.kode}</p>
                            </div>
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              {kelas?.nama}
                            </span>
                          </div>

                          {/* Meta: Clock & Room */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold pt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {j.jamMulai} - {j.jamSelesai}
                            </span>
                            <span className="flex items-center gap-1 font-mono">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {j.ruangan}
                            </span>
                          </div>

                          {/* Teacher Name */}
                          {guru && (
                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/50 text-[10px] text-slate-500">
                              <User className="h-3 w-3 text-slate-400" />
                              <span>{guru.nama}</span>
                            </div>
                          )}

                          {/* Admin Quick Delete */}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteJadwal(j.id, `${mapel?.nama || 'Mata Pelajaran'} - ${kelas?.nama || 'Kelas'} (${j.hari}, ${j.jamMulai})`)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                              title="Hapus Sesi"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-6">
                      Tidak ada jadwal sesi KBM di hari {day}.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. DAILY DETAIL LIST VIEW */}
      {viewMode === 'daily' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm max-w-4xl mx-auto">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <Calendar className="h-5 w-5 text-emerald-500" />
            <div>
              <h3 className="font-extrabold text-slate-800">Sesi Agenda Belajar Hari {selectedDay}</h3>
              <p className="text-xs text-slate-500">Tampilan berurutan kronologis jam pelajaran</p>
            </div>
          </div>

          <div className="space-y-4">
            {jadwals
              .filter(j => j.hari === selectedDay)
              .sort((a,b) => a.jamMulai.localeCompare(b.jamMulai))
              .map((j) => {
                const mapel = mapelList.find(m => m.id === j.mapelId);
                const kelas = kelasList.find(k => k.id === j.kelasId);
                const guru = mapel ? gurus.find(g => g.id === mapel.guruId) : null;

                return (
                  <div
                    key={j.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-emerald-200 transition-colors"
                  >
                    {/* Time block */}
                    <div className="flex items-center gap-2.5 text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200/60 px-3 py-1.5 rounded-lg shadow-xs">
                      <Clock className="h-4 w-4 text-emerald-500" />
                      <span>{j.jamMulai} - {j.jamSelesai}</span>
                    </div>

                    {/* Lesson Core Info */}
                    <div className="mt-3 sm:mt-0 flex-1 sm:px-6">
                      <h4 className="text-sm font-bold text-slate-800">{mapel?.nama}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 font-semibold">
                        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-slate-400" /> {guru?.nama}</span>
                        <span className="flex items-center gap-1 font-mono"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {j.ruangan}</span>
                      </div>
                    </div>

                    {/* Class badge & actions */}
                    <div className="mt-3 sm:mt-0 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Users className="h-3 w-3" />
                        {kelas?.nama}
                      </span>

                      {canDelete && (
                        <button
                          onClick={() => handleDeleteJadwal(j.id, `${mapel?.nama || 'Mata Pelajaran'} - ${kelas?.nama || 'Kelas'} (${j.hari}, ${j.jamMulai})`)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Sesi Jadwal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

            {jadwals.filter(j => j.hari === selectedDay).length === 0 && (
              <div className="py-12 text-center text-slate-400 italic text-xs">
                Belum ada jadwal KBM yang dirancang untuk hari {selectedDay}.
              </div>
            )}
          </div>
        </div>
      )}

        <PrintFooter showKepalaSekolah={true} />
      </div>

      {/* Add Jadwal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <Calendar className="h-5 w-5 text-emerald-400" />
                Tambah Jadwal KBM Baru
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJadwal} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Hari */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Hari Belajar</label>
                  <select
                    value={hari}
                    onChange={(e) => setHari(e.target.value as Jadwal['hari'])}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-semibold"
                  >
                    {days.map(d => (
                      <option key={d} value={d}>Hari {d}</option>
                    ))}
                  </select>
                </div>

                {/* Jam Mulai */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Jam Mulai</label>
                  <input
                    type="text"
                    required
                    placeholder="07:30"
                    value={jamMulai}
                    onChange={(e) => setJamMulai(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-mono"
                  />
                </div>

                {/* Jam Selesai */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Jam Selesai</label>
                  <input
                    type="text"
                    required
                    placeholder="09:00"
                    value={jamSelesai}
                    onChange={(e) => setJamSelesai(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-mono"
                  />
                </div>

                {/* Mata Pelajaran */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Mata Pelajaran</label>
                  <select
                    required
                    value={mapelId}
                    onChange={(e) => setMapelId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-semibold"
                  >
                    <option value="">-- Pilih Mata Pelajaran --</option>
                    {mapelList.map(m => {
                      const g = gurus.find(guru => guru.id === m.guruId);
                      return (
                        <option key={m.id} value={m.id}>{m.nama} ({g?.nama.split(',')[0]})</option>
                      );
                    })}
                  </select>
                </div>

                {/* Kelas */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Rombongan Belajar (Kelas)</label>
                  <select
                    required
                    value={kelasId}
                    onChange={(e) => setKelasId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-semibold"
                  >
                    <option value="">-- Pilih Rombel --</option>
                    {kelasList.map(k => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Ruangan */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Nama Ruangan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Lab Fisika, R. XII-A"
                    value={ruangan}
                    onChange={(e) => setRuangan(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-semibold"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  Simpan Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-full">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm md:text-base">Konfirmasi Hapus</h3>
                <p className="text-[11px] text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus sesi jadwal <span className="font-bold text-slate-800">{deleteName}</span>?
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteId(null);
                  setDeleteName('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  'Ya, Hapus'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg animate-fade-in bg-white border-slate-200/80">
          <div className={`p-1 rounded-full ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          </div>
          <span className="text-xs font-bold text-slate-700">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
