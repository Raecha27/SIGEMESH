import React, { useState } from 'react';
import {
  UserCheck,
  Download,
  Printer,
  School,
  GraduationCap,
  Calendar,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Activity,
  BarChart2
} from 'lucide-react';
import { db } from '../utils/storage';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { PrintHeader } from './print/PrintHeader';
import { PrintFooter } from './print/PrintFooter';
import { PrintButton } from './print/PrintButton';
import { Siswa, Kelas, MataPelajaran, Absensi, AbsensiDetail, Guru } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function RekapAbsensiView() {
  const [activeSubTab, setActiveSubTab] = useState<'kelas' | 'siswa' | 'periode'>('kelas');

  // Filter States
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>('2025/2026');
  const [selectedSemester, setSelectedSemester] = useState<string>('Ganjil');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedMapelId, setSelectedMapelId] = useState<string>('');
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // DB States & Role Scoping
  const isGuru = db.isGuru();
  const isWaliKelas = db.isWaliKelas();
  const homeroomClass = db.getHomeroomClass();
  const teacherClasses = db.getTeacherClasses();
  const teacherMapels = db.getTeacherMapels();

  const school = db.getSettings();
  const kelasList = db.getKelas();
  const mapelList = db.getMapels();
  const gurus = db.getGurus();
  const students = db.getSiswas().filter(s => s.status === 'active');
  const allAbsensis = db.getAbsensis();
  const allAbsensiDetails = db.getAbsensiDetails();

  const availableKelasList = isGuru
    ? teacherClasses
    : isWaliKelas && homeroomClass
    ? [homeroomClass]
    : kelasList;

  const availableMapelList = isGuru
    ? teacherMapels
    : mapelList;

  // Set initial default selections & enforce homeroom class for Wali Kelas / Guru
  React.useEffect(() => {
    if (isWaliKelas && homeroomClass) {
      setSelectedKelasId(homeroomClass.id);
    } else if (isGuru && teacherClasses.length > 0) {
      if (!teacherClasses.some(k => k.id === selectedKelasId)) {
        setSelectedKelasId(teacherClasses[0].id);
      }
    } else if (kelasList.length > 0 && !selectedKelasId) {
      setSelectedKelasId(kelasList[0].id);
    }
  }, [isGuru, isWaliKelas, homeroomClass, teacherClasses, kelasList]);

  React.useEffect(() => {
    if (isGuru && teacherMapels.length > 0) {
      if (!teacherMapels.some(m => m.id === selectedMapelId)) {
        setSelectedMapelId(teacherMapels[0].id);
      }
    } else if (mapelList.length > 0 && !selectedMapelId) {
      setSelectedMapelId(mapelList[0].id);
    }
  }, [isGuru, teacherMapels, mapelList]);

  React.useEffect(() => {
    if (selectedKelasId) {
      const activeClass = kelasList.find(k => k.id === selectedKelasId);
      if (activeClass) {
        if (mapelList.length > 0 && !selectedMapelId) {
          setSelectedMapelId(mapelList[0].id);
        }
      }
    }
  }, [selectedKelasId, mapelList]);

  React.useEffect(() => {
    if (selectedKelasId) {
      const classStudents = students.filter(s => s.kelasId === selectedKelasId);
      if (classStudents.length > 0 && !selectedSiswaId) {
        setSelectedSiswaId(classStudents[0].id);
      }
    }
  }, [selectedKelasId, students]);

  // Derived filtered items
  const activeClass = kelasList.find(k => k.id === selectedKelasId);
  const activeMapel = mapelList.find(m => m.id === selectedMapelId);
  const activeGuru = gurus.find(g => g.id === (selectedGuruId || activeMapel?.guruId));
  const activeSiswa = students.find(s => s.id === selectedSiswaId);
  const classStudents = students.filter(s => s.kelasId === selectedKelasId);

  // Filter attendance records
  const getFilteredAbsensiData = () => {
    // 1. Filter absensi master
    const absensiMasterFiltered = allAbsensis.filter(abs => {
      if (selectedKelasId && abs.kelasId !== selectedKelasId) return false;
      if (startDate && abs.tanggal < startDate) return false;
      if (endDate && abs.tanggal > endDate) return false;
      if (selectedGuruId && abs.dicatatOleh !== selectedGuruId) return false;
      return true;
    });

    const masterIds = absensiMasterFiltered.map(m => m.id);

    // 2. Filter details based on master IDs and student/mapel filters
    return allAbsensiDetails.filter(det => {
      if (!masterIds.includes(det.absensiId)) return false;
      if (selectedSiswaId && det.siswaId !== selectedSiswaId) return false;
      return true;
    });
  };

  const filteredDetails = getFilteredAbsensiData();

  // Get personal attendance counters for a single student
  const getStudentAttendanceStats = (siswaId: string) => {
    const studentMasterRecords = allAbsensis.filter(abs => {
      if (selectedKelasId && abs.kelasId !== selectedKelasId) return false;
      if (startDate && abs.tanggal < startDate) return false;
      if (endDate && abs.tanggal > endDate) return false;
      return true;
    });

    const sMasterIds = studentMasterRecords.map(m => m.id);
    const personalDetails = allAbsensiDetails.filter(d => d.siswaId === siswaId && sMasterIds.includes(d.absensiId));

    const total = personalDetails.length;
    const hadir = personalDetails.filter(d => d.status === 'Hadir' || d.status === 'Terlambat').length;
    const sakit = personalDetails.filter(d => d.status === 'Sakit').length;
    const izin = personalDetails.filter(d => d.status === 'Izin').length;
    const alpha = personalDetails.filter(d => d.status === 'Alpha').length;
    const terlambat = personalDetails.filter(d => d.status === 'Terlambat').length;

    const rate = total > 0 ? Math.round((hadir / total) * 100) : 100;

    return { total, hadir, sakit, izin, alpha, terlambat, rate };
  };

  // Compile Class overall attendance statistics
  const getClassStats = () => {
    let tTotal = 0;
    let tHadir = 0;
    let tSakit = 0;
    let tIzin = 0;
    let tAlpha = 0;
    let tTerlambat = 0;

    classStudents.forEach(s => {
      const stats = getStudentAttendanceStats(s.id);
      tTotal += stats.total;
      tHadir += stats.hadir;
      tSakit += stats.sakit;
      tIzin += stats.izin;
      tAlpha += stats.alpha;
      tTerlambat += stats.terlambat;
    });

    const overallHadirPercentage = tTotal > 0 ? Math.round((tHadir / tTotal) * 100) : 100;

    const pieData = [
      { name: 'Hadir', value: tHadir, color: '#10b981' },
      { name: 'Sakit', value: tSakit, color: '#3b82f6' },
      { name: 'Izin', value: tIzin, color: '#f59e0b' },
      { name: 'Alpha', value: tAlpha, color: '#ef4444' }
    ];

    return {
      tTotal,
      tHadir,
      tSakit,
      tIzin,
      tAlpha,
      tTerlambat,
      overallHadirPercentage,
      pieData
    };
  };

  const classStats = getClassStats();


  const handleExportExcel = () => {
    if (activeSubTab === 'kelas' || activeSubTab === 'periode') {
      if (!selectedKelasId) return;
      const headers = ["No", "NIS", "Nama Siswa", "Total Pertemuan", "Hadir", "Sakit", "Izin", "Alpha", "Terlambat", "Persentase Kehadiran"];
      const keys = ["no", "nis", "nama", "total", "hadir", "sakit", "izin", "alpha", "terlambat", "rate"];
      const data = classStudents.map((s, idx) => {
        const stats = getStudentAttendanceStats(s.id);
        return {
          no: idx + 1,
          nis: s.nis,
          nama: s.nama,
          total: stats.total,
          hadir: stats.hadir,
          sakit: stats.sakit,
          izin: stats.izin,
          alpha: stats.alpha,
          terlambat: stats.terlambat,
          rate: `${stats.rate}%`
        };
      });
      exportToExcel(data, headers, keys, `Rekap_Absensi_Kelas_${activeClass?.nama || 'Kelas'}`);
    } else if (activeSubTab === 'siswa') {
      if (!selectedSiswaId || !activeSiswa) return;
      const headers = ["No", "Tanggal", "Status Kehadiran", "Catatan"];
      const keys = ["no", "tanggal", "status", "keterangan"];
      
      const data = filteredDetails.map((det, idx) => {
        const master = allAbsensis.find(a => a.id === det.absensiId);
        return {
          no: idx + 1,
          tanggal: master?.tanggal || '-',
          status: det.status,
          keterangan: det.keterangan || '-'
        };
      });
      exportToExcel(data, headers, keys, `Rekap_Absensi_Siswa_${activeSiswa.nama}`);
    }
    db.logActivity("Ekspor Rekap Absensi Excel", `Melakukan ekspor rekap absensi sub-tab ${activeSubTab} ke Excel`);
  };

  const handleExportPDF = () => {
    const activeUser = db.getCurrentUser();
    if (activeSubTab === 'kelas' || activeSubTab === 'periode') {
      if (!selectedKelasId) return;
      const headers = ["#", "NIS", "Nama Siswa", "Total", "Hadir", "Sakit", "Izin", "Alpha", "Terlambat", "Rate %"];
      const body = classStudents.map((s, idx) => {
        const stats = getStudentAttendanceStats(s.id);
        return [
          idx + 1,
          s.nis,
          s.nama,
          stats.total,
          stats.hadir,
          stats.sakit,
          stats.izin,
          stats.alpha,
          stats.terlambat,
          `${stats.rate}%`
        ];
      });
      exportToPDF(
        `Laporan Rekapitulasi Presensi / Absensi Kelas - ${activeClass?.nama || ''}`,
        headers,
        body,
        `Rekap_Absensi_Kelas_${activeClass?.nama || ''}`,
        {
          subtitle: `Tahun Ajaran: 2026/2027 | Semester: Ganjil`,
          guruNama: activeUser.name,
          guruNip: activeUser.nip || '........................'
        }
      );
    } else if (activeSubTab === 'siswa') {
      if (!selectedSiswaId || !activeSiswa) return;
      const headers = ["#", "Tanggal Pertemuan", "Status Kehadiran", "Catatan / Keterangan"];
      const body = filteredDetails.map((det, idx) => {
        const master = allAbsensis.find(a => a.id === det.absensiId);
        return [
          idx + 1,
          master?.tanggal || '-',
          det.status,
          det.keterangan || '-'
        ];
      });
      exportToPDF(
        `Laporan Presensi Individual Peserta Didik`,
        headers,
        body,
        `Rekap_Absensi_Siswa_${activeSiswa.nama}`,
        {
          subtitle: `Nama Siswa: ${activeSiswa.nama} (NIS: ${activeSiswa.nis}) | Kelas: ${activeClass?.nama || ''}`,
          guruNama: activeUser.name,
          guruNip: activeUser.nip || '........................'
        }
      );
    }
    db.logActivity("Ekspor Rekap Absensi PDF", `Melakukan ekspor rekap absensi sub-tab ${activeSubTab} ke PDF`);
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex flex-wrap gap-1 w-fit no-print">
        <button
          onClick={() => {
            setActiveSubTab('kelas');
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'kelas'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <School className="h-3.5 w-3.5" />
          Rekap Absensi Kelas
        </button>
        <button
          onClick={() => {
            setActiveSubTab('siswa');
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'siswa'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="h-3.5 w-3.5" />
          Rekap Absensi Siswa
        </button>
        <button
          onClick={() => {
            setActiveSubTab('periode');
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'periode'
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          Rekap Absensi Periode
        </button>
      </div>

      {/* FILTER CONTROLS PANEL */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4 no-print">
        <div className="flex items-center gap-2 text-slate-700 font-extrabold text-xs uppercase tracking-wider">
          <Filter className="h-4 w-4 text-emerald-500" />
          <span>Filter Kehadiran</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1 text-xs font-bold text-slate-500">
            <label>Tahun Ajaran</label>
            <select
              value={selectedTahunAjaran}
              onChange={(e) => setSelectedTahunAjaran(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
            >
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
            </select>
          </div>

          <div className="space-y-1 text-xs font-bold text-slate-500">
            <label>Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          <div className="space-y-1 text-xs font-bold text-slate-500">
            <label>Kelas / Rombel</label>
            <select
              value={selectedKelasId}
              disabled={isWaliKelas && availableKelasList.length === 1}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className={`w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none ${
                isWaliKelas && availableKelasList.length === 1 ? 'bg-slate-100 cursor-not-allowed text-slate-500' : ''
              }`}
            >
              <option value="">-- Pilih Kelas --</option>
              {availableKelasList.map(k => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 text-xs font-bold text-slate-500">
            <label>Mata Pelajaran</label>
            <select
              value={selectedMapelId}
              onChange={(e) => setSelectedMapelId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
            >
              <option value="">-- Semua Mapel --</option>
              {availableMapelList.map(m => (
                <option key={m.id} value={m.id}>{m.nama}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-slate-100 pt-3">
          <div className="space-y-1 text-xs font-bold text-slate-500">
            <label>Guru / Petugas Pencatat</label>
            <select
              value={selectedGuruId}
              onChange={(e) => setSelectedGuruId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
            >
              <option value="">-- Semua Guru --</option>
              {gurus.map(g => (
                <option key={g.id} value={g.id}>{g.nama}</option>
              ))}
            </select>
          </div>

          {activeSubTab === 'siswa' && (
            <div className="space-y-1 text-xs font-bold text-slate-500">
              <label>Siswa</label>
              <select
                value={selectedSiswaId}
                onChange={(e) => setSelectedSiswaId(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
              >
                <option value="">-- Pilih Siswa --</option>
                {classStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1 text-xs font-bold text-slate-500">
            <label>Kehadiran Dari</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
            />
          </div>

          <div className="space-y-1 text-xs font-bold text-slate-500">
            <label>Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" />
            Ekspor Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-rose-500" />
            Ekspor PDF
          </button>
          <PrintButton
            elementId={activeSubTab === 'kelas' ? 'rekap-absensi-kelas-print' : 'rekap-absensi-siswa-print'}
            title={`Rekap Presensi (${activeSubTab === 'kelas' ? 'Per Kelas' : 'Per Siswa'})`}
            permission="rekap.print"
            activityLogDetail={`Mencetak rekap absensi sub-tab ${activeSubTab}`}
            variant="solid"
          />
        </div>
      </div>

      {/* RENDER STATISTIK KEHADIRAN (VISUALS) */}
      {classStats.tTotal > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
          {/* Pie Chart Kehadiran */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-emerald-500" />
              Persentase Kehadiran Rerata Kelas
            </h4>
            <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="h-44 w-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={classStats.pieData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {classStats.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2 text-xs font-bold text-slate-600">
                <p className="text-sm font-black text-emerald-600 font-mono">{classStats.overallHadirPercentage}% Hadir Rerata</p>
                {classStats.pieData.map((d, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span>{d.name}: {d.value} Catatan</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar Chart Pertemuan per Siswa */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-1.5">
              <BarChart2 className="h-4 w-4 text-blue-500" />
              Rasio Kehadiran 5 Siswa Pertama
            </h4>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={classStudents.slice(0, 5).map(s => {
                    const stats = getStudentAttendanceStats(s.id);
                    return {
                      name: s.nama.split(' ')[0],
                      'Hadir %': stats.rate
                    };
                  })}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontStyle="bold" />
                  <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="Hadir %" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: CLASS ATTENDANCE BOARD */}
      {activeSubTab === 'kelas' && (
        <div id="rekap-absensi-kelas-print" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 print:border-none print:p-0">
          {/* Printable Header */}
          <div className="flex items-center justify-between border-b-4 border-double border-slate-800 pb-4">
            <div className="text-left space-y-1">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{school.namaSekolah}</h2>
              <p className="text-[10px] text-slate-500 font-bold font-mono">{school.alamat}</p>
            </div>
            <img
              src={school.logo}
              alt="Logo Sekolah"
              className="w-14 h-14 rounded-xl border border-slate-200"
            />
          </div>

          <div className="text-center">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Laporan Rekapitulasi Absensi & Kehadiran Kelas</h3>
            <p className="text-xs text-slate-500 mt-1 font-semibold">Tahun Ajaran {selectedTahunAjaran} • Semester {selectedSemester}</p>
          </div>

          {/* Info table */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-semibold text-slate-600">
            <div className="space-y-1.5">
              <p>Kelas / Rombel: <span className="text-slate-800 font-bold">{activeClass?.nama || '-'}</span></p>
              <p>Wali Kelas: <span className="text-slate-800 font-bold">{gurus.find(g => g.id === activeClass?.waliKelasId)?.nama || '-'}</span></p>
            </div>
            <div className="space-y-1.5 text-right font-mono">
              <p>Mata Pelajaran: <span className="text-slate-800 font-bold">{activeMapel?.nama || 'Semua Mata Pelajaran'}</span></p>
              <p>Periode Kehadiran: <span className="text-slate-800">{startDate || 'Awal'} s/d {endDate || 'Akhir'}</span></p>
            </div>
          </div>

          {/* Core Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-mono uppercase">
                  <th className="py-2.5 px-4 font-bold">No</th>
                  <th className="py-2.5 px-4 font-bold">NIS</th>
                  <th className="py-2.5 px-4 font-bold">Nama Siswa</th>
                  <th className="py-2.5 px-4 font-bold text-center">Hadir</th>
                  <th className="py-2.5 px-4 font-bold text-center">Sakit</th>
                  <th className="py-2.5 px-4 font-bold text-center">Izin</th>
                  <th className="py-2.5 px-4 font-bold text-center">Alpha</th>
                  <th className="py-2.5 px-4 font-bold text-center">Terlambat</th>
                  <th className="py-2.5 px-4 font-bold text-center">Rasio %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {classStudents.map((siswa, idx) => {
                  const stats = getStudentAttendanceStats(siswa.id);
                  return (
                    <tr key={siswa.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-500">{siswa.nis}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">{siswa.nama}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-emerald-600 bg-emerald-50/10 font-bold">{stats.hadir}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-blue-600">{stats.sakit}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-amber-600">{stats.izin}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-rose-600 bg-rose-50/10 font-bold">{stats.alpha}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-indigo-600">{stats.terlambat}</td>
                      <td className="py-2.5 px-4 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded font-black ${
                          stats.rate >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {stats.rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Standard Guru Signature */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-12 text-xs font-bold text-center">
            <div></div>
            <div className="space-y-20 ml-auto w-64">
              <div className="space-y-1">
                <p className="text-slate-500 font-medium">Mengetahui,</p>
                <p className="text-slate-800 font-bold">Guru Mata Pelajaran</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-slate-800 underline font-extrabold text-[13px]">{activeGuru?.nama || '_______________________'}</p>
                <p className="text-slate-400 font-mono text-[10px] font-normal">NIP : {activeGuru?.nip || '........................'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: INDIVIDUAL STUDENT ATTENDANCE */}
      {activeSubTab === 'siswa' && (
        <div id="rekap-absensi-siswa-print" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 max-w-4xl mx-auto print:border-none print:p-0">
          {selectedSiswaId && activeSiswa ? (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b-4 border-double border-slate-800 pb-4">
                <div className="text-left space-y-1">
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{school.namaSekolah}</h2>
                  <p className="text-[10px] text-slate-500 font-bold font-mono">{school.alamat}</p>
                </div>
                <img
                  src={school.logo}
                  alt="Logo Sekolah"
                  className="w-12 h-12 rounded-lg border border-slate-200"
                />
              </div>

              <div className="text-center">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Lembar Kartu Kontrol Kehadiran Siswa (Rincian)</h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Tahun Ajaran {selectedTahunAjaran} • Semester {selectedSemester}</p>
              </div>

              {/* Bio block */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-semibold text-slate-600">
                <div className="space-y-1.5">
                  <p>Nama Siswa: <span className="text-slate-800 font-bold">{activeSiswa.nama}</span></p>
                  <p>NIS / NISN: <span className="text-slate-800 font-mono font-bold">{activeSiswa.nis} / {activeSiswa.nisn || '-'}</span></p>
                </div>
                <div className="space-y-1.5 text-right font-mono">
                  <p>Kelas / Rombel: <span className="text-slate-800 font-bold">{activeClass?.nama || '-'}</span></p>
                  <p>Guru Pengampu: <span className="text-slate-800 font-bold">{activeGuru?.nama || '-'}</span></p>
                </div>
              </div>

              {/* Detail list of individual attendance occurrences */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-mono uppercase">
                      <th className="py-2.5 px-4 font-bold">No</th>
                      <th className="py-2.5 px-4 font-bold">Tanggal Pertemuan</th>
                      <th className="py-2.5 px-4 font-bold text-center">Status Kehadiran</th>
                      <th className="py-2.5 px-4 font-bold">Catatan / Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                    {filteredDetails.map((det, idx) => {
                      const master = allAbsensis.find(a => a.id === det.absensiId);
                      return (
                        <tr key={det.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-700">{master?.tanggal || '-'}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded font-black text-[10px] ${
                              det.status === 'Hadir' || det.status === 'Terlambat'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : det.status === 'Sakit'
                                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                : det.status === 'Izin'
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {det.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 font-normal">{det.keterangan || '-'}</td>
                        </tr>
                      );
                    })}
                    {filteredDetails.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 italic font-normal">
                          Belum ada riwayat presensi kehadiran yang tercatat untuk siswa ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Standard Signature */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-12 text-xs font-bold text-center">
                <div></div>
                <div className="space-y-20 ml-auto w-64">
                  <div className="space-y-1">
                    <p className="text-slate-500 font-medium font-sans">Mengetahui,</p>
                    <p className="text-slate-800 font-bold font-sans">Guru Mata Pelajaran</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-slate-800 underline font-extrabold text-[13px]">{activeGuru?.nama || '_______________________'}</p>
                    <p className="text-slate-400 font-mono text-[10px] font-normal">NIP : {activeGuru?.nip || '........................'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs italic font-normal">
              Silakan pilih rombel dan peserta didik terlebih dahulu pada bar filter di atas untuk memuat kartu presensi siswa.
            </div>
          )}
        </div>
      )}

      {/* RENDER VIEW: PERIODIC CHRONOLOGICAL */}
      {activeSubTab === 'periode' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="text-center pb-2">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Log Aktivitas Absensi Kelas Berurutan (Kronologis)</h3>
            <p className="text-xs text-slate-500 mt-1">Periode Tanggal: {startDate || 'Awal'} s/d {endDate || 'Akhir'}</p>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-mono uppercase">
                  <th className="py-2.5 px-4 font-bold">No</th>
                  <th className="py-2.5 px-4 font-bold">Tanggal</th>
                  <th className="py-2.5 px-4 font-bold">Kelas</th>
                  <th className="py-2.5 px-4 font-bold">Dicatat Oleh</th>
                  <th className="py-2.5 px-4 font-bold text-center">Pertemuan Ke</th>
                  <th className="py-2.5 px-4 font-bold text-center">Hadir</th>
                  <th className="py-2.5 px-4 font-bold text-center">Sakit</th>
                  <th className="py-2.5 px-4 font-bold text-center">Izin</th>
                  <th className="py-2.5 px-4 font-bold text-center">Alpha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {allAbsensis
                  .filter(a => {
                    if (selectedKelasId && a.kelasId !== selectedKelasId) return false;
                    if (startDate && a.tanggal < startDate) return false;
                    if (endDate && a.tanggal > endDate) return false;
                    return true;
                  })
                  .map((abs, idx) => {
                    const classObj = kelasList.find(k => k.id === abs.kelasId);
                    const recorder = gurus.find(g => g.id === abs.dicatatOleh);
                    const detList = allAbsensiDetails.filter(d => d.absensiId === abs.id);

                    const h = detList.filter(d => d.status === 'Hadir' || d.status === 'Terlambat').length;
                    const s = detList.filter(d => d.status === 'Sakit').length;
                    const i = detList.filter(d => d.status === 'Izin').length;
                    const a = detList.filter(d => d.status === 'Alpha').length;

                    return (
                      <tr key={abs.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-700">{abs.tanggal}</td>
                        <td className="py-2.5 px-4 text-slate-800">{classObj?.nama || '-'}</td>
                        <td className="py-2.5 px-4 text-slate-600">{recorder?.nama || '-'}</td>
                        <td className="py-2.5 px-4 text-center font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-4 text-center font-mono text-emerald-600">{h}</td>
                        <td className="py-2.5 px-4 text-center font-mono text-blue-600">{s}</td>
                        <td className="py-2.5 px-4 text-center font-mono text-amber-600">{i}</td>
                        <td className="py-2.5 px-4 text-center font-mono text-rose-600">{a}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
