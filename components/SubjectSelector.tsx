
import React, { useMemo } from 'react';
import { Subject, User, ExamSession } from '../types';
import { db } from '../db';

interface SubjectSelectorProps {
  user: User;
  onSelect: (subject: Subject) => void;
  onLogout: () => void;
}

const SubjectSelector: React.FC<SubjectSelectorProps> = ({ user, onSelect, onLogout }) => {
  const subjects = db.getSubjects();
  const exams = db.getExams();

  const userExams = useMemo(() => 
    exams.filter(e => e.studentId === user.id), 
    [exams, user.id]
  );

  const getSubjectStatus = (subjectId: string) => {
    const existingSession = userExams.find(e => e.subjectId === subjectId);
    if (!existingSession) return 'available';
    return existingSession.status; // 'ongoing', 'completed', 'terminated'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <div>
            <h2 className="font-bold text-lg">Pilih Mata Pelajaran</h2>
            <p className="text-xs text-slate-500">Selamat datang, {user.name} ({user.className})</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="text-slate-500 hover:text-red-600 transition font-medium"
        >
          Keluar
        </button>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {subjects.map((subject) => {
            const status = getSubjectStatus(subject.id);
            const isTaken = status !== 'available';
            
            return (
              <div 
                key={subject.id}
                onClick={() => !isTaken && onSelect(subject)}
                className={`group relative bg-white rounded-xl shadow-sm border p-6 transition-all ${
                  isTaken 
                    ? 'opacity-60 grayscale cursor-not-allowed border-slate-200' 
                    : 'cursor-pointer border-slate-200 hover:border-indigo-500 hover:shadow-md active:scale-95'
                }`}
              >
                {isTaken && (
                  <div className="absolute top-3 right-3">
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">
                      Selesai
                    </span>
                  </div>
                )}
                
                <div className={`w-12 h-12 rounded-lg mb-4 flex items-center justify-center transition ${
                  isTaken 
                    ? 'bg-slate-100 text-slate-300' 
                    : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                
                <h3 className={`font-semibold transition ${
                  isTaken ? 'text-slate-400' : 'text-slate-800 group-hover:text-indigo-700'
                }`}>
                  {subject.name}
                </h3>
                
                <p className="text-sm text-slate-500 mt-1">
                  {subject.questionCount} Soal • 90 Menit
                </p>
                
                <div className="mt-4 flex items-center text-xs font-bold transition">
                  {isTaken ? (
                    <span className="text-slate-400">UJIAN SUDAH DIIKUTI</span>
                  ) : (
                    <span className="text-indigo-600 opacity-0 group-hover:opacity-100">
                      MULAI UJIAN <svg className="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SubjectSelector;
