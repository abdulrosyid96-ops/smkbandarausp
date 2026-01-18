
import React from 'react';
import { ExamSession, User } from '../types';
import { db } from '../db';

interface ResultPageProps {
  session: ExamSession;
  user: User;
  onClose: () => void;
}

const ResultPage: React.FC<ResultPageProps> = ({ session, user, onClose }) => {
  const subject = db.getSubjects().find(s => s.id === session.subjectId);
  const totalQuestions = subject?.questionCount || 0;
  const answeredCount = Object.keys(session.answers).length;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-xl w-full p-8 md:p-12 text-center border">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Ujian Selesai!</h1>
        <p className="text-slate-500 mb-8">Terima kasih telah mengikuti ujian dengan jujur.</p>

        <div className="bg-slate-50 rounded-2xl p-6 mb-8 grid grid-cols-2 gap-4 text-left">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mata Pelajaran</div>
              <div className="font-bold text-slate-700">{subject?.name}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Peserta</div>
              <div className="font-bold text-slate-700">{user.name}</div>
            </div>
          </div>
          <div className="space-y-4">
             <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Soal Terjawab</div>
              <div className="font-bold text-slate-700">{answeredCount} / {totalQuestions}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pelanggaran</div>
              <div className="font-bold text-red-600">{session.violations}</div>
            </div>
          </div>
        </div>

        <div className="mb-8 p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-sm text-indigo-700">
           Nilai Anda sedang diproses oleh sistem dan akan dilaporkan langsung ke server sekolah.
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-900 transition shadow-lg active:scale-95"
        >
          KEMBALI KE BERANDA
        </button>

        <p className="mt-6 text-xs text-slate-400">
           Result ID: <span className="font-mono">{session.id}</span>
        </p>
      </div>
    </div>
  );
};

export default ResultPage;
