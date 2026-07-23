import React, { useState } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Download,
  Upload,
  UserCheck,
  UserX,
  RefreshCw,
  Save,
  X,
  ShieldAlert,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Printer
} from 'lucide-react';
import { db } from '../utils/storage';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { PrintHeader } from './print/PrintHeader';
import { PrintFooter } from './print/PrintFooter';
import { PrintButton } from './print/PrintButton';
import { Siswa, Kelas } from '../types';

export default function SiswaView() {
  const [search, setSearch] = useState<string>('');
  const [filterKelas, setFilterKelas] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // DB States
  const [siswas, setSiswas] = useState<Siswa[]>(() => db.getSiswas());
  const kelasList = db.getKelas();

  // Permission Gates & Role Check
  const isGuru = db.isGuru();
  const isWaliKelas = db.isWaliKelas();
  const homeroomClass = db.getHomeroomClass();
  const teacherClasses = db.getTeacherClasses();
  const teacherClassIds = new Set(teacherClasses.map(k => k.id));

  // Available kelas list for dropdown
  const availableKelases = isGuru
    ? teacherClasses
    : isWaliKelas && homeroomClass
    ? [homeroomClass]
    : kelasList;

  const canCreate = !isWaliKelas && !isGuru && db.hasPermission('siswa.create');
  const canUpdate = !isWaliKelas && !isGuru && db.hasPermission('siswa.update');
  const canDelete = !isWaliKelas && !isGuru && db.hasPermission('siswa.delete');

  // Modals state
  const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
  const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showClassTransferModal, setShowClassTransferModal] = useState<boolean>(false);

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
  const [nis, setNis] = useState<string>('');
  const [nisn, setNisn] = useState<string>('');
  const [nama, setNama] = useState<string>('');
  const [jk, setJk] = useState<'L' | 'P'>('L');
  const [tempatLahir, setTempatLahir] = useState<string>('');
  const [tanggalLahir, setTanggalLahir] = useState<string>('');
  const [alamat, setAlamat] = useState<string>('');
  const [orangTua, setOrangTua] = useState<string>('');
  const [hpOrangTua, setHpOrangTua] = useState<string>('');
  const [kelasId, setKelasId] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'mutated' | 'graduated'>('active');
  const [photoUrl, setPhotoUrl] = useState<string>('');

  // Mass Class Migration
  const [sourceKelasId, setSourceKelasId] = useState<string>('');
  const [targetKelasId, setTargetKelasId] = useState<string>('');

  // Import text
  const [csvText, setCsvText] = useState<string>('');

  // Auto-set filterKelas to homeroom class for Wali Kelas
  React.useEffect(() => {
    if (isWaliKelas && homeroomClass) {
      setFilterKelas(homeroomClass.id);
    }
  }, [isWaliKelas, homeroomClass]);

  // Filters - Scoped for Role Guru and Wali Kelas
  let activeStudentList = siswas;
  if (isGuru) {
    activeStudentList = siswas.filter(s => teacherClassIds.has(s.kelasId));
  } else if (isWaliKelas && homeroomClass) {
    activeStudentList = siswas.filter(s => s.kelasId === homeroomClass.id);
  }

  const filteredSiswas = activeStudentList.filter(siswa => {
    const matchesSearch =
      siswa.nama.toLowerCase().includes(search.toLowerCase()) ||
      siswa.nis.includes(search) ||
      siswa.nisn.includes(search) ||
      siswa.orangTua.toLowerCase().includes(search.toLowerCase());
    const matchesKelas = filterKelas === 'all' || siswa.kelasId === filterKelas;
    const matchesStatus = filterStatus === 'all' || siswa.status === filterStatus;
    return matchesSearch && matchesKelas && matchesStatus;
  });

  const openAddModal = () => {
    setEditingSiswa(null);
    setNis('');
    setNisn('');
    setNama('');
    setJk('L');
    setTempatLahir('');
    setTanggalLahir('');
    setAlamat('');
    setOrangTua('');
    setHpOrangTua('');
    setKelasId(kelasList[0]?.id || '');
    setStatus('active');
    setPhotoUrl('');
    setShowAddEditModal(true);
  };

  const openEditModal = (s: Siswa) => {
    setEditingSiswa(s);
    setNis(s.nis);
    setNisn(s.nisn);
    setNama(s.nama);
    setJk(s.jk);
    setTempatLahir(s.tempatLahir);
    setTanggalLahir(s.tanggalLahir);
    setAlamat(s.alamat);
    setOrangTua(s.orangTua);
    setHpOrangTua(s.hpOrangTua);
    setKelasId(s.kelasId);
    setStatus(s.status);
    setPhotoUrl(s.foto || '');
    setShowAddEditModal(true);
  };

  const handleSaveSiswa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nis || !nisn || !nama || !kelasId) return;

    let updated: Siswa[] = [];
    if (editingSiswa) {
      updated = siswas.map(s =>
        s.id === editingSiswa.id
          ? {
              ...s,
              nis,
              nisn,
              nama,
              jk,
              tempatLahir,
              tanggalLahir,
              alamat,
              orangTua,
              hpOrangTua,
              kelasId,
              status,
              foto: photoUrl || s.foto
            }
          : s
      );
      db.logActivity("Edit Siswa", `Mengubah data siswa ${nama} (NIS: ${nis})`);
    } else {
      const newSiswa: Siswa = {
        id: `s-${Date.now()}`,
        nis,
        nisn,
        nama,
        jk,
        tempatLahir,
        tanggalLahir,
        alamat,
        orangTua,
        hpOrangTua,
        kelasId,
        status,
        foto: photoUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${nis}`
      };
      updated = [...siswas, newSiswa];
      db.logActivity("Tambah Siswa", `Menambahkan siswa baru ${nama} (NIS: ${nis})`);
    }

    db.setSiswas(updated);
    setSiswas(updated);
    setShowAddEditModal(false);
  };

  const handleDeleteSiswa = (id: string, namaSiswa: string) => {
    setDeleteId(id);
    setDeleteName(namaSiswa);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setIsDeleting(true);

    setTimeout(() => {
      try {
        // Safe delete: also clear references to avoid orphans
        // Clear related grades
        const currentNilais = db.getNilais();
        db.setNilais(currentNilais.filter(n => n.siswaId !== deleteId));

        // Clear related attendance details
        const currentAbsensiDetails = db.getAbsensiDetails();
        db.setAbsensiDetails(currentAbsensiDetails.filter(a => a.siswaId !== deleteId));

        const updated = siswas.filter(s => s.id !== deleteId);
        db.setSiswas(updated);
        setSiswas(updated);

        db.logActivity("Hapus Siswa", `Menghapus data siswa ${deleteName}`);
        showToast(`Berhasil menghapus siswa ${deleteName}!`, "success");
      } catch (err) {
        showToast("Terjadi kesalahan saat menghapus data siswa.", "error");
      } finally {
        setIsDeleting(false);
        setDeleteId(null);
        setDeleteName('');
      }
    }, 500); // 500ms simulated delay
  };

  // High-fidelity Excel and PDF exports
  const handleExportExcelReal = () => {
    const headers = ["NIS", "NISN", "Nama", "Jenis Kelamin", "Tempat Lahir", "Tanggal Lahir", "Alamat", "Orang Tua", "No HP Ortu", "Kelas", "Status"];
    const keys = ["nis", "nisn", "nama", "jk", "tempatLahir", "tanggalLahir", "alamat", "orangTua", "hpOrangTua", "kelasNama", "status"];
    
    const exportData = filteredSiswas.map(s => {
      const className = kelasList.find(k => k.id === s.kelasId)?.nama || 'Tidak Ada Kelas';
      return {
        ...s,
        jk: s.jk === 'L' ? 'Laki-laki' : 'Perempuan',
        kelasNama: className,
        status: s.status === 'active' ? 'Aktif' : s.status === 'graduated' ? 'Lulus' : 'Mutasi/Keluar'
      };
    });

    exportToExcel(exportData, headers, keys, 'Data_Siswa');
    db.logActivity("Ekspor Siswa Excel", "Melakukan ekspor data siswa ke file Excel");
  };

  const handleExportPDFReal = () => {
    const headers = ["#", "NIS", "NISN", "Nama Siswa", "L/P", "Kelas", "Orang Tua", "HP Ortu", "Status"];
    const body = filteredSiswas.map((s, idx) => {
      const className = kelasList.find(k => k.id === s.kelasId)?.nama || '-';
      return [
        idx + 1,
        s.nis,
        s.nisn,
        s.nama,
        s.jk,
        className,
        s.orangTua,
        s.hpOrangTua,
        s.status === 'active' ? 'Aktif' : s.status === 'graduated' ? 'Lulus' : 'Mutasi'
      ];
    });

    const activeUser = db.getCurrentUser();
    exportToPDF("Rekapitulasi Data Siswa SMK Negeri 1 Jakarta", headers, body, "Data_Siswa", {
      subtitle: `Tahun Ajaran: 2026/2027 | Semester: Ganjil`,
      kelas: filterKelas !== 'all' ? (kelasList.find(k => k.id === filterKelas)?.nama) : 'Semua Kelas',
      guruNama: activeUser.name,
      guruNip: activeUser.nip || '........................'
    });
    db.logActivity("Ekspor Siswa PDF", "Melakukan ekspor data siswa ke file PDF");
  };


  // CSV IMPORT Simulation
  const handleImportCSV = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText) return;

    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      alert("Format tidak valid! Minimal harus ada header dan satu baris data.");
      return;
    }

    // parsing mock CSV: nis,nisn,nama,jk,tempatLahir,tanggalLahir,alamat,orangTua,hpOrangTua
    const newSiswas: Siswa[] = [];
    let importCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length >= 4) {
        const parsedNis = cols[0].trim();
        const parsedNisn = cols[1].trim();
        const parsedNama = cols[2].trim();
        const parsedJk = cols[3].trim().toUpperCase() === 'P' ? 'P' : 'L';
        const parsedTempat = cols[4]?.trim() || 'Jakarta';
        const parsedTgl = cols[5]?.trim() || '2009-01-01';
        const parsedAlamat = cols[6]?.trim() || '-';
        const parsedOrtu = cols[7]?.trim() || '-';
        const parsedHp = cols[8]?.trim() || '08123456789';

        newSiswas.push({
          id: `s-imported-${Date.now()}-${i}`,
          nis: parsedNis,
          nisn: parsedNisn,
          nama: parsedNama,
          jk: parsedJk,
          tempatLahir: parsedTempat,
          tanggalLahir: parsedTgl,
          alamat: parsedAlamat,
          orangTua: parsedOrtu,
          hpOrangTua: parsedHp,
          kelasId: kelasId || kelasList[0]?.id || '',
          status: 'active',
          foto: `https://api.dicebear.com/7.x/adventurer/svg?seed=${parsedNis}`
        });
        importCount++;
      }
    }

    if (newSiswas.length > 0) {
      const merged = [...siswas, ...newSiswas];
      db.setSiswas(merged);
      setSiswas(merged);
      db.logActivity("Import Siswa", `Mengimpor ${importCount} siswa baru secara massal via CSV/Excel`);
      alert(`Berhasil mengimpor ${importCount} peserta didik baru!`);
      setShowImportModal(false);
      setCsvText('');
    }
  };

  // Mass Class Transfer Action
  const handleClassTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceKelasId || !targetKelasId || sourceKelasId === targetKelasId) {
      alert("Silakan pilih kelas sumber dan tujuan yang berbeda.");
      return;
    }

    const studentsToMove = siswas.filter(s => s.kelasId === sourceKelasId && s.status === 'active');
    if (studentsToMove.length === 0) {
      alert("Tidak ditemukan siswa aktif di kelas sumber.");
      return;
    }

    const sourceName = kelasList.find(k => k.id === sourceKelasId)?.nama || '';
    const targetName = kelasList.find(k => k.id === targetKelasId)?.nama || '';

    if (!confirm(`Pindahkan ${studentsToMove.length} siswa secara massal dari ${sourceName} ke ${targetName}?`)) return;

    const updated = siswas.map(s => {
      if (s.kelasId === sourceKelasId && s.status === 'active') {
        return { ...s, kelasId: targetKelasId };
      }
      return s;
    });

    db.setSiswas(updated);
    setSiswas(updated);
    db.logActivity("Migrasi Kelas", `Memindahkan secara massal ${studentsToMove.length} siswa dari ${sourceName} ke ${targetName}`);
    alert(`Sukses memindahkan ${studentsToMove.length} siswa ke kelas ${targetName}!`);
    setShowClassTransferModal(false);
  };

  return (
    <div className="space-y-6">
      {/* RBAC Mode View Banner */}
      {!canCreate && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium">
          <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Mode Lihat-Saja (Read-Only):</strong> Hanya Administrator atau Wali Kelas bersangkutan yang diizinkan memodifikasi biodata siswa, mengunggah foto, atau melakukan mutasi siswa.
          </span>
        </div>
      )}

      {/* Filter and bulk action toolbars */}
      <div className="flex flex-col xl:flex-row gap-4 items-stretch justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari NIS, Nama, Ortu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-700"
            />
          </div>

          {/* Kelas Filter */}
          <select
            value={filterKelas}
            disabled={isWaliKelas && availableKelases.length === 1}
            onChange={(e) => setFilterKelas(e.target.value)}
            className={`px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-600 font-semibold ${
              isWaliKelas && availableKelases.length === 1 ? 'bg-slate-100 cursor-not-allowed text-slate-500' : ''
            }`}
          >
            <option value="all">
              {isGuru ? `Semua Kelas Yang Diajar (${availableKelases.length})` : 'Semua Kelas'}
            </option>
            {availableKelases.map(k => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-600 font-semibold"
          >
            <option value="all">Semua Status Keaktifan</option>
            <option value="active">Siswa Aktif</option>
            <option value="mutated">Mutasi/Keluar</option>
            <option value="graduated">Lulus</option>
          </select>
        </div>

        {/* Action Button Strip */}
        <div className="flex flex-wrap gap-2 justify-end">
          {/* Excel Export */}
          <button
            onClick={handleExportExcelReal}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Unduh Excel
          </button>

          {/* PDF Export */}
          <button
            onClick={handleExportPDFReal}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-rose-500" />
            Unduh PDF
          </button>

          {/* Print */}
          <PrintButton
            elementId="siswa-table-print"
            title="Daftar Siswa & Peserta Didik"
            permission="siswa.print"
            activityLogDetail="Mencetak daftar data siswa"
            variant="outline"
          />

          {canCreate && (
            <>
              {/* CSV Import */}
              <button
                onClick={() => {
                  setKelasId(kelasList[0]?.id || '');
                  setCsvText('');
                  setShowImportModal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                <Upload className="h-3.5 w-3.5 text-emerald-600" />
                Impor Siswa (CSV)
              </button>

              {/* Class Transfer Tool */}
              <button
                onClick={() => {
                  setSourceKelasId('');
                  setTargetKelasId('');
                  setShowClassTransferModal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin-slow" />
                Pindah Kelas Massal
              </button>

              {/* Add Student */}
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-900/10 cursor-pointer transition-colors"
              >
                <Plus className="h-4 w-4" />
                Tambah Siswa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Student Table */}
      <div id="siswa-table-print" className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
        <PrintHeader
          title="DAFTAR PESERTA DIDIK / SISWA"
          subtitle="Data Siswa Terdaftar Sekolah"
          metadata={[
            { label: 'Total Siswa', value: `${filteredSiswas.length} Siswa` },
            { label: 'Kelas Filter', value: filterKelas === 'all' ? 'Semua Kelas' : (kelasList.find(k => k.id === filterKelas)?.nama || filterKelas) },
            { label: 'Status Filter', value: filterStatus === 'active' ? 'Aktif' : filterStatus === 'mutated' ? 'Mutasi' : filterStatus === 'graduated' ? 'Lulus' : 'Semua Status' }
          ]}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-xs font-mono uppercase">
                <th className="py-3.5 px-6 font-bold">Peserta Didik</th>
                <th className="py-3.5 px-6 font-bold">NIS & NISN</th>
                <th className="py-3.5 px-6 font-bold">Kelas</th>
                <th className="py-3.5 px-6 font-bold">Orang Tua & HP</th>
                <th className="py-3.5 px-4 font-bold text-center">Status</th>
                {canUpdate && <th className="py-3.5 px-6 font-bold text-right no-print">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredSiswas.length > 0 ? (
                filteredSiswas.map((siswa) => {
                  const className = kelasList.find(k => k.id === siswa.kelasId)?.nama || 'Unknown';
                  const isCurrentActive = siswa.status === 'active';
                  
                  return (
                    <tr key={siswa.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name, Gender, Birth info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={siswa.foto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${siswa.nis}`}
                            alt={siswa.nama}
                            className="w-10 h-10 rounded-full border border-slate-100 bg-slate-50 object-cover"
                          />
                          <div>
                            <p className="font-bold text-slate-800">{siswa.nama}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {siswa.jk === 'L' ? 'Laki-laki' : 'Perempuan'} • {siswa.tempatLahir}, {new Date(siswa.tanggalLahir).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* NIS / NISN */}
                      <td className="py-4 px-6">
                        <p className="font-mono text-xs text-slate-700">NIS: <span className="font-bold">{siswa.nis}</span></p>
                        <p className="font-mono text-xs text-slate-400 mt-0.5">NISN: {siswa.nisn}</p>
                      </td>

                      {/* Class */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
                          {className}
                        </span>
                      </td>

                      {/* Parent & Phone */}
                      <td className="py-4 px-6">
                        <p className="font-semibold text-slate-700 text-xs">{siswa.orangTua}</p>
                        <p className="font-mono text-xs text-slate-400 mt-0.5">{siswa.hpOrangTua}</p>
                      </td>

                      {/* Status indicator */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            siswa.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : siswa.status === 'mutated'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {siswa.status === 'active' && 'Aktif'}
                          {siswa.status === 'mutated' && 'Mutasi'}
                          {siswa.status === 'graduated' && 'Lulus'}
                        </span>
                      </td>

                      {/* Actions */}
                      {canUpdate && (
                        <td className="py-4 px-6 text-right no-print">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(siswa)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ubah Data Siswa"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteSiswa(siswa.id, siswa.nama)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus Siswa"
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
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada siswa yang cocok dengan filter pencarian Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PrintFooter showKepalaSekolah={true} />
      </div>

      {/* Add / Edit Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-sm md:text-base">
                <Plus className="h-5 w-5 text-emerald-400" />
                {editingSiswa ? 'Ubah Biodata Siswa' : 'Registrasi Peserta Didik Baru'}
              </h3>
              <button onClick={() => setShowAddEditModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSiswa} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* NIS */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Nomor Induk Siswa (NIS)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="Contoh: 251009"
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* NISN */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-600">NISN (Nasional)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="Contoh: 00922xxxxx"
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Nama Lengkap */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama lengkap..."
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* JK & Class Selection */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Jenis Kelamin</label>
                  <div className="flex gap-4 pt-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 cursor-pointer">
                      <input type="radio" checked={jk === 'L'} onChange={() => setJk('L')} className="text-emerald-600" />
                      Laki-laki
                    </label>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 cursor-pointer">
                      <input type="radio" checked={jk === 'P'} onChange={() => setJk('P')} className="text-emerald-600" />
                      Perempuan
                    </label>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Rombel / Kelas</label>
                  <select
                    value={kelasId}
                    onChange={(e) => setKelasId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                  >
                    {kelasList.map(k => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Tempat & Tanggal Lahir */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Tempat Lahir</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Jakarta"
                    value={tempatLahir}
                    onChange={(e) => setTempatLahir(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Tanggal Lahir</label>
                  <input
                    type="date"
                    required
                    value={tanggalLahir}
                    onChange={(e) => setTanggalLahir(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                  />
                </div>

                {/* Alamat Lengkap */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Alamat Rumah Lengkap</label>
                  <textarea
                    required
                    placeholder="Masukkan alamat tinggal saat ini..."
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-16"
                  />
                </div>

                {/* Orang tua & HP Ortu */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama bapak atau ibu..."
                    value={orangTua}
                    onChange={(e) => setOrangTua(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Nomor HP Wali (WhatsApp)</label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 0812xxxx"
                    value={hpOrangTua}
                    onChange={(e) => setHpOrangTua(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Photo Simulation */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    Simulasi Foto Siswa (URL Gambar)
                  </label>
                  <input
                    type="text"
                    placeholder="Atau biarkan kosong untuk avatar default..."
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2"
                  />
                </div>

                {/* Status Keaktifan */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Status Keaktifan Sekolah</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'mutated' | 'graduated')}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                  >
                    <option value="active">Siswa Aktif</option>
                    <option value="mutated">Mutasi Keluar</option>
                    <option value="graduated">Lulus Sekolah</option>
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-900/10 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <Upload className="h-5 w-5 text-emerald-400" />
                Impor Peserta Didik Baru (Excel/CSV)
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleImportCSV} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600">Pilih Kelas Penempatan</label>
                <select
                  value={kelasId}
                  onChange={(e) => setKelasId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-semibold"
                >
                  {kelasList.map(k => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                  <span>Isi Data CSV (Satu Baris Per Siswa)</span>
                  <button
                    type="button"
                    onClick={() => setCsvText("251011,0092234511,Andi Hermawan,L,Jakarta,2009-02-12,Jl. Menteng No.1,Sujatmiko,0812987111\n251012,0092234512,Bella Saputri,P,Bandung,2009-08-20,Jl. Siliwangi No.12,Sugiarto,0812987222")}
                    className="text-emerald-600 hover:underline"
                  >
                    Gunakan Contoh Template
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mb-1">
                  Format baris: NIS,NISN,Nama,JK(L/P),TempatLahir,TanggalLahir(YYYY-MM-DD),Alamat,NamaOrtu,HPWali
                </p>
                <textarea
                  required
                  placeholder="Paste data di sini..."
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full h-40 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Upload className="h-4 w-4" />
                  Impor Massal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Transfer Modal */}
      {showClassTransferModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <RefreshCw className="h-5 w-5 text-emerald-400 animate-spin-slow" />
                Migrasi Kelas Massal Siswa
              </h3>
              <button onClick={() => setShowClassTransferModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleClassTransfer} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-semibold leading-relaxed p-3.5 rounded-xl">
                Alat ini memindahkan seluruh peserta didik yang berstatus aktif dari satu kelas ke kelas lainnya secara massal. Cocok digunakan pada saat kenaikan kelas atau pemindahan rombel.
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Pilih Kelas Asal (Sumber)</label>
                <select
                  required
                  value={sourceKelasId}
                  onChange={(e) => setSourceKelasId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-semibold text-slate-700"
                >
                  <option value="">-- Pilih Kelas Sumber --</option>
                  {kelasList.map(k => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Pilih Kelas Baru (Tujuan)</label>
                <select
                  required
                  value={targetKelasId}
                  onChange={(e) => setTargetKelasId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-semibold text-slate-700"
                >
                  <option value="">-- Pilih Kelas Tujuan --</option>
                  {kelasList.map(k => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowClassTransferModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  Proses Migrasi
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
              Apakah Anda yakin ingin menghapus data siswa <span className="font-bold text-slate-800">{deleteName}</span>?
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
