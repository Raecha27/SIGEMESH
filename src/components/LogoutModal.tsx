import React from 'react';
import { LogOut, AlertTriangle, Shield, CheckCircle2 } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function LogoutModal({ isOpen, onClose, onConfirm, loading }: LogoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-100 relative animate-scale-up">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center border border-rose-200 shadow-xs">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900">Keluar dari Aplikasi</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Apakah Anda yakin ingin mengakhiri sesi dan keluar dari aplikasi <span className="font-bold text-slate-800">Teacher Assistant</span>?
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <Shield className="h-4 w-4 text-blue-600" />
            <span>Informasi Sesi Pengguna:</span>
          </div>
          <ul className="text-slate-600 space-y-1 pl-6 list-disc text-[11px] font-medium">
            <li>Sesi aktif Anda akan diakhiri secara aman.</li>
            <li>Token autentikasi Supabase & lokal akan dibersihkan.</li>
            <li>Anda perlu masuk kembali untuk mengakses fitur aplikasi.</li>
          </ul>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Mengakhiri Sesi...</span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                <span>Ya, Keluar Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
