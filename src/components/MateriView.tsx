import React, { useState } from 'react';
import {
  BookMarked,
  Plus,
  Trash2,
  FileText,
  FileCode,
  Image as ImageIcon,
  Video as VideoIcon,
  Download,
  Search,
  Save,
  X,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  FileSpreadsheet
} from 'lucide-react';
import { db } from '../utils/storage';
import { supabase, triggerFileDownload } from '../utils/supabase';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { PrintHeader } from './print/PrintHeader';
import { PrintFooter } from './print/PrintFooter';
import { PrintButton } from './print/PrintButton';
import { Materi, Kelas, MataPelajaran } from '../types';

export default function MateriView() {
  const [search, setSearch] = useState<string>('');
  const [filterKelas, setFilterKelas] = useState<string>('all');
  const [filterMapel, setFilterMapel] = useState<string>('all');

  // DB States
  const [materis, setMateris] = useState<Materi[]>(() => db.getMateris());
  const kelasList = db.getKelas();
  const mapelList = db.getMapels();

  // Permission Gates & Role Scoping
  const isGuru = db.isGuru();
  const currentTeacher = db.getTeacherProfile();
  const teacherMapels = db.getTeacherMapels();
  const teacherMapelIds = new Set(teacherMapels.map(m => m.id));

  const availableMapelList = isGuru ? teacherMapels : mapelList;

  const canUpload = db.hasPermission('materi.create');
  const canDelete = db.hasPermission('materi.delete');

  // Upload Modal Form state
  const [showModal, setShowModal] = useState<boolean>(false);

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
  const [judul, setJudul] = useState<string>('');
  const [deskripsi, setDeskripsi] = useState<string>('');
  const [fileType, setFileType] = useState<Materi['fileType']>('PDF');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('1.2 MB');
  const [kelasId, setKelasId] = useState<string>('');
  const [mapelId, setMapelId] = useState<string>('');
  const [semester, setSemester] = useState<1 | 2>(1);
  const [bab, setBab] = useState<string>('Bab 1');

  // File Upload Specific States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Filtered dataset according to Role Guru
  const activeMateris = isGuru
    ? materis.filter(m => teacherMapelIds.has(m.mapelId))
    : materis;

  const filteredMateris = activeMateris.filter(m => {
    const matchesSearch =
      m.judul.toLowerCase().includes(search.toLowerCase()) ||
      (m.deskripsi && m.deskripsi.toLowerCase().includes(search.toLowerCase())) ||
      m.bab.toLowerCase().includes(search.toLowerCase());
    const matchesKelas = filterKelas === 'all' || m.kelasId === filterKelas;
    const matchesMapel = filterMapel === 'all' || m.mapelId === filterMapel;
    return matchesSearch && matchesKelas && matchesMapel;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size: 20MB for Video/ZIP, 10MB for others
    const isBigFormat = file.name.endsWith('.mp4') || file.name.endsWith('.zip') || file.type.includes('video') || file.type.includes('zip');
    const maxSize = isBigFormat ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(`Ukuran file melebihi batas maksimal (${isBigFormat ? '20MB' : '10MB'})`, 'error');
      return;
    }

    // Validate type
    const allowedExtensions = ['pdf', 'docx', 'xlsx', 'pptx', 'jpg', 'jpeg', 'png', 'webp', 'mp4', 'zip'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(ext)) {
      showToast('Format file tidak didukung! Format yang diperbolehkan: PDF, DOCX, XLSX, PPTX, JPG, JPEG, PNG, WEBP, MP4, ZIP', 'error');
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    
    // Format size
    const sizeInMB = file.size / (1024 * 1024);
    setFileSize(sizeInMB < 0.1 ? `${Math.round(file.size / 1024)} KB` : `${sizeInMB.toFixed(1)} MB`);

    // Auto-detect file type option
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      setFileType('Image');
    } else if (ext === 'pdf') {
      setFileType('PDF');
    } else if (ext === 'docx') {
      setFileType('DOCX');
    } else if (ext === 'pptx') {
      setFileType('PPTX');
    } else if (ext === 'mp4') {
      setFileType('Video');
    } else {
      setFileType('PDF'); // default
    }
  };

  const handleUploadMateri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul || !kelasId || !mapelId) {
      showToast("Harap lengkapi semua bidang wajib!", "error");
      return;
    }

    if (!selectedFile) {
      showToast("Silakan pilih file fisik terlebih dahulu!", "error");
      return;
    }

    if (!db.hasPermission('materi.create')) {
      showToast("Anda tidak memiliki hak akses (materi.upload)!", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    // Simulate progress upload
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 15;
      });
    }, 150);

    try {
      // Perform actual upload to Supabase Storage (IndexedDB Mock)
      const filePath = `materi/${Date.now()}_${selectedFile.name}`;
      const { data, error } = await supabase.storage.from('materi').upload(filePath, selectedFile);

      clearInterval(interval);

      if (error || !data) {
        setIsUploading(false);
        setUploadProgress(0);
        showToast("Gagal mengunggah file ke Supabase Storage.", "error");
        return;
      }

      setUploadProgress(100);

      setTimeout(() => {
        const currentUser = db.getCurrentUser();
        const newMateri: Materi = {
          id: `mat-${Date.now()}`,
          judul,
          deskripsi,
          fileType,
          fileName: selectedFile.name,
          fileSize,
          fileUrl: filePath, // Store the relative path in storage
          kelasId,
          mapelId,
          semester,
          bab,
          diunggahOleh: currentUser.id,
          tanggalUnggah: new Date().toISOString().split('T')[0]
        };

        const updated = [newMateri, ...materis];
        db.setMateris(updated);
        setMateris(updated);

        const mapelName = mapelList.find(m => m.id === mapelId)?.nama || '';
        db.logActivity("Unggah Materi", `Mengunggah bahan ajar baru "${judul}" (${selectedFile.name}) untuk mata pelajaran ${mapelName}`);
        
        showToast("Bahan ajar berhasil diunggah ke Supabase Storage!", "success");
        
        // Reset form
        setShowModal(false);
        setSelectedFile(null);
        setIsUploading(false);
        setUploadProgress(0);
      }, 400);
    } catch (err) {
      clearInterval(interval);
      setIsUploading(false);
      setUploadProgress(0);
      showToast("Terjadi kesalahan teknis saat mengunggah.", "error");
    }
  };

  const handleDownloadMateri = async (m: Materi) => {
    if (!db.hasPermission('materi.view')) {
      showToast("Anda tidak memiliki hak akses untuk mengunduh materi (materi.download)!", "error");
      return;
    }

    try {
      // Check if fileUrl is pre-populated mock ('#') or is a real storage path
      if (!m.fileUrl || m.fileUrl === '#' || !m.fileUrl.startsWith('materi/')) {
        // Prepopulated files simulation
        showToast("Menyiapkan unduhan berkas bawaan...", "success");
        setTimeout(() => {
          const content = `Simulasi isi materi: ${m.judul}\nBab: ${m.bab}\nFormat: ${m.fileType}\nDiunggah oleh Guru pada ${m.tanggalUnggah}`;
          const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
          triggerFileDownload(blob, m.fileName);
          showToast("Berkas berhasil diunduh!", "success");
          db.logActivity("Unduh Materi", `Mengunduh bahan ajar bawaan "${m.judul}"`);
        }, 300);
      } else {
        // Real download from simulated Supabase Storage (IndexedDB)
        showToast("Membuka sambungan aman ke Supabase Storage...", "success");
        // Simulated private bucket signed URL
        const { data: signedData, error: signedError } = await supabase.storage.from('materi').createSignedUrl(m.fileUrl, 3600);
        
        if (signedError || !signedData?.signedUrl) {
          showToast("Gagal membuat Signed URL untuk file privat.", "error");
          return;
        }

        const { data, error } = await supabase.storage.from('materi').download(m.fileUrl);
        if (error || !data) {
          showToast("Berkas tidak ditemukan atau gagal diunduh dari storage.", "error");
          console.error(error);
        } else {
          triggerFileDownload(data, m.fileName);
          showToast(`Berkas "${m.fileName}" berhasil diunduh!`, "success");
          db.logActivity("Unduh Materi", `Mengunduh bahan ajar "${m.judul}" dari Supabase Storage`);
        }
      }
    } catch (err) {
      showToast("Gagal melakukan unduhan.", "error");
    }
  };

  const handleDeleteMateri = (id: string, judulMateri: string) => {
    setDeleteId(id);
    setDeleteName(judulMateri);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setIsDeleting(true);

    setTimeout(() => {
      try {
        const updated = materis.filter(m => m.id !== deleteId);
        db.setMateris(updated);
        setMateris(updated);
        db.logActivity("Hapus Materi", `Menghapus bahan ajar "${deleteName}"`);
        showToast(`Berhasil menghapus bahan ajar "${deleteName}"!`, "success");
      } catch (err) {
        showToast("Terjadi kesalahan saat menghapus bahan ajar.", "error");
      } finally {
        setIsDeleting(false);
        setDeleteId(null);
        setDeleteName('');
      }
    }, 500); // 500ms simulated delay
  };

  const handleExportExcel = () => {
    const headers = ["Judul Bahan Ajar", "Deskripsi", "Nama File", "Tipe File", "Ukuran File", "Kelas", "Mata Pelajaran", "Tanggal Unggah"];
    const keys = ["judul", "deskripsi", "fileName", "fileType", "fileSizeFormatted", "kelasNama", "mapelNama", "tanggalUnggah"];
    
    const exportData = filteredMateris.map(m => {
      const kName = kelasList.find(k => k.id === m.kelasId)?.nama || 'Semua Kelas';
      const mName = mapelList.find(mapel => mapel.id === m.mapelId)?.nama || 'Umum';
      return {
        ...m,
        fileSizeFormatted: `${(m.fileSize / (1024 * 1024)).toFixed(2)} MB`,
        kelasNama: kName,
        mapelNama: mName,
        tanggalUnggah: m.createdAt.split('T')[0]
      };
    });

    exportToExcel(exportData, headers, keys, "Data_Materi_Ajar");
    db.logActivity("Ekspor Materi Excel", "Melakukan ekspor data bahan ajar ke file Excel");
  };

  const handleExportPDF = () => {
    const headers = ["#", "Judul Bahan Ajar", "Nama File", "Tipe", "Kelas", "Mata Pelajaran", "Diunggah Oleh", "Tanggal"];
    const body = filteredMateris.map((m, idx) => {
      const kName = kelasList.find(k => k.id === m.kelasId)?.nama || 'Semua Kelas';
      const mName = mapelList.find(mapel => mapel.id === m.mapelId)?.nama || 'Umum';
      const author = db.getGurus().find(g => g.id === m.diunggahOleh)?.nama || 'Sistem';
      return [
        idx + 1,
        m.judul,
        m.fileName,
        m.fileType,
        kName,
        mName,
        author,
        m.createdAt.split('T')[0]
      ];
    });

    const activeUser = db.getCurrentUser();
    exportToPDF("Daftar Modul & Bahan Ajar Guru SMK Negeri 1 Jakarta", headers, body, "Data_Materi_Ajar", {
      subtitle: `Tahun Ajaran: 2026/2027 | Semester: Ganjil`,
      guruNama: activeUser.name,
      guruNip: activeUser.nip || '........................'
    });
    db.logActivity("Ekspor Materi PDF", "Melakukan ekspor data bahan ajar ke file PDF");
  };


  const getFileIcon = (type: Materi['fileType']) => {
    switch (type) {
      case 'PDF':
        return <FileText className="h-8 w-8 text-rose-500" />;
      case 'DOCX':
        return <FileText className="h-8 w-8 text-blue-500" />;
      case 'PPTX':
        return <FileCode className="h-8 w-8 text-orange-500" />;
      case 'Image':
        return <ImageIcon className="h-8 w-8 text-emerald-500" />;
      case 'Video':
        return <VideoIcon className="h-8 w-8 text-purple-500" />;
      default:
        return <FileText className="h-8 w-8 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Read only Warning */}
      {!canUpload && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium">
          <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Mode Lihat-Saja:</strong> Anda dapat meninjau dan mengunduh berkas materi ajar, namun akun Anda tidak memiliki izin untuk mengunggah modul baru.
          </span>
        </div>
      )}

      {/* Repository toolbar */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-center">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 w-full">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari judul materi, bab..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Filter Kelas */}
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-semibold text-slate-600"
          >
            <option value="all">Semua Kelas</option>
            {kelasList.map(k => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>

          {/* Filter Mapel */}
          <select
            value={filterMapel}
            onChange={(e) => setFilterMapel(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-semibold text-slate-600"
          >
            <option value="all">Semua Mapel</option>
            {mapelList.map(m => (
              <option key={m.id} value={m.id}>{m.nama}</option>
            ))}
          </select>
        </div>

        {/* Action Button Strip */}
        <div className="flex flex-wrap gap-2 justify-end w-full xl:w-auto">
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
            elementId="materi-grid-print"
            title="Daftar Modul & Bahan Ajar Guru"
            permission="materi.print"
            activityLogDetail="Mencetak daftar materi pembelajaran"
            variant="outline"
          />

          {canUpload && (
            <button
              onClick={() => {
                setJudul('');
                setDeskripsi('');
                setFileName('');
                setKelasId(kelasList[0]?.id || '');
                setMapelId(mapelList[0]?.id || '');
                setShowModal(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-emerald-900/10 cursor-pointer transition-colors"
            >
              <Plus className="h-4 w-4" />
              Unggah Bahan Ajar
            </button>
          )}
        </div>
      </div>

      {/* Grid of Materials (Bento style) */}
      <div id="materi-grid-print" className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-6">
        <PrintHeader
          title="DAFTAR MODUL & BAHAN AJAR GURU"
          subtitle="Repositori Materi Pembelajaran Sekolah"
          metadata={[
            { label: 'Total Modul', value: `${filteredMateris.length} Berkas Materi` },
            { label: 'Filter Kelas', value: filterKelas === 'all' ? 'Semua Kelas' : (kelasList.find(k => k.id === filterKelas)?.nama || filterKelas) },
            { label: 'Filter Mapel', value: filterMapel === 'all' ? 'Semua Mapel' : (mapelList.find(m => m.id === filterMapel)?.nama || filterMapel) }
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMateris.length > 0 ? (
          filteredMateris.map((m) => {
            const kName = kelasList.find(k => k.id === m.kelasId)?.nama || 'Semua Kelas';
            const mName = mapelList.find(mapel => mapel.id === m.mapelId)?.nama || 'Umum';
            const author = db.getGurus().find(g => g.id === m.diunggahOleh)?.nama || 'Sistem';

            return (
              <div
                key={m.id}
                className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* File icon and Class banner */}
                  <div className="flex justify-between items-start">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {getFileIcon(m.fileType)}
                    </div>
                    <div className="flex flex-col items-end gap-1 text-[10px] font-bold">
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase">
                        {kName}
                      </span>
                      <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full uppercase">
                        Semester {m.semester}
                      </span>
                    </div>
                  </div>

                  {/* Title and details */}
                  <div className="mt-4 space-y-1.5">
                    <p className="font-mono text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                      {mName} • {m.bab}
                    </p>
                    <h4 className="text-sm font-extrabold text-slate-800 leading-snug truncate" title={m.judul}>
                      {m.judul}
                    </h4>
                    {m.deskripsi && (
                      <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                        {m.deskripsi}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer and interactive download triggers */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-[11px] text-slate-400 font-semibold font-mono">
                    <span className="truncate max-w-[140px]" title={`Nama File: ${m.fileName}`}>
                      {m.fileName}
                    </span>
                    <span>{m.fileSize}</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-50">
                    <span>Oleh: {author.split(',')[0]}</span>
                    <span>{new Date(m.tanggalUnggah).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}</span>
                  </div>

                  <div className="flex gap-2 justify-end pt-1 no-print">
                    <button
                      onClick={() => handleDownloadMateri(m)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Unduh Berkas
                    </button>

                    {canDelete && (!isGuru || (currentTeacher && m.diunggahOleh === currentTeacher.id)) && (
                      <button
                        onClick={() => handleDeleteMateri(m.id, m.judul)}
                        className="p-1.5 border border-slate-200 hover:border-rose-500 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Modul"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs">
            Tidak ada dokumen bahan ajar yang cocok dengan filter pencarian.
          </div>
        )}
        </div>

        <PrintFooter showKepalaSekolah={true} />
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <BookMarked className="h-5 w-5 text-emerald-400" />
                Unggah Bahan Ajar Baru
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadMateri} className="p-5 space-y-4">
              {/* Judul */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Judul Materi / Modul</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Turunan Fungsi Trigonometri Dasar"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-semibold text-slate-700"
                />
              </div>

              {/* Deskripsi */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Ringkasan / Deskripsi Pembelajaran</label>
                <textarea
                  placeholder="Tuliskan keterangan singkat tentang isi materi ini..."
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 h-14"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Kelas */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Rombel Sasaran</label>
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

                {/* Mapel */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Mata Pelajaran</label>
                  <select
                    value={mapelId}
                    onChange={(e) => setMapelId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-semibold"
                  >
                    {mapelList.map(m => (
                      <option key={m.id} value={m.id}>{m.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Semester */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value) as 1 | 2)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-semibold"
                  >
                    <option value={1}>Ganjil (1)</option>
                    <option value={2}>Genap (2)</option>
                  </select>
                </div>

                {/* Bab */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Bab Materi</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bab 3"
                    value={bab}
                    onChange={(e) => setBab(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                {/* File type */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Format Berkas</label>
                  <select
                    disabled={isUploading}
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value as Materi['fileType'])}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-semibold disabled:opacity-55"
                  >
                    <option value="PDF">Dokumen PDF</option>
                    <option value="DOCX">Word (DOCX)</option>
                    <option value="PPTX">Powerpoint (PPTX)</option>
                    <option value="Image">Gambar/Ilustrasi</option>
                    <option value="Video">Video Pembelajaran</option>
                  </select>
                </div>

                {/* File size */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Ukuran Terdeteksi</label>
                  <input
                    type="text"
                    readOnly
                    value={fileSize}
                    className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Physical File Input with Drag and Drop styling */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Pilih Berkas Pembelajaran</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-slate-100/70 transition-colors relative flex flex-col items-center justify-center text-center cursor-pointer">
                  <input
                    type="file"
                    disabled={isUploading}
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1 pointer-events-none">
                    <FileText className="h-8 w-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">
                      {selectedFile ? selectedFile.name : "Seret & lepas file di sini atau klik untuk memilih"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Maks. 10MB (PDF, DOCX, PPTX, JPG, PNG, WEBP) / Maks. 20MB (Video MP4, ZIP)
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 animate-spin text-emerald-500" />
                      Mengunggah ke Supabase Storage...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isUploading ? "Mengunggah..." : "Unggah Berkas"}
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
              Apakah Anda yakin ingin menghapus bahan ajar <span className="font-bold text-slate-800">"{deleteName}"</span>?
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
