import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Save,
  ShieldAlert,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  Info,
  X,
  Printer
} from 'lucide-react';
import { db } from '../utils/storage';
import { exportToExcel, exportToPDF, showDirectToast } from '../utils/exportUtils';
import { PrintHeader } from './print/PrintHeader';
import { PrintFooter } from './print/PrintFooter';
import { PrintButton } from './print/PrintButton';
import { Nilai, Siswa, Kelas, MataPelajaran, JenisNilai } from '../types';

export default function NilaiView() {
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedMapelId, setSelectedMapelId] = useState<string>('');

  // Mass input configuration fields
  const [jenisNilai, setJenisNilai] = useState<JenisNilai>('Tugas');
  const [topikEvaluasi, setTopikEvaluasi] = useState<string>('Bab 1 Pengantar');

  // DB States
  const [kelasList, setKelasList] = useState<Kelas[]>(() => db.getKelas());
  const [mapelList, setMapelList] = useState<MataPelajaran[]>(() => db.getMapels());
  const [students, setStudents] = useState<Siswa[]>([]);
  const [nilaiList, setNilaiList] = useState<Nilai[]>(() => db.getNilais());

  // Input Grid State
  const [massGrades, setMassGrades] = useState<{ [siswaId: string]: number }>({});

  // CSV Import State
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [csvText, setCsvText] = useState<string>('');

  // Permission Gates & Role Check
  const isGuru = db.isGuru();
  const isWaliKelas = db.isWaliKelas();
  const homeroomClass = db.getHomeroomClass();
  const teacherClasses = db.getTeacherClasses();
  const teacherMapels = db.getTeacherMapels();

  const availableKelasList = isGuru
    ? teacherClasses
    : isWaliKelas && homeroomClass
    ? [homeroomClass]
    : kelasList;

  const availableMapelList = isGuru
    ? teacherMapels
    : mapelList;

  const canInput = db.hasPermission('nilai.input');
  const canEdit = db.hasPermission('nilai.edit');

  // Auto-set class to homeroom class for Wali Kelas / Guru
  useEffect(() => {
    if (isWaliKelas && homeroomClass) {
      setSelectedKelasId(homeroomClass.id);
    } else if (isGuru && availableKelasList.length > 0 && !selectedKelasId) {
      setSelectedKelasId(availableKelasList[0].id);
    }
  }, [isGuru, isWaliKelas, homeroomClass]);

  useEffect(() => {
    if (isGuru && availableMapelList.length > 0 && !selectedMapelId) {
      setSelectedMapelId(availableMapelList[0].id);
    }
  }, [isGuru]);

  const selectedMapel = mapelList.find(m => m.id === selectedMapelId);
  const currentKkm = selectedMapel?.kkm || 75;

  // Sync students and grid values when class or mapel changes
  useEffect(() => {
    if (selectedKelasId) {
      const activeStudents = db.getSiswas().filter(s => s.kelasId === selectedKelasId && s.status === 'active');
      setStudents(activeStudents);

      // check if any values exist for this specific combination
      const existingNilais = nilaiList.filter(
        n => n.mapelId === selectedMapelId && n.jenis === jenisNilai && n.topik === topikEvaluasi
      );

      const newGrades: typeof massGrades = {};
      activeStudents.forEach(s => {
        const found = existingNilais.find(n => n.siswaId === s.id);
        newGrades[s.id] = found ? found.skor : 80; // default to a safe 80
      });
      setMassGrades(newGrades);
    } else {
      setStudents([]);
      setMassGrades({});
    }
  }, [selectedKelasId, selectedMapelId, jenisNilai, topikEvaluasi, nilaiList]);

  // Handle score grid changes
  const handleScoreChange = (siswaId: string, value: string) => {
    const num = Math.min(100, Math.max(0, parseInt(value) || 0));
    setMassGrades(prev => ({
      ...prev,
      [siswaId]: num
    }));
  };

  const handleSaveMassGrades = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKelasId || !selectedMapelId || !topikEvaluasi) {
      alert("Lengkapi Kelas, Mata Pelajaran, dan Topik Evaluasi!");
      return;
    }

    const currentUser = db.getCurrentUser();
    
    // Filter out previous entries matching this mapel, jenis, and topik to avoid duplicates
    let updatedNilais = nilaiList.filter(
      n => !(n.mapelId === selectedMapelId && n.jenis === jenisNilai && n.topik === topikEvaluasi)
    );

    // Build new logs
    const newNilais: Nilai[] = Object.keys(massGrades).map((siswaId, index) => ({
      id: `n-${Date.now()}-${index}`,
      siswaId,
      mapelId: selectedMapelId,
      jenis: jenisNilai,
      topik: topikEvaluasi,
      skor: massGrades[siswaId],
      tanggalInput: new Date().toISOString().split('T')[0],
      diinputOleh: currentUser.id
    }));

    updatedNilais = [...updatedNilais, ...newNilais];
    db.setNilais(updatedNilais);
    setNilaiList(updatedNilais);

    const kName = kelasList.find(k => k.id === selectedKelasId)?.nama || '';
    const mName = mapelList.find(m => m.id === selectedMapelId)?.nama || '';
    db.logActivity("Simpan Nilai", `Menginput massal nilai ${jenisNilai} - ${topikEvaluasi} kelas ${kName} mapel ${mName}`);

    alert("Nilai evaluasi berhasil disimpan ke buku rapor!");
  };

  // CSV Grade Export
  const handleExportCSV = () => {
    if (!selectedKelasId || !selectedMapelId) {
      alert("Silakan pilih Kelas dan Mata Pelajaran terlebih dahulu!");
      return;
    }

    const headers = ["NIS", "Nama Siswa", "Evaluasi", "Topik", "Skor (0-100)"];
    const rows = students.map(s => {
      const score = massGrades[s.id] !== undefined ? massGrades[s.id] : '';
      return [s.nis, s.nama, jenisNilai, topikEvaluasi, score];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const kName = kelasList.find(k => k.id === selectedKelasId)?.nama || '';
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Template_Nilai_${kName}_${jenisNilai}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    db.logActivity("Download Template", `Mengunduh template CSV nilai kelas ${kName}`);
  };

  const handleExportExcel = () => {
    if (!selectedKelasId || !selectedMapelId) return;
    const kelas = kelasList.find(k => k.id === selectedKelasId);
    const mapel = mapelList.find(m => m.id === selectedMapelId);

    const headers = ["NIS", "Nama Siswa", "Evaluasi", "Topik", "Skor", "Rata-Rata Kelas", "Status Kelulusan"];
    const keys = ["nis", "nama", "jenis", "topik", "skor", "avg", "status"];
    
    const exportData = students.map(s => {
      const stats = getStudentSummaryStats(s.id);
      return {
        nis: s.nis,
        nama: s.nama,
        jenis: jenisNilai,
        topik: topikEvaluasi,
        skor: massGrades[s.id] !== undefined ? massGrades[s.id] : '-',
        avg: stats.avg,
        status: stats.status
      };
    });

    exportToExcel(exportData, headers, keys, `Nilai_${kelas?.nama || ''}_${jenisNilai}`);
    db.logActivity("Ekspor Nilai Excel", "Melakukan ekspor buku daftar nilai digital ke file Excel");
  };

  const handleExportPDF = () => {
    if (!db.hasPermission('nilai.print')) {
      showDirectToast("Anda tidak memiliki hak akses untuk mengekspor Daftar Nilai! (nilai.print)", "error");
      return;
    }
    if (!selectedKelasId || !selectedMapelId) return;
    const kelas = kelasList.find(k => k.id === selectedKelasId);
    const mapel = mapelList.find(m => m.id === selectedMapelId);

    const headers = ["#", "NIS", "Nama Siswa", "Skor Evaluasi", "Rata-Rata Mapel", "Status KKM"];
    const body = students.map((s, idx) => {
      const stats = getStudentSummaryStats(s.id);
      return [
        idx + 1,
        s.nis,
        s.nama,
        massGrades[s.id] !== undefined ? massGrades[s.id] : '-',
        stats.avg,
        stats.status
      ];
    });

    const activeUser = db.getCurrentUser();
    exportToPDF(
      `Buku Daftar Nilai Digital - Kelas ${kelas?.nama || ''}`,
      headers,
      body,
      `Nilai_${kelas?.nama || ''}_${jenisNilai}`,
      {
        subtitle: `Mata Pelajaran: ${mapel?.nama || ''} (KKM: ${currentKkm}) | Kategori: ${jenisNilai} - ${topikEvaluasi}`,
        guruNama: activeUser.name,
        guruNip: activeUser.nip || '........................'
      }
    );
    db.logActivity("Ekspor Nilai PDF", "Melakukan ekspor buku daftar nilai digital ke file PDF");
  };


  // CSV Grade Import Action
  const handleImportCSV = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText || !selectedKelasId || !selectedMapelId) return;

    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      alert("Format CSV tidak valid!");
      return;
    }

    const newGradesGrid: typeof massGrades = { ...massGrades };
    let importedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length >= 3) {
        const parsedNis = cols[0].trim();
        const parsedScore = parseInt(cols[4] || cols[2]) || 0;

        // find student by NIS
        const targetStudent = students.find(s => s.nis === parsedNis);
        if (targetStudent) {
          newGradesGrid[targetStudent.id] = Math.min(100, Math.max(0, parsedScore));
          importedCount++;
        }
      }
    }

    setMassGrades(newGradesGrid);
    db.logActivity("Import Nilai", `Mengimpor ${importedCount} nilai siswa secara massal dari CSV`);
    alert(`Berhasil mengimpor ${importedCount} nilai siswa ke antarmuka grid!`);
    setShowImportModal(false);
    setCsvText('');
  };

  // Calculated Student Summary Table (Weighted Averaging)
  const getStudentSummaryStats = (siswaId: string) => {
    const records = nilaiList.filter(n => n.siswaId === siswaId && n.mapelId === selectedMapelId);
    if (records.length === 0) return { avg: 0, status: 'No Data', count: 0 };

    const sum = records.reduce((acc, curr) => acc + curr.skor, 0);
    const avg = Math.round(sum / records.length);
    const isPass = avg >= currentKkm;

    return {
      avg,
      status: isPass ? 'TUNTAS' : 'REMEDIAL',
      count: records.length
    };
  };

  return (
    <div className="space-y-6">
      {/* RBAC Banner */}
      {!canInput && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium">
          <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Akses Lihat-Saja:</strong> Hak akses Anda tidak diizinkan untuk mengubah nilai siswa. Halaman ini hanya menampilkan rangkuman pencapaian belajar peserta didik.
          </span>
        </div>
      )}

      {/* Grid Selection Setup */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
          <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-500" />
          Buku Daftar Nilai Digital
        </h3>

        <form onSubmit={handleSaveMassGrades} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Kelas selection */}
            <div className="space-y-1 text-xs font-bold text-slate-600">
              <label>Pilih Rombongan Belajar</label>
              <select
                required
                disabled={isWaliKelas && availableKelasList.length === 1}
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                className={`w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-semibold text-slate-700 ${
                  isWaliKelas && availableKelasList.length === 1 ? 'bg-slate-100 cursor-not-allowed text-slate-500' : ''
                }`}
              >
                <option value="">-- Pilih Kelas --</option>
                {availableKelasList.map(k => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </div>

            {/* Mapel selection */}
            <div className="space-y-1 text-xs font-bold text-slate-600">
              <label>Pilih Mata Pelajaran (KKM: {currentKkm})</label>
              <select
                required
                value={selectedMapelId}
                onChange={(e) => setSelectedMapelId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-semibold text-slate-700"
              >
                <option value="">-- Pilih Mapel --</option>
                {availableMapelList.map(m => (
                  <option key={m.id} value={m.id}>{m.nama} (KKM: {m.kkm})</option>
                ))}
              </select>
            </div>

            {/* Jenis Nilai */}
            <div className="space-y-1 text-xs font-bold text-slate-600">
              <label>Kategori Evaluasi</label>
              <select
                value={jenisNilai}
                onChange={(e) => setJenisNilai(e.target.value as JenisNilai)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-semibold text-slate-700"
              >
                <option value="Tugas">Nilai Tugas / PR</option>
                <option value="Ulangan Harian">Ulangan Harian</option>
                <option value="PTS">PTS (Ujian Tengah Semester)</option>
                <option value="PAS">PAS (Ujian Akhir Semester)</option>
                <option value="Praktik">Ujian Praktik</option>
                <option value="Sikap">Asesmen Sikap</option>
              </select>
            </div>

            {/* Topik / Bab */}
            <div className="space-y-1 text-xs font-bold text-slate-600">
              <label>Topik / Bab Penilaian</label>
              <input
                type="text"
                required
                placeholder="Contoh: Bab 1 Kalkulus"
                value={topikEvaluasi}
                onChange={(e) => setTopikEvaluasi(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 text-slate-700 font-semibold"
              />
            </div>
          </div>

          {/* Mass Grid Roster */}
          {selectedKelasId && selectedMapelId ? (
            <div className="border-t border-slate-100 pt-5 space-y-4">
              {/* Export Import Excel Bar */}
              <div className="flex flex-wrap gap-3 justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 font-mono">
                  Siswa Terdeteksi: {students.length} Orang
                </span>
                <div className="flex flex-wrap gap-2">
                  {/* Excel Export */}
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-100 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3 w-3 text-emerald-600" /> Unduh Excel
                  </button>

                  {/* PDF Export */}
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-100 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                  >
                    <Download className="h-3 w-3 text-rose-500" /> Unduh PDF
                  </button>

                  {/* Print */}
                  <PrintButton
                    elementId="nilai-table-print"
                    title="Daftar Nilai Hasil Belajar Siswa"
                    permission="nilai.print"
                    activityLogDetail="Mencetak daftar nilai kelas"
                    variant="outline"
                  />

                  {canInput && (
                    <>
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-100 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <Download className="h-3 w-3 text-slate-500" /> Template CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCsvText('');
                          setShowImportModal(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <Upload className="h-3 w-3" /> Impor CSV
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Grid table */}
              <div id="nilai-table-print" className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-6">
                <PrintHeader
                  title="BUKU DAFTAR NILAI DIGITAL"
                  subtitle={`Kategori Evaluasi: ${jenisNilai} - ${topikEvaluasi}`}
                  metadata={[
                    { label: 'Kelas', value: kelasList.find(k => k.id === selectedKelasId)?.nama || '' },
                    { label: 'Mata Pelajaran', value: mapelList.find(m => m.id === selectedMapelId)?.nama || '' },
                    { label: 'KKM Mapel', value: currentKkm ? `${currentKkm}` : '-' }
                  ]}
                />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Input Grid */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-mono uppercase">
                          <th className="py-2.5 px-4 font-bold">Nama Siswa</th>
                          <th className="py-2.5 px-4 font-bold">NIS</th>
                          <th className="py-2.5 px-4 font-bold text-center w-36">Input Skor (0-100)</th>
                          <th className="py-2.5 px-4 font-bold text-center">Indikator</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                        {students.map((siswa) => {
                          const score = massGrades[siswa.id] !== undefined ? massGrades[siswa.id] : 0;
                          const isPass = score >= currentKkm;

                          return (
                            <tr key={siswa.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-4">
                                <p className="font-bold text-slate-800">{siswa.nama}</p>
                              </td>
                              <td className="py-2.5 px-4 font-mono text-slate-400">
                                {siswa.nis}
                              </td>

                              {/* Input box */}
                              <td className="py-2.5 px-4 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  disabled={!canInput}
                                  value={score}
                                  onChange={(e) => handleScoreChange(siswa.id, e.target.value)}
                                  className={`w-24 text-center px-2 py-1 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold text-sm ${
                                    isPass ? 'text-emerald-700 border-emerald-200' : 'text-rose-700 border-rose-200'
                                  }`}
                                />
                              </td>

                              {/* Indicator badge */}
                              <td className="py-2.5 px-4 text-center">
                                {isPass ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                                    Tuntas ( {score} )
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                    <XCircle className="h-3 w-3 text-rose-500" />
                                    Remedial ( {score} )
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {canInput && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
                      >
                        <Save className="h-4 w-4" />
                        Simpan Nilai Evaluasi
                      </button>
                    </div>
                  )}
                </div>

                {/* Weighted Cumulative Summary per student */}
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                    <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 mb-3 uppercase tracking-wider font-mono">
                      <Info className="h-3.5 w-3.5 text-slate-400" />
                      Rerata Nilai Raport
                    </h4>
                    <p className="text-[10px] text-slate-500 mb-4 leading-normal">
                      Menampilkan akumulasi nilai rata-rata seluruh evaluasi tugas, ulangan harian, dan ujian semester yang disimpan di kelas ini.
                    </p>

                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {students.map((student) => {
                        const stats = getStudentSummaryStats(student.id);
                        const isRemedial = stats.status === 'REMEDIAL';

                        return (
                          <div
                            key={student.id}
                            className="bg-white p-2.5 rounded-lg border border-slate-200/60 text-[11px] font-semibold flex items-center justify-between"
                          >
                            <span className="font-bold text-slate-800 truncate max-w-[130px]">{student.nama}</span>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-slate-400">{stats.count} kuis</span>
                              <span
                                className={`px-2 py-0.5 rounded font-black text-xs ${
                                  isRemedial
                                    ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}
                              >
                                Avg: {stats.avg}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <PrintFooter showKepalaSekolah={true} />
            </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200/80 rounded-xl p-8 text-center text-slate-400 text-xs">
              <Info className="h-6 w-6 mx-auto mb-2 text-slate-300" />
              Pilih Rombongan Belajar Kelas dan Mata Pelajaran terlebih dahulu untuk membuka grid buku penilaian rapor siswa.
            </div>
          )}
        </form>
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-xs flex items-center gap-2">
                <Upload className="h-4 w-4 text-emerald-400" />
                Impor Nilai Siswa (CSV)
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleImportCSV} className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-900 text-[10px] font-semibold p-3 rounded-lg leading-relaxed">
                Tempelkan baris CSV yang memiliki format: <strong>NIS,NamaSiswa,Evaluasi,Topik,Skor</strong>. Kolom skor akan diisikan otomatis ke dalam antarmuka grid di atas.
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span>Isi Data CSV Nilai</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (students.length >= 2) {
                        setCsvText(`${students[0].nis},${students[0].nama},${jenisNilai},${topikEvaluasi},95\n${students[1].nis},${students[1].nama},${jenisNilai},${topikEvaluasi},65`);
                      }
                    }}
                    className="text-emerald-600 hover:underline"
                  >
                    Load Contoh Template
                  </button>
                </div>
                <textarea
                  required
                  placeholder="Paste baris data CSV..."
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="w-full h-36 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Proses Impor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
