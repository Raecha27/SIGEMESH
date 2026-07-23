import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Calendar,
  Save,
  CheckCircle,
  Clock,
  ShieldAlert,
  AlertTriangle,
  History,
  Info,
  Printer,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { db } from '../utils/storage';
import { exportToExcel, exportToPDF, showDirectToast } from '../utils/exportUtils';
import { PrintHeader } from './print/PrintHeader';
import { PrintFooter } from './print/PrintFooter';
import { PrintButton } from './print/PrintButton';
import { Absensi, AbsensiDetail, AbsensiStatus, Siswa, Kelas, Jadwal } from '../types';

export default function AbsensiView() {
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedJadwalId, setSelectedJadwalId] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);

  // DB States
  const [kelasList, setKelasList] = useState<Kelas[]>(() => db.getKelas());
  const [jadwalList, setJadwalList] = useState<Jadwal[]>(() => db.getJadwals());
  const [students, setStudents] = useState<Siswa[]>([]);
  const [absensis, setAbsensis] = useState<Absensi[]>(() => db.getAbsensis());
  const [absensiDetails, setAbsensiDetails] = useState<AbsensiDetail[]>(() => db.getAbsensiDetails());

  // Local Attendance Input Grid State
  const [attendanceGrid, setAttendanceGrid] = useState<{
    [siswaId: string]: { status: AbsensiStatus; keterangan: string };
  }>({});

  // History State
  const [selectedHistoryAbsensi, setSelectedHistoryAbsensi] = useState<Absensi | null>(null);

  // Role Check & Permission Gate
  const isGuru = db.isGuru();
  const isWaliKelas = db.isWaliKelas();
  const homeroomClass = db.getHomeroomClass();
  const teacherClasses = db.getTeacherClasses();
  const teacherJadwals = db.getTeacherJadwals();

  const availableKelasList = isGuru
    ? teacherClasses
    : isWaliKelas && homeroomClass
    ? [homeroomClass]
    : kelasList;

  const availableJadwalList = isGuru
    ? teacherJadwals
    : jadwalList;

  const canInput = db.hasPermission('absensi.input');
  const canEdit = db.hasPermission('absensi.edit');

  // Auto-set class / schedule for Wali Kelas or single class Guru
  useEffect(() => {
    if (isWaliKelas && homeroomClass) {
      setSelectedKelasId(homeroomClass.id);
    } else if (isGuru && availableKelasList.length > 0 && !selectedKelasId) {
      setSelectedKelasId(availableKelasList[0].id);
    }
  }, [isGuru, isWaliKelas, homeroomClass]);

  // Trigger loading students and setting grid when Class changes
  useEffect(() => {
    if (selectedKelasId) {
      const classStudents = db.getSiswas().filter(s => s.kelasId === selectedKelasId && s.status === 'active');
      setStudents(classStudents);

      // Check if attendance already exists for this class, schedule, and date
      const existing = absensis.find(
        a => a.kelasId === selectedKelasId && a.jadwalId === selectedJadwalId && a.tanggal === tanggal
      );

      const newGrid: typeof attendanceGrid = {};
      if (existing) {
        // Load existing
        const details = absensiDetails.filter(d => d.absensiId === existing.id);
        classStudents.forEach(s => {
          const det = details.find(d => d.siswaId === s.id);
          newGrid[s.id] = {
            status: det ? det.status : 'Hadir',
            keterangan: det?.keterangan || ''
          };
        });
      } else {
        // Default to "Hadir" for all
        classStudents.forEach(s => {
          newGrid[s.id] = { status: 'Hadir', keterangan: '' };
        });
      }
      setAttendanceGrid(newGrid);
    } else {
      setStudents([]);
      setAttendanceGrid({});
    }
  }, [selectedKelasId, selectedJadwalId, tanggal, absensis, absensiDetails]);

  // Handle individual change
  const handleStatusChange = (siswaId: string, status: AbsensiStatus) => {
    setAttendanceGrid(prev => ({
      ...prev,
      [siswaId]: { ...prev[siswaId], status }
    }));
  };

  const handleKeteranganChange = (siswaId: string, keterangan: string) => {
    setAttendanceGrid(prev => ({
      ...prev,
      [siswaId]: { ...prev[siswaId], keterangan }
    }));
  };

  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKelasId || !selectedJadwalId || !tanggal) {
      alert("Silakan lengkapi pilihan Kelas, Jadwal, dan Tanggal terlebih dahulu!");
      return;
    }

    // Check if updating or adding new
    const existing = absensis.find(
      a => a.kelasId === selectedKelasId && a.jadwalId === selectedJadwalId && a.tanggal === tanggal
    );

    const absensiId = existing ? existing.id : `abs-${Date.now()}`;
    const currentUser = db.getCurrentUser();

    // 1. Create/Update Absensi parent
    let updatedAbsensis = [...absensis];
    if (!existing) {
      const newAbs: Absensi = {
        id: absensiId,
        kelasId: selectedKelasId,
        jadwalId: selectedJadwalId,
        tanggal,
        dicatatOleh: currentUser.id
      };
      updatedAbsensis.push(newAbs);
    }

    // 2. Create/Update details
    // Remove existing details for this absensi id first
    let updatedDetails = absensiDetails.filter(d => d.absensiId !== absensiId);
    
    // Add new ones from grid
    const newDetails: AbsensiDetail[] = Object.keys(attendanceGrid).map((siswaId, index) => ({
      id: `absd-${Date.now()}-${index}`,
      absensiId,
      siswaId,
      status: attendanceGrid[siswaId].status,
      keterangan: attendanceGrid[siswaId].keterangan
    }));
    updatedDetails = [...updatedDetails, ...newDetails];

    // Persist
    db.setAbsensis(updatedAbsensis);
    db.setAbsensiDetails(updatedDetails);
    
    setAbsensis(updatedAbsensis);
    setAbsensiDetails(updatedDetails);

    const kName = kelasList.find(k => k.id === selectedKelasId)?.nama || '';
    db.logActivity("Simpan Absensi", `Mencatat absensi harian kelas ${kName} tanggal ${tanggal}`);
    alert("Absensi siswa berhasil disimpan!");
  };

  // Quick Stats
  const gridValues = Object.values(attendanceGrid) as { status: AbsensiStatus; keterangan: string }[];
  const totalStudents = gridValues.length;
  const countGrid = (st: AbsensiStatus) => gridValues.filter(v => v.status === st).length;

  const handleExportExcel = () => {
    if (!selectedKelasId || !selectedJadwalId) return;
    const kelas = db.getKelas().find(k => k.id === selectedKelasId);
    const jadwal = db.getJadwals().find(j => j.id === selectedJadwalId);
    const mapel = db.getMapels().find(m => m.id === jadwal?.mapelId);

    const headers = ["NIS", "Nama Siswa", "Status Kehadiran", "Catatan / Keterangan"];
    const keys = ["nis", "nama", "status", "catatan"];
    
    const exportData = students.map(s => {
      const state = attendanceGrid[s.id] || { status: 'Hadir', keterangan: '' };
      return {
        nis: s.nis,
        nama: s.nama,
        status: state.status,
        catatan: state.keterangan || '-'
      };
    });

    exportToExcel(exportData, headers, keys, `Presensi_${kelas?.nama || ''}_${tanggal}`);
    db.logActivity("Ekspor Presensi Excel", "Melakukan ekspor lembar presensi kelas ke file Excel");
  };

  const handleExportPDF = () => {
    if (!db.hasPermission('absensi.print')) {
      showDirectToast("Anda tidak memiliki hak akses untuk mengekspor Presensi! (absensi.print)", "error");
      return;
    }
    if (!selectedKelasId || !selectedJadwalId) return;
    const kelas = db.getKelas().find(k => k.id === selectedKelasId);
    const jadwal = db.getJadwals().find(j => j.id === selectedJadwalId);
    const mapel = db.getMapels().find(m => m.id === jadwal?.mapelId);

    const headers = ["#", "NIS", "Nama Lengkap Siswa", "Status Kehadiran", "Catatan"];
    const body = students.map((s, idx) => {
      const state = attendanceGrid[s.id] || { status: 'Hadir', keterangan: '' };
      return [
        idx + 1,
        s.nis,
        s.nama,
        state.status,
        state.keterangan || '-'
      ];
    });

    const activeUser = db.getCurrentUser();
    exportToPDF(
      `Daftar Kehadiran Siswa Kelas ${kelas?.nama || ''}`,
      headers,
      body,
      `Presensi_${kelas?.nama || ''}_${tanggal}`,
      {
        subtitle: `Mata Pelajaran: ${mapel?.nama || ''} | Tanggal Pertemuan: ${tanggal}`,
        guruNama: activeUser.name,
        guruNip: activeUser.nip || '........................'
      }
    );
    db.logActivity("Ekspor Presensi PDF", "Melakukan ekspor lembar presensi kelas ke file PDF");
  };


  return (
    <div className="space-y-6">
      {/* Read-only Alert */}
      {!canInput && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-medium">
          <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Akses Terbatas:</strong> Anda tidak masuk dengan peran Guru Pengajar. Anda dapat meninjau riwayat absensi namun tidak diizinkan mengubah status kehadiran siswa.
          </span>
        </div>
      )}

      {/* Roster & Setup Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
          <Calendar className="h-4.5 w-4.5 text-emerald-500" />
          Konfigurasi Sesi Absensi Kelas
        </h3>

        <form onSubmit={handleSaveAttendance} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Kelas Selection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Pilih Rombongan Belajar (Kelas)</label>
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

            {/* Jadwal Selection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Pilih Sesi Jadwal</label>
              <select
                required
                value={selectedJadwalId}
                onChange={(e) => setSelectedJadwalId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-semibold text-slate-700"
              >
                <option value="">-- Pilih Jadwal KBM --</option>
                {availableJadwalList
                  .filter(j => !selectedKelasId || j.kelasId === selectedKelasId)
                  .map(j => {
                    const mapelName = db.getMapels().find(m => m.id === j.mapelId)?.nama || 'Mapel';
                    return (
                      <option key={j.id} value={j.id}>
                        {j.hari} • {j.jamMulai}-{j.jamSelesai} ({mapelName})
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* Tanggal */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Tanggal Kegiatan KBM</label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 font-mono"
              />
            </div>
          </div>

          {/* 1. Student Attendance Grid */}
          {selectedKelasId && selectedJadwalId ? (
            <div id="absensi-table-print" className="border-t border-slate-100 pt-5 space-y-4">
              <PrintHeader
                title="DAFTAR PRESENSI KEHADIRAN SISWA"
                subtitle="Lembar Presensi Tatap Muka Kelas"
                metadata={[
                  { label: 'Kelas', value: kelasList.find(k => k.id === selectedKelasId)?.nama || '' },
                  { label: 'Mata Pelajaran', value: db.getMapels().find(m => m.id === jadwalList.find(j => j.id === selectedJadwalId)?.mapelId)?.nama || '' },
                  { label: 'Tanggal Pertemuan', value: tanggal }
                ]}
              />
              {/* Export/Print Row */}
              <div className="flex flex-wrap gap-2 justify-end">
                {/* Excel Export */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  Unduh Excel
                </button>

                {/* PDF Export */}
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Download className="h-3.5 w-3.5 text-rose-500" />
                  Unduh PDF
                </button>

                {/* Print */}
                <PrintButton
                  elementId="absensi-table-print"
                  title="Daftar Presensi Kehadiran Siswa"
                  permission="absensi.print"
                  activityLogDetail="Mencetak daftar presensi kelas"
                  variant="outline"
                />
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-bold text-center">
                <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                  <p className="text-slate-400">Total Siswa</p>
                  <p className="text-base font-black text-slate-800 mt-0.5">{totalStudents}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/60 text-emerald-600">
                  <p className="text-slate-400">Hadir</p>
                  <p className="text-base font-black mt-0.5">{countGrid('Hadir')}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/60 text-amber-600">
                  <p className="text-slate-400">Terlambat</p>
                  <p className="text-base font-black mt-0.5">{countGrid('Terlambat')}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/60 text-blue-600">
                  <p className="text-slate-400">Sakit / Izin</p>
                  <p className="text-base font-black mt-0.5">{countGrid('Sakit') + countGrid('Izin')}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/60 text-rose-600 col-span-2 sm:col-span-1">
                  <p className="text-slate-400">Alpha</p>
                  <p className="text-base font-black mt-0.5">{countGrid('Alpha')}</p>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-xs font-mono uppercase">
                      <th className="py-3 px-4 font-bold">Nama Siswa / NIS</th>
                      <th className="py-3 px-4 font-bold text-center">Status Kehadiran</th>
                      <th className="py-3 px-4 font-bold">Keterangan Tambahan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {students.map((student) => {
                      const value = attendanceGrid[student.id] || { status: 'Hadir', keterangan: '' };
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-800">{student.nama}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIS: {student.nis}</p>
                          </td>

                          {/* Status Options Toggles */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex justify-center items-center gap-1">
                              {(['Hadir', 'Sakit', 'Izin', 'Alpha', 'Terlambat'] as AbsensiStatus[]).map((status) => {
                                const isSelected = value.status === status;
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    disabled={!canInput}
                                    onClick={() => handleStatusChange(student.id, status)}
                                    className={`px-2.5 py-1 rounded-md font-bold transition-all border text-[10px] cursor-pointer ${
                                      isSelected
                                        ? status === 'Hadir'
                                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                                          : status === 'Sakit' || status === 'Izin'
                                          ? 'bg-blue-500 text-white border-blue-500 shadow-xs'
                                          : status === 'Terlambat'
                                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                          : 'bg-rose-500 text-white border-rose-500 shadow-xs'
                                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {status === 'Terlambat' ? 'Lambat' : status}
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Keterangan input */}
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              disabled={!canInput}
                              placeholder="Keterangan (misal: Surat Dokter)"
                              value={value.keterangan}
                              onChange={(e) => handleKeteranganChange(student.id, e.target.value)}
                              className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Save trigger */}
              {canInput && (
                <div className="flex justify-end pt-2 no-print">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md transition-colors cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    Simpan Absensi Kelas
                  </button>
                </div>
              )}

              <PrintFooter />
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200/80 rounded-xl p-8 text-center text-slate-400 text-xs">
              <Info className="h-6 w-6 mx-auto mb-2 text-slate-300" />
              Pilih Rombel Kelas dan Sesi Jadwal Mengajar terlebih dahulu untuk menampilkan data nama siswa.
            </div>
          )}
        </form>
      </div>

      {/* History of absensi logs */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
          <History className="h-4.5 w-4.5 text-slate-500" />
          Riwayat Riwayat Absensi Terkini
        </h3>

        <div className="space-y-2">
          {absensis.map((abs) => {
            const kName = kelasList.find(k => k.id === abs.kelasId)?.nama || '';
            const sched = jadwalList.find(j => j.id === abs.jadwalId);
            const mapelName = sched ? db.getMapels().find(m => m.id === sched.mapelId)?.nama : '';
            const recDetails = absensiDetails.filter(d => d.absensiId === abs.id);
            const counts = {
              H: recDetails.filter(d => d.status === 'Hadir').length,
              S: recDetails.filter(d => d.status === 'Sakit').length,
              I: recDetails.filter(d => d.status === 'Izin').length,
              A: recDetails.filter(d => d.status === 'Alpha').length,
              T: recDetails.filter(d => d.status === 'Terlambat').length
            };

            return (
              <div
                key={abs.id}
                onClick={() => {
                  setSelectedKelasId(abs.kelasId);
                  setSelectedJadwalId(abs.jadwalId);
                  setTanggal(abs.tanggal);
                }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-slate-50/50 border border-slate-200/80 rounded-xl hover:border-emerald-500/40 cursor-pointer transition-all"
                title="Klik untuk memuat ulang absensi di grid atas"
              >
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">
                    {kName} • {mapelName}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Tanggal: <span className="font-semibold text-slate-500">{abs.tanggal}</span> • Waktu: {sched?.jamMulai}-{sched?.jamSelesai}
                  </p>
                </div>

                <div className="mt-2 sm:mt-0 flex flex-wrap gap-1 text-[10px] font-mono">
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100 font-bold">H: {counts.H}</span>
                  <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-100 font-bold">T: {counts.T}</span>
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 font-bold">S: {counts.S} | I: {counts.I}</span>
                  <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-100 font-bold">A: {counts.A}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
