
import React, { useState, useEffect, useCallback } from 'react';
import { Subject, User, ExamSession, Question } from '../types';
import { db } from '../db';

interface ExamInterfaceProps {
  user: User;
  subject: Subject;
  session: ExamSession;
  onFinish: (session: ExamSession) => void;
}

const ExamInterface: React.FC<ExamInterfaceProps> = ({ user, subject, session, onFinish }) => {
  const [questions] = useState<Question[]>(() => {
    const all = db.getQuestions().filter(q => q.subjectId === subject.id);
    // If no questions in DB, return mock questions for demo
    if (all.length === 0) {
      return Array.from({ length: subject.questionCount }).map((_, i) => ({
        id: `q-${i}`,
        subjectId: subject.id,
        text: `Ini adalah contoh teks soal nomor ${i + 1} untuk mata pelajaran ${subject.name}. Silakan pilih jawaban yang paling tepat.`,
        options: {
          A: { text: 'Pilihan Jawaban A' },
          B: { text: 'Pilihan Jawaban B' },
          C: { text: 'Pilihan Jawaban C' },
          D: { text: 'Pilihan Jawaban D' },
          E: { text: 'Pilihan Jawaban E' }
        },
        correctAnswer: 'A'
      }));
    }
    return all;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(session.answers);
  const [timeLeft, setTimeLeft] = useState(90 * 60); // 90 minutes in seconds
  const [violations, setViolations] = useState(0);
  const [isCheatWarning, setIsCheatWarning] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);

  // Timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = useCallback(() => {
    onFinish({
      ...session,
      answers,
      violations,
      status: 'completed'
    });
  }, [answers, violations, onFinish, session]);

  // Anti-Cheat: Tab Switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolations(v => {
          const next = v + 1;
          if (next >= 5) {
            handleSubmit();
          } else {
            setIsCheatWarning(true);
          }
          return next;
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent PrintScreen, F12, Ctrl+U, Ctrl+C, Ctrl+V
      if (
        e.key === 'PrintScreen' || 
        e.key === 'F12' || 
        ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'c' || e.key === 'v'))
      ) {
        e.preventDefault();
        setViolations(v => {
          const next = v + 1;
          if (next >= 5) handleSubmit();
          else setIsCheatWarning(true);
          return next;
        });
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleSubmit]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (option: string) => {
    const newAnswers = { ...answers, [questions[currentIndex].id]: option };
    setAnswers(newAnswers);
  };

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="flex flex-col h-screen bg-slate-100 no-select overflow-hidden">
      {/* Header */}
      <header className="bg-indigo-700 text-white px-4 md:px-6 py-3 md:py-4 flex justify-between items-center shadow-lg z-30">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="bg-white/20 p-1.5 md:p-2 rounded-lg">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-80 font-bold tracking-wider">Sisa Waktu</div>
            <div className="text-sm md:text-xl font-mono font-bold">{formatTime(timeLeft)}</div>
          </div>
        </div>
        
        <div className="text-center hidden lg:block">
          <h1 className="font-bold text-lg">{subject.name}</h1>
          <p className="text-xs opacity-80">{user.name} • {user.className}</p>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setIsNavOpen(true)}
            className="lg:hidden bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            NAVIGASI
          </button>
          
          <div className={`hidden md:block px-4 py-1 rounded-full text-xs font-bold ${violations > 0 ? 'bg-red-500' : 'bg-green-500'}`}>
            Pelanggaran: {violations}/5
          </div>
          
          <button 
            onClick={() => setIsFinishModalOpen(true)}
            className="bg-white text-indigo-700 px-4 md:px-6 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-bold hover:bg-slate-100 transition shadow-sm"
          >
            SELESAI
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <span className="bg-indigo-600 text-white w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-sm md:text-base">
                {currentIndex + 1}
              </span>
              <h2 className="text-slate-500 font-bold text-xs md:text-sm uppercase tracking-widest">SOAL NOMOR {currentIndex + 1}</h2>
            </div>

            {/* Multimedia in Question */}
            {currentQuestion.image && (
              <div className="mb-6 rounded-xl overflow-hidden border shadow-sm max-w-full inline-block">
                <img src={currentQuestion.image} alt="Soal" className="max-h-64 object-contain" />
              </div>
            )}
            {currentQuestion.audio && (
              <div className="mb-6 bg-slate-50 p-4 rounded-xl border">
                <audio controls className="w-full">
                  <source src={currentQuestion.audio} />
                  Browser tidak mendukung audio.
                </audio>
              </div>
            )}

            <div className="text-lg md:text-xl text-slate-800 leading-relaxed mb-8 whitespace-pre-wrap font-medium">
              {currentQuestion.text}
            </div>

            <div className="space-y-3 md:space-y-4">
              {(['A', 'B', 'C', 'D', 'E'] as const).map((key) => {
                const opt = currentQuestion.options[key];
                const isSelected = answers[currentQuestion.id] === key;
                return (
                  <div 
                    key={key}
                    onClick={() => handleSelectAnswer(key)}
                    className={`flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-xl border-2 transition-all cursor-pointer group ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50 shadow-sm' 
                        : 'border-slate-100 hover:border-slate-300 bg-slate-50'
                    }`}
                  >
                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 border transition text-sm md:text-base ${
                      isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'
                    }`}>
                      {key}
                    </div>
                    <div className="flex-1">
                      <div className={`text-base md:text-lg transition ${isSelected ? 'text-indigo-900 font-bold' : 'text-slate-700'}`}>
                        {opt.text}
                      </div>
                      {opt.image && (
                        <div className="mt-3 rounded-lg overflow-hidden border shadow-xs inline-block">
                          <img src={opt.image} alt={`Opsi ${key}`} className="max-h-40" />
                        </div>
                      )}
                      {opt.audio && (
                        <div className="mt-2">
                           <audio controls className="h-8 w-48"><source src={opt.audio} /></audio>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 flex justify-between gap-4 pb-12">
              <button 
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(c => c - 1)}
                className="flex-1 md:flex-none px-4 md:px-8 py-3 md:py-4 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 disabled:opacity-30 transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                <span className="hidden md:inline">SEBELUMNYA</span>
              </button>
              
              {!isLastQuestion ? (
                <button 
                  onClick={() => setCurrentIndex(c => c + 1)}
                  className="flex-1 md:flex-none px-4 md:px-8 py-3 md:py-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shadow-md flex items-center justify-center gap-2"
                >
                  <span className="hidden md:inline">SELANJUTNYA</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
              ) : (
                <button 
                  onClick={() => setIsFinishModalOpen(true)}
                  className="flex-1 md:flex-none px-4 md:px-8 py-3 md:py-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-md flex items-center justify-center gap-2"
                >
                  <span>SELESAI UJIAN</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Backdrop for mobile nav */}
        {isNavOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => setIsNavOpen(false)}
          />
        )}

        {/* Question Panel (Desktop: Sidebar, Mobile: Toggleable Drawer) */}
        <aside className={`
          fixed lg:static inset-y-0 right-0 w-80 bg-white lg:bg-slate-50 p-6 flex flex-col z-50 shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out
          ${isNavOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          border-l border-slate-200
        `}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest">Daftar Navigasi Soal</h3>
            <button 
              onClick={() => setIsNavOpen(false)}
              className="lg:hidden p-2 text-slate-400 hover:text-red-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      if (window.innerWidth < 1024) setIsNavOpen(false);
                    }}
                    className={`w-12 h-12 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${
                      isCurrent 
                        ? 'ring-4 ring-indigo-200 bg-indigo-600 text-white shadow-lg' 
                        : isAnswered 
                        ? 'bg-emerald-500 text-white shadow-sm' 
                        : 'bg-white border-2 border-slate-200 text-slate-400 hover:border-indigo-400'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex justify-between text-[10px] font-black text-slate-400 mb-2 uppercase tracking-tighter">
              <span>Progres Pengerjaan</span>
              <span>{Math.round((answeredCount / questions.length) * 100)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-700 ease-out" 
                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-bold text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500"></div> Terjawab
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-indigo-600"></div> Aktif
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border border-slate-300 bg-white"></div> Kosong
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Mobile-only bottom violation bar */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-2 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
         <span>Pelanggaran: <span className={violations > 0 ? 'text-red-400' : 'text-emerald-400'}>{violations}/5</span></span>
         <span>SMK BANDARA SMART CBT</span>
      </div>

      {/* Cheat Warning Modal */}
      {isCheatWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-red-100">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Peringatan Keras!</h2>
            <p className="text-slate-600 mb-8 leading-relaxed">Sistem mendeteksi aktivitas yang dilarang. Pelanggaran: <span className="text-red-600 font-black text-lg">{violations}</span>/5</p>
            <button 
              onClick={() => setIsCheatWarning(false)}
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition shadow-lg active:scale-95"
            >
              SAYA MENGERTI
            </button>
          </div>
        </div>
      )}

      {/* Finish Confirmation Modal */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Akhiri Ujian?</h2>
            <p className="text-slate-500 mb-6 font-medium">
              Anda telah menjawab <span className="text-indigo-600 font-bold">{answeredCount}</span> dari <span className="font-bold">{questions.length}</span> soal. 
              {answeredCount < questions.length && <span className="block text-red-500 mt-2 text-sm font-bold">Peringatan: Ada soal yang belum terjawab!</span>}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsFinishModalOpen(false)}
                className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-200 transition"
              >
                KEMBALI
              </button>
              <button 
                onClick={handleSubmit}
                className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition shadow-lg"
              >
                YA, SELESAI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamInterface;
