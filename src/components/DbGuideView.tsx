import React, { useState } from 'react';
import {
  Database,
  Terminal,
  Code2,
  FileCode,
  ShieldCheck,
  Server,
  ArrowRight,
  Info
} from 'lucide-react';

export default function DbGuideView() {
  const [activeTab, setActiveTab] = useState<'erd' | 'schema' | 'rls' | 'triggers'>('schema');

  const erdSchema = `
==========================================================================
                TEACHER ASSISTANT - DATABASE RELATIONAL DIAGRAM
==========================================================================

   +-------------+                                +--------------+
   |   gurus     |                                |    kelas     |
   +-------------+                                +--------------+
   | id   (PK)   | <------------- 1 : 1 --------> | id    (PK)   |
   | nip         | (wali_kelas_id)                | nama         |
   | nama        |                                | tahun_ajaran |
   | status      | <---------+                    +--------------+
   +-------------+           |                           ^
          |                  |                           |
          | 1                | 1                         | 1
          |                  |                           |
          v N                v N                         v N
   +-------------+    +-------------+             +--------------+
   |    mapels   |    |   materis   |             |    siswas    |
   +-------------+    +-------------+             +--------------+
   | id   (PK)   |    | id   (PK)   |             | id   (PK)    |
   | kode        |    | judul       |             | nis          |
   | nama        |    | file_type   |             | nama         |
   | kkm         |    | file_url    |             | kelas_id(FK) |
   | guru_id(FK) |    | kelas_id(FK)|             +--------------+
   +-------------+    +-------------+                    ^
          ^                                              |
          | 1                                            | 1
          |                                              |
          v N                                            v N
   +-------------+                                +--------------+
   |   jadwals   |                                |    nilais    |
   +-------------+                                +--------------+
   | id   (PK)   |                                | id    (PK)   |
   | hari        |                                | skor         |
   | jam_mulai   |                                | jenis        |
   | kelas_id(FK)|                                | siswa_id(FK) |
   | mapel_id(FK)|                                | mapel_id(FK) |
   +-------------+                                +--------------+
          ^
          | 1
          |
          v N
   +------------------+     +------------------+
   |    absensis      |     |  absensi_details |
   +------------------+     +------------------+
   | id      (PK)     | <-> | id      (PK)     |
   | tanggal          | 1:N | absensi_id  (FK) |
   | kelas_id    (FK) |     | siswa_id    (FK) |
   | jadwal_id   (FK) |     | status (H/S/I/A) |
   +------------------+     +------------------+

==========================================================================
`;

  const sqlTables = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLE GURUS (User profile extended from Supabase auth.users)
CREATE TABLE public.gurus (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nip VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    no_telp VARCHAR(20),
    role VARCHAR(20) DEFAULT 'guru' CHECK (role IN ('admin', 'guru', 'wali')),
    mapel_utama VARCHAR(50),
    status VARCHAR(15) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    foto VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. TABLE KELAS (Classrooms / Rombongan Belajar)
CREATE TABLE public.kelas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(30) UNIQUE NOT NULL,
    wali_kelas_id UUID REFERENCES public.gurus(id) ON DELETE SET NULL,
    tahun_ajaran VARCHAR(15) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. TABLE SISWAS (Students roster)
CREATE TABLE public.siswas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nis VARCHAR(20) UNIQUE NOT NULL,
    nisn VARCHAR(20) UNIQUE,
    nama VARCHAR(100) NOT NULL,
    kelas_id UUID REFERENCES public.kelas(id) ON DELETE SET NULL,
    tempat_lahir VARCHAR(50),
    tanggal_lahir DATE,
    jenis_kelamin VARCHAR(10) CHECK (jenis_kelamin IN ('L', 'P')),
    alamat TEXT,
    orang_tua VARCHAR(100),
    status VARCHAR(15) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'alumni')),
    foto VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. TABLE MATA PELAJARAN (Subjects)
CREATE TABLE public.mapels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    guru_id UUID REFERENCES public.gurus(id) ON DELETE SET NULL,
    kkm INT DEFAULT 75 CHECK (kkm BETWEEN 0 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. TABLE JADWALS (Weekly learning calendars)
CREATE TABLE public.jadwals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hari VARCHAR(10) CHECK (hari IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu')),
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    kelas_id UUID REFERENCES public.kelas(id) ON DELETE CASCADE,
    mapel_id UUID REFERENCES public.mapels(id) ON DELETE CASCADE,
    ruangan VARCHAR(50) NOT NULL
);
`;

  const sqlRls = `
-- Enable Row Level Security (RLS) on all core tables
ALTER TABLE public.gurus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siswas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jadwals ENABLE ROW LEVEL SECURITY;

-- 1. POLICY FOR GURUS: Admins have full access, teachers can read all, edit self.
CREATE POLICY "Admins full management" ON public.gurus 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.gurus WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Gurus read only of coworkers" ON public.gurus 
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- 2. POLICY FOR KELAS
CREATE POLICY "Public read for authenticated" ON public.kelas
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins full management of kelas" ON public.kelas
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.gurus WHERE id = auth.uid() AND role = 'admin')
    );

-- 3. POLICY FOR SISWAS
CREATE POLICY "Gurus and Admins select siswas" ON public.siswas
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins modify siswas" ON public.siswas
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.gurus WHERE id = auth.uid() AND role = 'admin')
    );
`;

  const sqlTriggers = `
-- Create Automatic trigger to keep profile synced on Supabase Auth Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.gurus (id, nip, nama, role, status)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'nip', 'GURU-' || floor(random() * 100000)::text),
        COALESCE(new.raw_user_meta_data->>'nama', 'Nama Guru Baru'),
        'guru',
        'active'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution bind
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Create Automatically updated timestamps function
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_gurus_updated_at
    BEFORE UPDATE ON public.gurus
    FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
`;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Database className="h-6 w-6 text-emerald-400" />
            <h2 className="text-lg font-black uppercase tracking-wider">Arsitektur Database PostgreSQL & Supabase</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Panduan lengkap skema tabel, integrasi otentikasi (Supabase Auth), kebijakan Row-Level Security (RLS) serta trigger otomatis untuk sinkronisasi role guru dan admin.
          </p>
        </div>
        <div className="flex-shrink-0 bg-slate-800 p-4 rounded-xl border border-slate-700/80 font-mono text-center">
          <p className="text-[10px] text-slate-400">STATUS PROVISI</p>
          <p className="text-sm font-extrabold text-emerald-400 mt-0.5">READY FOR DEPLOY</p>
        </div>
      </div>

      {/* Selector Tabs */}
      <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 flex gap-1 w-full sm:w-auto overflow-x-auto">
        <button
          onClick={() => setActiveTab('schema')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'schema' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Code2 className="h-3.5 w-3.5" />
          DDL Tables Schema
        </button>
        <button
          onClick={() => setActiveTab('erd')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'erd' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Server className="h-3.5 w-3.5" />
          ASCII ERD Map
        </button>
        <button
          onClick={() => setActiveTab('rls')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'rls' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Supabase RLS Policies
        </button>
        <button
          onClick={() => setActiveTab('triggers')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'triggers' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCode className="h-3.5 w-3.5" />
          Functions & Triggers
        </button>
      </div>

      {/* Render selected tabs */}
      <div className="bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed p-6 rounded-2xl border border-slate-800 shadow-2xl overflow-x-auto relative">
        <div className="absolute top-4 right-4 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-[9px] text-slate-400 font-bold tracking-widest uppercase flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
          SQL Editor
        </div>

        {activeTab === 'schema' && (
          <pre className="whitespace-pre">{sqlTables}</pre>
        )}

        {activeTab === 'erd' && (
          <pre className="whitespace-pre font-mono text-xs text-slate-300 leading-normal">{erdSchema}</pre>
        )}

        {activeTab === 'rls' && (
          <pre className="whitespace-pre">{sqlRls}</pre>
        )}

        {activeTab === 'triggers' && (
          <pre className="whitespace-pre">{sqlTriggers}</pre>
        )}
      </div>

      {/* Help box */}
      <div className="bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold p-4 rounded-xl flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold uppercase text-[10px] tracking-wide text-blue-800 font-mono">Petunjuk Deploy Database:</p>
          <p className="leading-relaxed">
            Salin script SQL di atas ke dalam menu <strong>SQL Editor</strong> di dalam dasbor proyek Supabase Anda untuk mematangkan database relasional, skema tabel, dan RLS untuk Teacher Assistant secara otomatis.
          </p>
        </div>
      </div>
    </div>
  );
}
