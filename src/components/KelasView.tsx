import React, { useState } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  School,
  Save,
  X,
  ShieldAlert,
  UserCheck,
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
import { Kelas, Guru } from '../types';

export default function KelasView() {
  const [search, setSearch] = useState<string>('');
  const [filterTingkat, setFilterTingkat] = useState<string>('all');

  // Load state from DB
  const [kelas, setKelas] = useState<Kelas[]>(() => db.getKelas());
  const gurus = db.getGurus().filter(g => g.status === 'active');

  // Permission Gates & Role Check
  const isGuru = db.isGuru();
  const isWaliKelas = db.isWaliKelas();
  const homeroomClass = db.getHomeroomClass();
  const teacherClasses = db.getTeacherClasses();

  const canCreate = !isWaliKelas && !isGuru && db.hasPermission('kelas.create');
  const canUpdate = !isWaliKelas && !isGuru && db.hasPermission('kelas.update');
  const canDelete = !isWaliKelas && !isGuru && db.hasPermission('kelas.delete');

  // Modal form states
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);

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
  const [nama, setNama] = useState<string>('');
  const [tingkat, setTingkat] = useState<'X' | 'XI' | 'XII'>('X');
  const [jurusan, setJurusan] = useState<string>('MIPA');
  const [waliKelasId, setWaliKelasId] = useState<string>('');
  const [tahunAjaran, setTahunAjaran] = useState<string>('2025/2026');

  // RLS / RBAC Data scoping:
  // Role Guru ONLY sees classes they teach
  // Role Wali Kelas ONLY sees homeroom class
  let activeKelasList = kelas;
  if (isGuru) {
    const teacherClassIds = new Set(teacherClasses.map(k => k.id));
    activeKelasList = kelas.filter(k => teacherClassIds.has(k.id));
  } else if (isWaliKelas && homeroomClass) {
    activeKelasList = kelas.filter(k => k.id === homeroomClass.id);
  }

  const filteredKelas = activeKelasList.filter(k => {
    const matchesSearch = k.nama.toLowerCase().includes(search.toLowerCase()) || k.jurusan.toLowerCase().includes(search.toLowerCase());
    const matchesTingkat = filterTingkat === 'all' || k.tingkat === filterTingkat;
    return matchesSearch && matchesTingkat;
  });

  const openAddModal = () => {
    setEditingKelas(null);
    setNama('');
    setTingkat('X');
    setJurusan('MIPA');
    setWaliKelasId(gurus[0]?.id || '');
    setTahunAjaran('2025/2026');
    setShowModal(true);
  };

  const openEditModal = (k: Kelas) => {
    setEditingKelas(k);
    setNama(k.nama);
    setTingkat(k.tingkat);
    setJurusan(k.jurusan);
    setWaliKelasId(k.waliKelasId);
    setTahunAjaran(k.tahunAjaran);
    setShowModal(true);
  };

  const handleSaveKelas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !jurusan || !waliKelasId) return;

    let updatedKelas: Kelas[] = [];
    if (editingKelas) {
      updatedKelas = kelas.map(k =>
        k.id === editingKelas.id ? { ...k, nama, tingkat, jurusan, waliKelasId, tahunAjaran } : k
      );
      db.logActivity("Edit Kelas", `Mengubah data kelas ${nama}`);
    } else {
      const newKelas: Kelas = {
        id: `k-${Date.now()}`,
        nama,
        tingkat,
        jurusan,
        waliKelasId,
        tahunAjaran
      };
      updatedKelas = [...kelas, newKelas];
      db.logActivity("Tambah Kelas", `Menambahkan kelas baru ${nama}`);
    }

    db.setKelas(updatedKelas);
    setKelas(updatedKelas);
    setShowModal(false);
  };

  const handleExportExcel = () => {
    const headers = ["Nama Kelas", "Tingkat", "Jurusan", "Tahun Ajaran", "Wali Kelas", "Jumlah Siswa"];
    const keys = ["nama", "tingkat", "jurusan", "tahunAjaran", "waliNama", "jumlahSiswa"];
    
    const exportData = filteredKelas.map(k => {
      const wali = gurus.find(g => g.id === k.waliKelasId);
      const countSiswa = db.getSiswas().filter(s => s.kelasId === k.id && s.status === 'active').length;
      return {
        ...k,
        waliNama: wali ? wali.nama : '-',
        jumlahSiswa: countSiswa
      };
    });

    exportToExcel(exportData, headers, keys, "Data_Kelas");
    db.logActivity("Ekspor Kelas Excel", "Melakukan ekspor data kelas ke file Excel");
  };

  const handleExportPDF = () => {
    const headers = ["#", "Nama Kelas", "Tingkat", "Jurusan", "Tahun Ajaran", "Wali Kelas", "Jumlah Siswa"];
    const body = filteredKelas.map((k, idx) => {
      const wali = gurus.find(g => g.id === k.waliKelasId);
      const countSiswa = db.getSiswas().filter(s => s.kelasId === k.id && s.status === 'active').length;
      return [
        idx + 1,
        k.nama,
        k.tingkat,
        k.jurusan,
        k.tahunAjaran,
        wali ? wali.nama : '-',
        `${countSiswa} Siswa`
      ];
    });

    const activeUser = db.getCurrentUser();
    exportToPDF("Daftar Rombongan Belajar (Kelas) SMK Negeri 1 Jakarta", headers, body, "Data_Kelas", {
      subtitle: `Tahun Ajaran: 2026/2027 | Semester: Ganjil`,
      guruNama: activeUser.name,
      guruNip: activeUser.nip || '........................'
    });
    db.logActivity("Ekspor Kelas PDF", "Melakukan ekspor data kelas ke file PDF");
  };


  const handleDeleteKelas = (id: string, namaKelas: string) => {
    setDeleteId(id);
    setDeleteName(namaKelas);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setIsDeleting(true);

    setTimeout(() => {
      // Check relations: Does this class have registered students?
      const siswaList = db.getSiswas();
      const hasStudents = siswaList.some(s => s.kelasId === deleteId);

      // Does this class have schedules?
      const jadwalList = db.getJadwals();
      const hasSchedules = jadwalList.some(j => j.kelasId === deleteId);

      if (hasStudents) {
        showToast("Gagal menghapus: Masih terdapat siswa terdaftar di dalam kelas ini!", "error");
        setIsDeleting(false);
        setDeleteId(null);
        setDeleteName('');
        return;
      }

      if (hasSchedules) {
        showToast("Gagal menghapus: Kelas ini masih digunakan oleh jadwal mengajar aktif!", "error");
        setIsDeleting(false);
        setDeleteId(null);
        setDeleteName('');
        return;
      }

      try {
        const updated = kelas.filter(k => k.id !== deleteId);
        db.setKelas(updated);
        setKelas(updated);
        db.logActivity("Hapus Kelas", `Menghapus data kelas ${deleteName}`);
        showToast(`Berhasil menghapus kelas ${deleteName}!`, "success");
      } catch (err) {
        showToast("Terjadi kesalahan saat menghapus data kelas.", "error");
      } finally {
        setIsDeleting(false);
        setDeleteId(null);
        setDeleteName('');
      }
    }, 500); // 500ms simulated delay
  };

  return (
    <div className="space-y-6">
      {/* Read-only banner */}
      {!canCreate && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium">
          <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Mode Lihat-Saja (Read-Only):</strong> Akun Anda tidak memiliki izin untuk mengelola kelas. Hubungi Administrator untuk menambahkan kelas baru atau mengganti Wali Kelas.
          </span>
        </div>
      )}

      {/* Filter and controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kelas atau jurusan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-700"
            />
          </div>

          {/* Level Filter */}
          <select
            value={filterTingkat}
            onChange={(e) => setFilterTingkat(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-600 font-semibold"
          >
            <option value="all">Semua Tingkat</option>
            <option value="X">Tingkat X</option>
            <option value="XI">Tingkat XI</option>
            <option value="XII">Tingkat XII</option>
          </select>
        </div>

        {/* Action Button Strip */}
        <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
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
            elementId="kelas-grid-print"
            title="Daftar Rombongan Belajar / Kelas"
            permission="kelas.print"
            activityLogDetail="Mencetak daftar rombel kelas"
            variant="outline"
          />

          {/* Add Class Button */}
          {canCreate && (
            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-900/10 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Tambah Kelas Baru
            </button>
          )}
        </div>
      </div>

      {/* Grid of Classes (Bento Card Style) */}
      <div id="kelas-grid-print" className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-6">
        <PrintHeader
          title="DAFTAR ROMBONGAN BELAJAR / KELAS"
          subtitle="Data Kelas & Wali Kelas Sekolah"
          metadata={[
            { label: 'Total Kelas', value: `${filteredKelas.length} Rombel` },
            { label: 'Tingkat Filter', value: filterTingkat === 'all' ? 'Semua Tingkat' : `Tingkat ${filterTingkat}` }
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredKelas.length > 0 ? (
          filteredKelas.map((k) => {
            const wali = gurus.find(g => g.id === k.waliKelasId);
            const countSiswa = db.getSiswas().filter(s => s.kelasId === k.id && s.status === 'active').length;
            
            return (
              <div
                key={k.id}
                className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Header Card */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="font-mono text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase border border-emerald-100">
                        {k.tahunAjaran}
                      </span>
                      <h4 className="text-lg font-black text-slate-800 tracking-tight pt-1">{k.nama}</h4>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-500">
                      <School className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Core details */}
                  <div className="mt-4 space-y-2 text-xs font-semibold text-slate-600">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-400">Tingkat & Jurusan</span>
                      <span className="text-slate-800">{k.tingkat} - {k.jurusan}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-400">Jumlah Siswa</span>
                      <span className="text-slate-800 font-bold">{countSiswa} Siswa Aktif</span>
                    </div>

                    {/* Wali Kelas */}
                    <div className="pt-2">
                      <p className="text-[10px] uppercase font-mono text-slate-400">Wali Kelas</p>
                      {wali ? (
                        <div className="flex items-center gap-2 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <img
                            src={wali.foto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${wali.nip}`}
                            alt={wali.nama}
                            className="w-7 h-7 rounded-full bg-white border border-slate-200"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate text-[11px]">{wali.nama}</p>
                            <p className="text-[9px] text-slate-400 font-mono">NIP: {wali.nip}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-rose-500 mt-1 italic text-[11px] flex items-center gap-1">
                          Wali kelas belum ditentukan!
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                {canUpdate && (
                  <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-50 no-print">
                    <button
                      onClick={() => openEditModal(k)}
                      className="px-3 py-1.5 border border-slate-200 hover:border-blue-500 text-slate-600 hover:text-blue-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Ubah Kelas
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteKelas(k.id, k.nama)}
                        className="p-1.5 border border-slate-200 hover:border-rose-500 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                        title="Hapus Kelas"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center text-slate-400">
            Tidak ada data rombongan belajar (kelas) yang cocok dengan filter pencarian.
          </div>
        )}
        </div>

        <PrintFooter showKepalaSekolah={true} />
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-sm md:text-base">
                <School className="h-5 w-5 text-emerald-400" />
                {editingKelas ? 'Ubah Rombongan Belajar' : 'Tambah Rombongan Belajar'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveKelas} className="p-6 space-y-4">
              {/* Nama Kelas */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Nama Rombel / Kelas</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kelas XII IPA 1"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Tingkat */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Tingkat Kelas</label>
                  <select
                    value={tingkat}
                    onChange={(e) => setTingkat(e.target.value as 'X' | 'XI' | 'XII')}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  >
                    <option value="X">Kelas X (Sepuluh)</option>
                    <option value="XI">Kelas XI (Sebelas)</option>
                    <option value="XII">Kelas XII (Duabelas)</option>
                  </select>
                </div>

                {/* Jurusan */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Jurusan Kurikulum</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: MIPA, IPS, Bahasa"
                    value={jurusan}
                    onChange={(e) => setJurusan(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  />
                </div>
              </div>

              {/* Wali Kelas Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Wali Kelas Penanggungjawab</label>
                <select
                  value={waliKelasId}
                  onChange={(e) => setWaliKelasId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                >
                  <option value="">-- Pilih Wali Kelas --</option>
                  {gurus.map(g => (
                    <option key={g.id} value={g.id}>{g.nama} ({g.mapelUtama})</option>
                  ))}
                </select>
              </div>

              {/* Tahun Ajaran */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Tahun Ajaran</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 2025/2026"
                  value={tahunAjaran}
                  onChange={(e) => setTahunAjaran(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-900/10 transition-colors cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  Simpan Rombel
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
              Apakah Anda yakin ingin menghapus data kelas <span className="font-bold text-slate-800">{deleteName}</span>?
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
