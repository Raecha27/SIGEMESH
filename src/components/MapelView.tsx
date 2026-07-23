import React, { useState } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Save,
  X,
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
import { MataPelajaran, Guru } from '../types';

export default function MapelView() {
  const [search, setSearch] = useState<string>('');

  // DB States
  const [mapels, setMapels] = useState<MataPelajaran[]>(() => db.getMapels());
  const gurus = db.getGurus().filter(g => g.status === 'active');

  // Permission Gates & Role Check
  const isGuru = db.isGuru();
  const isWaliKelas = db.isWaliKelas();
  const teacherMapels = db.getTeacherMapels();

  const canCreate = !isGuru && !isWaliKelas && db.hasPermission('mapel.create');
  const canUpdate = !isGuru && !isWaliKelas && db.hasPermission('mapel.update');
  const canDelete = !isGuru && !isWaliKelas && db.hasPermission('mapel.delete');

  // Modal form states
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingMapel, setEditingMapel] = useState<MataPelajaran | null>(null);

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
  const [kode, setKode] = useState<string>('');
  const [nama, setNama] = useState<string>('');
  const [guruId, setGuruId] = useState<string>('');
  const [kkm, setKkm] = useState<number>(75);

  const activeMapels = isGuru ? teacherMapels : mapels;

  const filteredMapels = activeMapels.filter(m => {
    return m.nama.toLowerCase().includes(search.toLowerCase()) || m.kode.toLowerCase().includes(search.toLowerCase());
  });

  const openAddModal = () => {
    setEditingMapel(null);
    setKode(`MAPEL-${Date.now().toString().slice(-4)}`);
    setNama('');
    setGuruId(gurus[0]?.id || '');
    setKkm(75);
    setShowModal(true);
  };

  const openEditModal = (m: MataPelajaran) => {
    setEditingMapel(m);
    setKode(m.kode);
    setNama(m.nama);
    setGuruId(m.guruId);
    setKkm(m.kkm);
    setShowModal(true);
  };

  const handleSaveMapel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kode || !nama || !guruId) return;

    let updated: MataPelajaran[] = [];
    if (editingMapel) {
      updated = mapels.map(m =>
        m.id === editingMapel.id ? { ...m, kode, nama, guruId, kkm } : m
      );
      db.logActivity("Edit Mapel", `Mengubah mata pelajaran ${nama}`);
    } else {
      const newMapel: MataPelajaran = {
        id: `m-${Date.now()}`,
        kode,
        nama,
        guruId,
        kkm
      };
      updated = [...mapels, newMapel];
      db.logActivity("Tambah Mapel", `Menambahkan mata pelajaran baru ${nama}`);
    }

    db.setMapels(updated);
    setMapels(updated);
    setShowModal(false);
  };

  const handleExportExcel = () => {
    const headers = ["Kode Mapel", "Nama Mata Pelajaran", "Guru Pengampu", "Kriteria Ketuntasan Minimal (KKM)"];
    const keys = ["kode", "nama", "guruNama", "kkm"];
    
    const exportData = filteredMapels.map(m => {
      const g = gurus.find(g => g.id === m.guruId);
      return {
        ...m,
        guruNama: g ? g.nama : '-'
      };
    });

    exportToExcel(exportData, headers, keys, "Data_Mata_Pelajaran");
    db.logActivity("Ekspor Mapel Excel", "Melakukan ekspor data mata pelajaran ke file Excel");
  };

  const handleExportPDF = () => {
    const headers = ["#", "Kode Mapel", "Nama Mata Pelajaran", "Guru Pengampu", "Nilai KKM"];
    const body = filteredMapels.map((m, idx) => {
      const g = gurus.find(g => g.id === m.guruId);
      return [
        idx + 1,
        m.kode,
        m.nama,
        g ? g.nama : '-',
        m.kkm
      ];
    });

    const activeUser = db.getCurrentUser();
    exportToPDF("Daftar Struktur Kurikulum / Mata Pelajaran SMK Negeri 1 Jakarta", headers, body, "Data_Mata_Pelajaran", {
      subtitle: `Tahun Ajaran: 2026/2027 | Semester: Ganjil`,
      guruNama: activeUser.name,
      guruNip: activeUser.nip || '........................'
    });
    db.logActivity("Ekspor Mapel PDF", "Melakukan ekspor data mata pelajaran ke file PDF");
  };


  const handleDeleteMapel = (id: string, namaMapel: string) => {
    setDeleteId(id);
    setDeleteName(namaMapel);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setIsDeleting(true);

    setTimeout(() => {
      // Check relations: Does any teaching schedule refer to this Mapel?
      const jadwalList = db.getJadwals();
      const hasSchedules = jadwalList.some(j => j.mapelId === deleteId);

      // Does any learning material refer to this Mapel?
      const materiList = db.getMateris();
      const hasMateris = materiList.some(m => m.mapelId === deleteId);

      if (hasSchedules) {
        showToast("Gagal menghapus: Mata pelajaran masih dikaitkan dengan jadwal mengajar aktif!", "error");
        setIsDeleting(false);
        setDeleteId(null);
        setDeleteName('');
        return;
      }

      if (hasMateris) {
        showToast("Gagal menghapus: Mata pelajaran ini masih memiliki berkas materi pembelajaran terunggah!", "error");
        setIsDeleting(false);
        setDeleteId(null);
        setDeleteName('');
        return;
      }

      try {
        const updated = mapels.filter(m => m.id !== deleteId);
        db.setMapels(updated);
        setMapels(updated);
        db.logActivity("Hapus Mapel", `Menghapus mata pelajaran ${deleteName}`);
        showToast(`Berhasil menghapus mata pelajaran ${deleteName}!`, "success");
      } catch (err) {
        showToast("Terjadi kesalahan saat menghapus mata pelajaran.", "error");
      } finally {
        setIsDeleting(false);
        setDeleteId(null);
        setDeleteName('');
      }
    }, 500); // 500ms simulated delay
  };

  return (
    <div className="space-y-6">
      {/* RBAC Banner */}
      {!canCreate && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium">
          <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Mode Lihat-Saja (Read-Only):</strong> Akun Anda tidak memiliki hak untuk menambah, mengubah, atau menghapus mata pelajaran. Silakan hubungi Administrator Kurikulum.
          </span>
        </div>
      )}

      {/* Control row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode atau nama mapel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
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
            elementId="mapel-table-print"
            title="Daftar Kurikulum Mata Pelajaran"
            permission="mapel.print"
            activityLogDetail="Mencetak daftar mata pelajaran"
            variant="outline"
          />

          {canCreate && (
            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-900/10 cursor-pointer transition-colors"
            >
              <Plus className="h-4 w-4" />
              Tambah Mapel Baru
            </button>
          )}
        </div>
      </div>

      {/* Table of Subjects */}
      <div id="mapel-table-print" className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
        <PrintHeader
          title="DAFTAR KURIKULUM MATA PELAJARAN"
          subtitle="Data Mata Pelajaran & Kriteria Ketuntasan Minimal (KKM)"
          metadata={[
            { label: 'Total Mapel', value: `${filteredMapels.length} Mata Pelajaran` }
          ]}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-xs font-mono uppercase">
                <th className="py-3.5 px-6 font-bold">Kode Mapel</th>
                <th className="py-3.5 px-6 font-bold">Mata Pelajaran</th>
                <th className="py-3.5 px-6 font-bold">Guru Pengampu</th>
                <th className="py-3.5 px-6 font-bold">KKM Sekolah</th>
                {canUpdate && <th className="py-3.5 px-6 font-bold text-right no-print">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredMapels.length > 0 ? (
                filteredMapels.map((m) => {
                  const guru = gurus.find(g => g.id === m.guruId);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Code */}
                      <td className="py-4 px-6 font-mono text-xs font-bold text-slate-700">
                        {m.kode}
                      </td>

                      {/* Name */}
                      <td className="py-4 px-6 font-bold text-slate-800">
                        {m.nama}
                      </td>

                      {/* Teacher assigned */}
                      <td className="py-4 px-6">
                        {guru ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={guru.foto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${guru.nip}`}
                              alt={guru.nama}
                              className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200"
                            />
                            <div>
                              <p className="font-semibold text-slate-800 text-xs">{guru.nama}</p>
                              <p className="text-[9px] text-slate-400 font-mono">NIP: {guru.nip}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-rose-500 italic text-xs">Belum ada pengampu!</span>
                        )}
                      </td>

                      {/* KKM Score */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center justify-center w-10 h-6 rounded-md font-mono text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
                          {m.kkm}
                        </span>
                      </td>

                      {/* Actions */}
                      {canUpdate && (
                        <td className="py-4 px-6 text-right no-print">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(m)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ubah Mapel"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteMapel(m.id, m.nama)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus Mapel"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Tidak ada mata pelajaran yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PrintFooter showKepalaSekolah={true} />
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <BookOpen className="h-5 w-5 text-emerald-400" />
                {editingMapel ? 'Ubah Mata Pelajaran' : 'Tambah Mata Pelajaran'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveMapel} className="p-5 space-y-4">
              {/* Kode */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Kode Unik Mapel</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: MAPEL-MAT"
                  value={kode}
                  onChange={(e) => setKode(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-mono text-slate-700"
                />
              </div>

              {/* Nama */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Matematika Peminatan"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-semibold text-slate-700"
                />
              </div>

              {/* Guru */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Guru Pengampu Utama</label>
                <select
                  value={guruId}
                  onChange={(e) => setGuruId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-semibold"
                >
                  <option value="">-- Pilih Guru Pengampu --</option>
                  {gurus.map(g => (
                    <option key={g.id} value={g.id}>{g.nama} ({g.mapelUtama})</option>
                  ))}
                </select>
              </div>

              {/* KKM */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">KKM Kelulusan (Kriteria Ketuntasan Minimal)</label>
                <input
                  type="number"
                  required
                  min={10}
                  max={100}
                  value={kkm}
                  onChange={(e) => setKkm(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-mono text-slate-700 font-bold"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-md transition-colors cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  Simpan Mapel
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
              Apakah Anda yakin ingin menghapus mata pelajaran <span className="font-bold text-slate-800">{deleteName}</span>?
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
