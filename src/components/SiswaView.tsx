import React, { useState } from 'react';
import * as XLSX from 'xlsx';
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
  Printer,
  FileDown,
  CheckCircle2,
  AlertCircle,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { db } from '../utils/storage';
import { exportToExcel, exportToPDF, downloadStudentTemplate, exportStudentsToExcel } from '../utils/exportUtils';
import { PrintHeader } from './print/PrintHeader';
import { PrintFooter } from './print/PrintFooter';
import { PrintButton } from './print/PrintButton';
import { Siswa, Kelas } from '../types';

interface ImportedStudentRow {
  rowIndex: number;
  nis: string;
  nisn: string;
  nama: string;
  jk: 'L' | 'P';
  tempatLahir: string;
  tanggalLahir: string;
  alamat: string;
  orangTua: string;
  hpOrangTua: string;
  isValid: boolean;
  errors: string[];
}

interface ImportSummaryReport {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedCount: number;
  errorLogs: { rowIndex: number; name: string; errors: string[] }[];
}

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
  const [showClassTransferModal, setShowClassTransferModal] = useState<boolean>(false);

  // Excel Import Modals State
  const [showImportExcelModal, setShowImportExcelModal] = useState<boolean>(false);
  const [showImportPreviewModal, setShowImportPreviewModal] = useState<boolean>(false);
  const [showImportReportModal, setShowImportReportModal] = useState<boolean>(false);

  const [importedRows, setImportedRows] = useState<ImportedStudentRow[]>([]);
  const [targetImportKelasId, setTargetImportKelasId] = useState<string>('');
  const [importSummaryReport, setImportSummaryReport] = useState<ImportSummaryReport | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);

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

  // PDF export
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

  // Helper parsers for Excel cells
  const parseExcelDate = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'number') {
      const dateObj = XLSX.SSF.parse_date_code(val);
      if (dateObj) {
        const y = dateObj.y;
        const m = String(dateObj.m).padStart(2, '0');
        const d = String(dateObj.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
    if (val instanceof Date) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return str;
  };

  const parsePhoneNumber = (val: any): string => {
    if (!val) return '';
    let str = String(val).replace(/[^0-9+]/g, '').trim();
    if (str.startsWith('8')) {
      str = '0' + str;
    }
    return str;
  };

  const parseGender = (val: any): 'L' | 'P' | '' => {
    if (!val) return '';
    const str = String(val).trim().toUpperCase();
    if (str === 'L' || str === 'LAKI-LAKI' || str === 'LAKI' || str === 'PRIA' || str === 'MALE') return 'L';
    if (str === 'P' || str === 'PEREMPUAN' || str === 'WANITA' || str === 'FEMALE') return 'P';
    return '';
  };

  // Process and validate Excel File
  const handleExcelFileUpload = (file: File) => {
    if (!file) return;
    setIsProcessingFile(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawRows || rawRows.length < 2) {
          showToast("File Excel kosong atau tidak memiliki data siswa.", "error");
          setIsProcessingFile(false);
          return;
        }

        const headers = rawRows[0].map((h: any) => String(h).trim().toUpperCase());

        const getCellVal = (row: any[], candidateNames: string[], defaultColIdx: number) => {
          for (const cand of candidateNames) {
            const idx = headers.findIndex(h => h.includes(cand));
            if (idx !== -1 && row[idx] !== undefined && row[idx] !== null) {
              return row[idx];
            }
          }
          return row[defaultColIdx] ?? '';
        };

        const existingNisSet = new Set(siswas.map(s => String(s.nis).trim()));
        const existingNisnSet = new Set(siswas.map(s => String(s.nisn).trim()));

        const fileNisSeen = new Map<string, number>();
        const fileNisnSeen = new Map<string, number>();

        const parsedRows: ImportedStudentRow[] = [];

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.every(cell => String(cell).trim() === '')) continue;

          const excelRowIndex = i + 1; // 1-indexed (Row 1 is header)

          const rawNis = String(getCellVal(row, ['NIS'], 0)).trim();
          const rawNisn = String(getCellVal(row, ['NISN'], 1)).trim();
          const rawNama = String(getCellVal(row, ['NAMA'], 2)).trim();
          const rawJk = String(getCellVal(row, ['JK', 'JENIS KELAMIN'], 3)).trim();
          const rawTempat = String(getCellVal(row, ['TEMPAT LAHIR', 'TEMPAT'], 4)).trim();
          const rawTanggal = getCellVal(row, ['TANGGAL LAHIR', 'TGL LAHIR', 'TANGGAL'], 5);
          const rawAlamat = String(getCellVal(row, ['ALAMAT'], 6)).trim();
          const rawOrtu = String(getCellVal(row, ['NAMA ORTU', 'ORANG TUA', 'ORTU', 'WALI'], 7)).trim();
          const rawHp = getCellVal(row, ['HP WALI', 'NO HP', 'HP', 'TELEPON', 'WA'], 8);

          const parsedDate = parseExcelDate(rawTanggal);
          const parsedHp = parsePhoneNumber(rawHp);
          const parsedJk = parseGender(rawJk);

          const errors: string[] = [];

          // 1. NIS validation
          if (!rawNis) {
            errors.push('NIS wajib diisi.');
          } else {
            if (existingNisSet.has(rawNis)) {
              errors.push(`NIS '${rawNis}' sudah digunakan di database.`);
            }
            if (fileNisSeen.has(rawNis)) {
              errors.push(`NIS '${rawNis}' duplikat di dalam file Excel (Baris ${fileNisSeen.get(rawNis)}).`);
            } else {
              fileNisSeen.set(rawNis, excelRowIndex);
            }
          }

          // 2. NISN validation
          if (!rawNisn) {
            errors.push('NISN wajib diisi.');
          } else {
            if (existingNisnSet.has(rawNisn)) {
              errors.push(`NISN '${rawNisn}' sudah digunakan di database.`);
            }
            if (fileNisnSeen.has(rawNisn)) {
              errors.push(`NISN '${rawNisn}' duplikat di dalam file Excel (Baris ${fileNisnSeen.get(rawNisn)}).`);
            } else {
              fileNisnSeen.set(rawNisn, excelRowIndex);
            }
          }

          // 3. Nama validation
          if (!rawNama) {
            errors.push('Nama siswa belum diisi.');
          }

          // 4. Gender validation
          if (!parsedJk) {
            errors.push("Jenis kelamin hanya boleh 'L' atau 'P'.");
          }

          // 5. Date validation
          if (!parsedDate || !/^\d{4}-\d{2}-\d{2}$/.test(parsedDate)) {
            errors.push('Format tanggal lahir tidak valid (harus YYYY-MM-DD).');
          }

          // 6. Parent name validation
          if (!rawOrtu) {
            errors.push('Nama Orang Tua / Wali wajib diisi.');
          }

          // 7. Parent phone validation
          if (!parsedHp || parsedHp.length < 8) {
            errors.push('Nomor HP Wali tidak valid (minimal 8 digit).');
          }

          parsedRows.push({
            rowIndex: excelRowIndex,
            nis: rawNis,
            nisn: rawNisn,
            nama: rawNama,
            jk: (parsedJk || 'L') as 'L' | 'P',
            tempatLahir: rawTempat || '-',
            tanggalLahir: parsedDate || '2010-01-01',
            alamat: rawAlamat || '-',
            orangTua: rawOrtu,
            hpOrangTua: parsedHp || '-',
            isValid: errors.length === 0,
            errors
          });
        }

        setImportedRows(parsedRows);
        setTargetImportKelasId(kelasId || kelasList[0]?.id || '');
        setShowImportExcelModal(false);
        setShowImportPreviewModal(true);

      } catch (err) {
        console.error(err);
        showToast("Gagal membaca file Excel. Pastikan format file .xlsx atau .xls valid.", "error");
      } finally {
        setIsProcessingFile(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Save valid rows to DB
  const handleSaveImportedData = () => {
    const validRows = importedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      showToast("Tidak ada data valid yang dapat disimpan.", "error");
      return;
    }

    const selectedClass = kelasList.find(k => k.id === targetImportKelasId) || kelasList[0];
    const newStudents: Siswa[] = validRows.map((r, idx) => ({
      id: `s-imp-${Date.now()}-${idx}`,
      nis: r.nis,
      nisn: r.nisn,
      nama: r.nama,
      jk: r.jk,
      tempatLahir: r.tempatLahir,
      tanggalLahir: r.tanggalLahir,
      alamat: r.alamat,
      orangTua: r.orangTua,
      hpOrangTua: r.hpOrangTua,
      kelasId: selectedClass?.id || '',
      status: 'active',
      foto: `https://api.dicebear.com/7.x/adventurer/svg?seed=${r.nis}`
    }));

    const updatedSiswas = [...siswas, ...newStudents];
    db.setSiswas(updatedSiswas);
    setSiswas(updatedSiswas);

    db.logActivity(
      "Import Siswa Excel",
      `Berhasil mengimpor ${validRows.length} data siswa baru ke kelas ${selectedClass?.nama || '-'}`
    );

    const invalidRows = importedRows.filter(r => !r.isValid);
    setImportSummaryReport({
      totalRows: importedRows.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      importedCount: validRows.length,
      errorLogs: invalidRows.map(r => ({
        rowIndex: r.rowIndex,
        name: r.nama || 'Tanpa Nama',
        errors: r.errors
      }))
    });

    setShowImportPreviewModal(false);
    setShowImportReportModal(true);
    showToast(`Berhasil mengimpor ${validRows.length} siswa baru!`, "success");
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
          {/* PDF Export */}
          <button
            onClick={handleExportPDFReal}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            title="Cetak Laporan PDF"
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
              {/* Export Excel */}
              <button
                onClick={() => {
                  exportStudentsToExcel(filteredSiswas, kelasList);
                  db.logActivity("Ekspor Siswa Excel", "Melakukan ekspor data siswa ke file Excel");
                }}
                className="flex items-center gap-2 px-3.5 py-2 border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                title="Ekspor Data Siswa ke File Excel (.xlsx)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                📤 Export Excel
              </button>

              {/* Download Template */}
              <button
                onClick={() => {
                  downloadStudentTemplate();
                  db.logActivity("Download Template Excel", "Mengunduh template import data siswa Excel");
                }}
                className="flex items-center gap-2 px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                title="Unduh Template Format Import Excel (.xlsx)"
              >
                <FileDown className="h-3.5 w-3.5 text-blue-600" />
                📄 Download Template
              </button>

              {/* Import Excel */}
              <button
                onClick={() => {
                  setTargetImportKelasId(kelasList[0]?.id || '');
                  setShowImportExcelModal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm"
                title="Import Banyak Data Siswa dari File Excel"
              >
                <Upload className="h-3.5 w-3.5 text-white" />
                📥 Import Excel
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
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-colors"
              >
                <Plus className="h-4 w-4 text-emerald-400" />
                ➕ Tambah Siswa
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

      {/* 1. EXCEL FILE UPLOAD MODAL */}
      {showImportExcelModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                Import Data Siswa dari Excel (.xlsx)
              </h3>
              <button onClick={() => setShowImportExcelModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Kelas Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  Target Kelas Penempatan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetImportKelasId}
                  onChange={(e) => setTargetImportKelasId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  {kelasList.map(k => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </select>
              </div>

              {/* Download Template Banner */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Belum punya template Excel?</h4>
                  <p className="text-[11px] text-slate-500">Gunakan format resmi agar validasi berjalan akurat.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    downloadStudentTemplate();
                    db.logActivity("Download Template Excel", "Mengunduh template import data siswa Excel");
                  }}
                  className="px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Template
                </button>
              </div>

              {/* Upload Dropzone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Pilih / Unggah File Excel (.xlsx, .xls)</label>
                <div className="relative border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 rounded-xl p-6 text-center transition-all">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    disabled={isProcessingFile}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleExcelFileUpload(file);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Klik untuk memilih file Excel atau seret file ke sini</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Format didukung: .xlsx atau .xls (Maks. 10MB)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportExcelModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. EXCEL IMPORT PREVIEW MODAL */}
      {showImportPreviewModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Pratinjau & Validasi Import Data Siswa</h3>
              </div>
              <button onClick={() => setShowImportPreviewModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metrics & Filter Info */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Data</span>
                  <span className="text-lg font-black text-slate-800">{importedRows.length} Siswa</span>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Data Valid</span>
                  <span className="text-lg font-black text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    {importedRows.filter(r => r.isValid).length}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Data Tidak Valid</span>
                  <span className="text-lg font-black text-rose-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {importedRows.filter(r => !r.isValid).length}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600">Kelas Penempatan:</span>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full">
                  {kelasList.find(k => k.id === targetImportKelasId)?.nama || '-'}
                </span>
              </div>
            </div>

            {/* Warning banner if invalid rows exist */}
            {importedRows.some(r => !r.isValid) && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-800">
                <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
                <span>
                  <strong>Perhatian:</strong> Ditemukan <strong>{importedRows.filter(r => !r.isValid).length} data tidak valid</strong>. Baris berwarna merah akan dilewati secara otomatis saat pengimporan. Anda hanya akan mengimpor <strong>{importedRows.filter(r => r.isValid).length} data yang valid</strong>.
                </span>
              </div>
            )}

            {/* Preview Table */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 w-12 text-center">Baris</th>
                      <th className="py-3 px-3">NIS / NISN</th>
                      <th className="py-3 px-3">Nama Siswa</th>
                      <th className="py-3 px-3">JK</th>
                      <th className="py-3 px-3">Tempat & Tanggal Lahir</th>
                      <th className="py-3 px-3">Orang Tua / Wali</th>
                      <th className="py-3 px-3">No HP Wali</th>
                      <th className="py-3 px-3 text-center">Status Validasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {importedRows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={row.isValid ? 'bg-white hover:bg-slate-50/80 transition-colors' : 'bg-rose-50/70 hover:bg-rose-50 transition-colors'}
                      >
                        <td className="py-3 px-3 text-center font-bold text-slate-500">{row.rowIndex}</td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                          <div>{row.nis || <span className="text-rose-500 font-sans italic">Kosong</span>}</div>
                          <div className="text-[10px] text-slate-500">{row.nisn || <span className="text-rose-500 font-sans italic">Kosong</span>}</div>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {row.nama || <span className="text-rose-500 italic">Tanpa Nama</span>}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.jk === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                            {row.jk}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          <div>{row.tempatLahir}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{row.tanggalLahir}</div>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">{row.orangTua || '-'}</td>
                        <td className="py-3 px-3 font-mono text-slate-700">{row.hpOrangTua || '-'}</td>
                        <td className="py-3 px-3 text-center">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Valid
                            </span>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-full">
                                <AlertCircle className="h-3.5 w-3.5 text-rose-600" /> Tidak Valid
                              </span>
                              <div className="text-[10px] text-rose-700 font-medium text-left bg-rose-100/80 p-1.5 rounded border border-rose-200 mt-1 max-w-xs">
                                <ul className="list-disc list-inside space-y-0.5">
                                  {row.errors.map((err, errIdx) => (
                                    <li key={errIdx}>{err}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowImportPreviewModal(false);
                  setShowImportExcelModal(true);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Ganti File Excel
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportPreviewModal(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={importedRows.filter(r => r.isValid).length === 0}
                  onClick={handleSaveImportedData}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  Simpan ({importedRows.filter(r => r.isValid).length}) Data Valid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. EXCEL IMPORT SUMMARY REPORT MODAL */}
      {showImportReportModal && importSummaryReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                Laporan Hasil Import Data Siswa
              </h3>
              <button onClick={() => setShowImportReportModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Baris</span>
                  <span className="text-xl font-black text-slate-800">{importSummaryReport.totalRows}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase block">Berhasil Impor</span>
                  <span className="text-xl font-black text-emerald-700">{importSummaryReport.importedCount}</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-rose-600 uppercase block">Gagal / Ditolak</span>
                  <span className="text-xl font-black text-rose-700">{importSummaryReport.invalidRows}</span>
                </div>
              </div>

              {/* Error Log Section if any failed */}
              {importSummaryReport.errorLogs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-rose-500" /> Rincian Data yang Gagal Diimpor:
                  </h4>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50 p-3 text-xs">
                    {importSummaryReport.errorLogs.map((log, idx) => (
                      <div key={idx} className="py-2 first:pt-0 last:pb-0 space-y-0.5">
                        <div className="font-bold text-slate-800">
                          Baris {log.rowIndex}: <span className="text-slate-600">{log.name}</span>
                        </div>
                        <ul className="list-disc list-inside text-[11px] text-rose-600 font-medium pl-2">
                          {log.errors.map((err, eIdx) => (
                            <li key={eIdx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Banner */}
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5">
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <span>
                  Proses impor selesai! Total <strong>{importSummaryReport.importedCount} data siswa baru</strong> telah resmi ditambahkan ke database sekolah.
                </span>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportReportModal(false)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Tutup Laporan
                </button>
              </div>
            </div>
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
