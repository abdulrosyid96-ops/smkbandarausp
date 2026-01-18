
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { db } from '../db';
import { Subject, Question, User, Schedule, ExamSession } from '../types';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'monitoring' | 'subjects' | 'users' | 'settings'>('stats');
  const [subjects, setSubjects] = useState<Subject[]>(db.getSubjects());
  const [questions, setQuestions] = useState<Question[]>(db.getQuestions());
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [schedules, setSchedules] = useState<Schedule[]>(db.getSchedules());
  const [exams, setExams] = useState<ExamSession[]>(db.getExams());
  const [cloudConfig, setCloudConfig] = useState(db.getCloudConfig());
  
  // Refresh data every few seconds for monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      setExams(db.getExams());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Subject Drill-down state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'questions' | 'schedule' | 'results'>('list');

  // Modal states
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [subjectFormData, setSubjectFormData] = useState<Partial<Subject>>({ name: '', questionCount: 40 });

  // Participant Management State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', participantNumber: '', className: 'XII AKL', password: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Question Editor State
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);

  // Schedule State
  const [editingSchedule, setEditingSchedule] = useState<Partial<Schedule> | null>(null);

  const selectedSubject = useMemo(() => 
    subjects.find(s => s.id === selectedSubjectId), 
    [subjects, selectedSubjectId]
  );

  const subjectQuestions = useMemo(() => 
    questions.filter(q => q.subjectId === selectedSubjectId),
    [questions, selectedSubjectId]
  );

  const activeExams = useMemo(() => {
    return exams.filter(e => e.status === 'ongoing').map(exam => {
      const user = users.find(u => u.id === exam.studentId);
      const sub = subjects.find(s => s.id === exam.subjectId);
      const totalQ = sub?.questionCount || 0;
      const answered = Object.keys(exam.answers).length;
      return { ...exam, userName: user?.name, userClass: user?.className, subjectName: sub?.name, totalQ, answered };
    });
  }, [exams, users, subjects]);

  const subjectResults = useMemo(() => {
    if (!selectedSubjectId) return [];
    const filteredExams = exams.filter(e => e.status !== 'ongoing' && e.subjectId === selectedSubjectId);
    const questionsForSub = questions.filter(q => q.subjectId === selectedSubjectId);

    return filteredExams.map(exam => {
      const user = users.find(u => u.id === exam.studentId);
      let correct = 0;
      let wrong = 0;
      
      questionsForSub.forEach(q => {
        const studentAnswer = exam.answers[q.id];
        if (studentAnswer) {
          if (studentAnswer === q.correctAnswer) correct++;
          else wrong++;
        }
      });

      const score = questionsForSub.length > 0 ? (correct / questionsForSub.length) * 100 : 0;

      return {
        ...exam,
        userName: user?.name || 'Unknown',
        userClass: user?.className || '-',
        correct,
        wrong,
        score: Math.round(score)
      };
    });
  }, [exams, selectedSubjectId, questions, users]);

  const forceFinishExam = (exam: ExamSession, status: 'completed' | 'terminated') => {
    if (window.confirm(`Yakin ingin menghentikan sesi ujian ini secara paksa?`)) {
      const updatedExam: ExamSession = { ...exam, status, endTime: Date.now() };
      db.saveExam(updatedExam);
      setExams(db.getExams());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (field === 'q-img') setEditingQuestion(prev => ({ ...prev, image: base64String }));
        if (field === 'q-audio') setEditingQuestion(prev => ({ ...prev, audio: base64String }));
        if (field.startsWith('opt-')) {
          const [_, key, type] = field.split('-');
          setEditingQuestion(prev => {
            const next = { ...prev };
            const opts = { ...next.options };
            // @ts-ignore
            opts[key] = { ...opts[key], [type === 'img' ? 'image' : 'audio']: base64String };
            // @ts-ignore
            next.options = opts;
            return next;
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveQuestion = () => {
    if (!editingQuestion || !selectedSubjectId) return;
    const fullQuestion: Question = {
      id: editingQuestion.id || Math.random().toString(36).substr(2, 9),
      subjectId: selectedSubjectId,
      text: editingQuestion.text || '',
      options: editingQuestion.options || {
        A: { text: '' },
        B: { text: '' },
        C: { text: '' },
        D: { text: '' },
        E: { text: '' }
      },
      correctAnswer: editingQuestion.correctAnswer || 'A',
      image: editingQuestion.image,
      audio: editingQuestion.audio
    };
    db.saveQuestion(fullQuestion);
    setQuestions(db.getQuestions());
    setEditingQuestion(null);
  };

  const deleteQuestion = (id: string) => {
    if (window.confirm('Hapus soal ini?')) {
      const updated = questions.filter(q => q.id !== id);
      localStorage.setItem('cbt_questions', JSON.stringify(updated));
      setQuestions(updated);
    }
  };

  const openSubjectModal = (sub?: Subject) => {
    if (sub) {
      setSubjectFormData({ ...sub });
    } else {
      setSubjectFormData({ name: '', questionCount: 40 });
    }
    setIsSubjectModalOpen(true);
  };

  const saveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectFormData.name) return;

    let updatedSubjects: Subject[];
    if (subjectFormData.id) {
      updatedSubjects = subjects.map(s => s.id === subjectFormData.id ? (subjectFormData as Subject) : s);
    } else {
      const newSub: Subject = {
        id: Math.random().toString(36).substr(2, 9),
        name: subjectFormData.name,
        questionCount: subjectFormData.questionCount || 40
      };
      updatedSubjects = [...subjects, newSub];
    }

    db.saveSubjects(updatedSubjects);
    setSubjects(updatedSubjects);
    setIsSubjectModalOpen(false);
  };

  const deleteSubject = (id: string) => {
    if (window.confirm('Hapus mata pelajaran ini beserta SEMUA soal di dalamnya?')) {
      const updatedSubs = subjects.filter(s => s.id !== id);
      const updatedQuestions = questions.filter(q => q.subjectId !== id);
      db.saveSubjects(updatedSubs);
      localStorage.setItem('cbt_questions', JSON.stringify(updatedQuestions));
      setSubjects(updatedSubs);
      setQuestions(updatedQuestions);
    }
  };

  const saveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !editingSchedule) return;
    const newSchedule: Schedule = {
      id: editingSchedule.id || Math.random().toString(36).substr(2, 9),
      subjectId: selectedSubjectId,
      startTime: editingSchedule.startTime || '',
      endTime: editingSchedule.endTime || '',
      isActive: editingSchedule.isActive ?? true
    };
    const updated = schedules.filter(s => s.subjectId !== selectedSubjectId);
    updated.push(newSchedule);
    db.saveSchedules(updated);
    setSchedules(updated);
    setViewMode('list');
  };

  const exportToCsv = () => {
    if (!selectedSubject || subjectResults.length === 0) {
      alert('Belum ada data hasil untuk diekspor.');
      return;
    }
    
    const headers = ['Nama', 'Kelas', 'Benar', 'Salah', 'Skor', 'Pelanggaran', 'Status', 'Waktu Selesai'];
    const rows = subjectResults.map(r => [
      `"${r.userName}"`,
      `"${r.userClass}"`,
      r.correct,
      r.wrong,
      r.score,
      r.violations,
      `"${r.status}"`,
      `"${new Date(r.endTime || r.startTime).toLocaleString('id-ID')}"`
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `CBT_Result_${selectedSubject.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('File CSV berhasil diunduh.');
  };

  const handleAddUserManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.participantNumber || !newUser.className || !newUser.password) {
      alert('Harap isi semua kolom');
      return;
    }
    const userExists = users.some(u => u.participantNumber === newUser.participantNumber);
    if (userExists) {
      alert('Nomor peserta sudah terdaftar');
      return;
    }

    const createdUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      ...newUser
    };
    const updatedUsers = [...users, createdUser];
    db.saveUsers(updatedUsers);
    setUsers(updatedUsers);
    setIsAddingUser(false);
    setNewUser({ name: '', participantNumber: '', className: 'XII AKL', password: '' });
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').filter(row => row.trim() !== '');
      
      const newUsersFromCsv: User[] = [];
      rows.forEach((row, index) => {
        if (index === 0 && row.toLowerCase().includes('nama')) return; 
        const [name, pNum, className, pwd] = row.split(',').map(s => s.trim());
        if (name && pNum && className && pwd) {
          if (!users.some(u => u.participantNumber === pNum)) {
             newUsersFromCsv.push({
               id: Math.random().toString(36).substr(2, 9),
               name,
               participantNumber: pNum,
               className,
               password: pwd
             });
          }
        }
      });

      if (newUsersFromCsv.length > 0) {
        const updated = [...users, ...newUsersFromCsv];
        db.saveUsers(updated);
        setUsers(updated);
        alert(`${newUsersFromCsv.length} peserta berhasil diimpor!`);
      } else {
        alert('Tidak ada data baru yang valid untuk diimpor.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteUser = (id: string) => {
    if (window.confirm('Hapus peserta ini?')) {
      const updated = users.filter(u => u.id !== id);
      db.saveUsers(updated);
      setUsers(updated);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800 flex flex-col items-center">
          <img src="https://i.ibb.co.com/TB3HKXn7/lodo.png" alt="Logo" className="w-12 h-12 mb-2 object-contain" />
          <h1 className="text-sm font-black text-indigo-400 uppercase tracking-tighter">SMK BANDARA</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'stats', label: 'Dashboard', icon: 'M4 6h16M4 12h16M4 18h7' },
            { id: 'monitoring', label: 'Pantau Ujian', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z', isLive: true },
            { id: 'subjects', label: 'Mata Pelajaran', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
            { id: 'users', label: 'Peserta', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
            { id: 'settings', label: 'Cloud Sync', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); setViewMode('list'); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${activeTab === item.id ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                {item.label}
              </div>
              {item.isLive && activeExams.length > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </button>
          ))}
        </nav>
        <button 
          onClick={onLogout}
          className="m-4 p-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          LOGOUT
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Dashboard Statistik</h2>
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: 'Total Peserta', val: users.length, color: 'bg-blue-500' },
                { label: 'Mapel Aktif', val: subjects.length, color: 'bg-emerald-500' },
                { label: 'Total Soal', val: questions.length, color: 'bg-indigo-500' },
                { label: 'Ujian Selesai', val: exams.filter(e => e.status === 'completed').length, color: 'bg-orange-500' }
              ].map(card => (
                <div key={card.label} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className={`w-2 h-12 ${card.color} rounded-full float-left mr-4`}></div>
                  <div className="text-slate-500 text-sm font-medium">{card.label}</div>
                  <div className="text-3xl font-bold">{card.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-8">
             <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-xl">
                <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                   Google Sheets Online Sync
                </h2>
                <p className="opacity-80 text-sm mb-6">Hubungkan CBT ke Google Sheets secara real-time untuk sinkronisasi otomatis hasil ujian setiap kali peserta menekan tombol SELESAI.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Google Apps Script Web App URL</label>
                    <input 
                      type="text" 
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-indigo-400 font-mono text-xs"
                      value={cloudConfig.scriptUrl}
                      onChange={(e) => setCloudConfig({ scriptUrl: e.target.value })}
                    />
                  </div>
                  <button 
                    onClick={() => {
                      db.saveCloudConfig(cloudConfig);
                      alert('Konfigurasi Cloud berhasil disimpan!');
                    }}
                    className="w-full bg-white text-indigo-900 py-4 rounded-xl font-black hover:bg-indigo-50 transition shadow-lg"
                  >
                    AKTIFKAN SINKRONISASI OTOMATIS
                  </button>
                </div>
             </div>

             <div className="bg-white p-8 rounded-3xl border border-slate-200">
                <h3 className="text-lg font-bold mb-4">Panduan Pengaturan Google Sheets API:</h3>
                <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                   <p>1. Buka <strong>Google Sheets</strong> Anda, lalu klik menu <strong>Extensions &gt; Apps Script</strong>.</p>
                   <p>2. Hapus semua kode yang ada, lalu tempelkan kode berikut:</p>
                   <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-[10px] font-mono overflow-x-auto">
{`function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    data.timestamp,
    data.participantNumber,
    data.name,
    data.className,
    data.subject,
    data.score,
    data.correct,
    data.wrong,
    data.violations,
    data.status
  ]);
  return ContentService.createTextOutput("Success");
}`}
                   </pre>
                   <p>3. Klik tombol <strong>Deploy &gt; New Deployment</strong>.</p>
                   <p>4. Pilih Type: <strong>Web App</strong>. Set "Who has access" ke <strong>Anyone</strong>.</p>
                   <p>5. Klik Deploy, salin URL yang diberikan, dan tempelkan ke kolom di atas.</p>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  Pantau Ujian Real-time
                  <span className="px-2 py-1 bg-red-100 text-red-600 text-[10px] font-black rounded-md animate-pulse uppercase">Live</span>
                </h2>
                <p className="text-slate-500 text-sm mt-1">Mengawasi peserta yang sedang aktif mengerjakan soal.</p>
              </div>
              <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-bold text-slate-600">{activeExams.length} Peserta Sedang Ujian</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px]">Peserta</th>
                    <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px]">Mata Pelajaran</th>
                    <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px]">Progres</th>
                    <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px]">Pelanggaran</th>
                    <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px] text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {activeExams.map(exam => (
                    <tr key={exam.id} className="border-b hover:bg-slate-50 transition group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{exam.userName}</div>
                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">{exam.userClass}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-600">{exam.subjectName}</div>
                        <div className="text-[10px] text-slate-400">Mulai: {new Date(exam.startTime).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-6 py-4 w-64">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Jawaban: {exam.answered}/{exam.totalQ}</span>
                          <span className="text-[10px] font-black text-indigo-600">{Math.round((exam.answered / exam.totalQ) * 100)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 transition-all duration-500" 
                            style={{ width: `${(exam.answered / exam.totalQ) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${exam.violations > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          {exam.violations} / 5
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button 
                            onClick={() => forceFinishExam(exam as any, 'completed')}
                            className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-indigo-600 hover:text-white transition uppercase tracking-tighter"
                          >
                            Paksa Selesai
                          </button>
                          <button 
                            onClick={() => forceFinishExam(exam as any, 'terminated')}
                            className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-red-600 hover:text-white transition uppercase tracking-tighter"
                          >
                            Diskualifikasi
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeExams.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                        Tidak ada peserta yang sedang melaksanakan ujian saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="space-y-6">
            {viewMode === 'list' ? (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Manajemen Mata Pelajaran</h2>
                  <button onClick={() => openSubjectModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition">+ TAMBAH MAPEL</button>
                </div>

                {isSubjectModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <form onSubmit={saveSubject} className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                      <h3 className="text-xl font-bold mb-6">{subjectFormData.id ? 'Edit' : 'Tambah'} Mata Pelajaran</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-600 mb-1 text-xs uppercase tracking-widest">Nama Mata Pelajaran</label>
                          <input 
                            type="text" required className="w-full bg-white border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none" 
                            value={subjectFormData.name} 
                            onChange={e => setSubjectFormData({...subjectFormData, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-600 mb-1 text-xs uppercase tracking-widest">Target Jumlah Soal</label>
                          <input 
                            type="number" required className="w-full bg-white border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none" 
                            value={subjectFormData.questionCount} 
                            onChange={e => setSubjectFormData({...subjectFormData, questionCount: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="mt-8 flex gap-3">
                        <button type="button" onClick={() => setIsSubjectModalOpen(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">BATAL</button>
                        <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg">SIMPAN</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="bg-white rounded-xl shadow overflow-hidden border border-slate-200">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-6 py-4 font-bold text-slate-700">Mata Pelajaran</th>
                        <th className="px-6 py-4 font-bold text-slate-700">Target</th>
                        <th className="px-6 py-4 font-bold text-slate-700">Status</th>
                        <th className="px-6 py-4 font-bold text-slate-700 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map(sub => {
                        const sched = schedules.find(s => s.subjectId === sub.id);
                        const qCount = questions.filter(q => q.subjectId === sub.id).length;
                        return (
                          <tr key={sub.id} className="border-b hover:bg-slate-50 transition">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="font-bold text-slate-800">{sub.name}</div>
                                <button onClick={() => openSubjectModal(sub)} className="text-slate-300 hover:text-indigo-500 transition">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                              </div>
                              <div className="text-xs text-slate-400 font-bold">{qCount} Soal terinput</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 font-bold">{sub.questionCount} Soal</td>
                            <td className="px-6 py-4">
                              {sched ? (
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${sched.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                  {sched.isActive ? 'AKTIF' : 'NON-AKTIF'}
                                </span>
                              ) : <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Belum diatur</span>}
                            </td>
                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                              <button 
                                onClick={() => { setSelectedSubjectId(sub.id); setViewMode('questions'); }}
                                className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition"
                              >
                                SOAL
                              </button>
                              <button 
                                onClick={() => { 
                                  setSelectedSubjectId(sub.id); 
                                  setEditingSchedule(sched || { subjectId: sub.id, isActive: true });
                                  setViewMode('schedule'); 
                                }}
                                className="bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 hover:text-white transition"
                              >
                                JADWAL
                              </button>
                              <button 
                                onClick={() => { setSelectedSubjectId(sub.id); setViewMode('results'); }}
                                className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition"
                              >
                                HASIL
                              </button>
                              <button 
                                onClick={() => deleteSubject(sub.id)}
                                className="p-1.5 text-red-300 hover:text-red-600 transition"
                                title="Hapus Mapel"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : viewMode === 'questions' ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-200 rounded-full transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  </button>
                  <h2 className="text-2xl font-bold">Kelola Soal: <span className="text-indigo-600">{selectedSubject?.name}</span></h2>
                  <div className="flex-1"></div>
                  <button 
                    onClick={() => setEditingQuestion({
                      subjectId: selectedSubjectId!,
                      options: { A: {text:''}, B: {text:''}, C: {text:''}, D: {text:''}, E: {text:''} },
                      correctAnswer: 'A'
                    })}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold"
                  >
                    + TAMBAH SOAL
                  </button>
                </div>

                {editingQuestion && (
                  <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-indigo-500">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                      <h3 className="text-xl font-black text-slate-700 uppercase tracking-tighter">
                        {editingQuestion.id ? 'Edit Soal' : 'Buat Soal Baru'}
                      </h3>
                      {editingQuestion.id && (
                        <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-400">ID: {editingQuestion.id}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <textarea 
                          placeholder="Teks Soal..."
                          className="w-full bg-white border border-slate-200 rounded-lg p-3 h-32 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                          value={editingQuestion.text}
                          onChange={(e) => setEditingQuestion({...editingQuestion, text: e.target.value})}
                        />
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-bold mb-1 uppercase tracking-widest text-slate-400">Gambar Soal</label>
                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'q-img')} className="text-xs w-full" />
                            {editingQuestion.image && (
                              <div className="mt-2 relative inline-block">
                                <img src={editingQuestion.image} className="h-16 rounded border shadow-sm" />
                                <button onClick={() => setEditingQuestion({...editingQuestion, image: undefined})} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-bold mb-1 uppercase tracking-widest text-slate-400">Audio Soal</label>
                            <input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e, 'q-audio')} className="text-xs w-full" />
                            {editingQuestion.audio && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="text-[10px] font-bold text-indigo-500">Audio Terpilih</div>
                                <button onClick={() => setEditingQuestion({...editingQuestion, audio: undefined})} className="text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {(['A', 'B', 'C', 'D', 'E'] as const).map(key => (
                          <div key={key} className="p-3 border border-slate-200 rounded-xl bg-slate-50">
                            <div className="flex gap-2">
                              <span className="font-black text-indigo-600 w-6">{key}</span>
                              <input 
                                type="text" placeholder={`Teks Pilihan ${key}`} className="flex-1 p-1.5 bg-white border border-slate-200 rounded-lg outline-none text-sm font-medium"
                                value={editingQuestion.options?.[key]?.text || ''}
                                onChange={(e) => {
                                  const opts = { ...editingQuestion.options };
                                  // @ts-ignore
                                  opts[key] = { ...opts[key], text: e.target.value };
                                  setEditingQuestion({ ...editingQuestion, options: opts as any });
                                }}
                              />
                            </div>
                            <div className="flex gap-4 mt-2 ml-8">
                               <div className="flex-1">
                                 <label className="block text-[8px] font-bold uppercase text-slate-400">Img</label>
                                 <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, `opt-${key}-img`)} className="text-[10px] w-full" />
                               </div>
                               <div className="flex-1">
                                 <label className="block text-[8px] font-bold uppercase text-slate-400">Aud</label>
                                 <input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e, `opt-${key}-audio`)} className="text-[10px] w-full" />
                               </div>
                            </div>
                          </div>
                        ))}
                        <div className="pt-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">Kunci Jawaban</label>
                          <select 
                            className="w-full bg-indigo-600 text-white border-none rounded-lg p-3 font-black outline-none cursor-pointer shadow-md"
                            value={editingQuestion.correctAnswer}
                            onChange={(e) => setEditingQuestion({...editingQuestion, correctAnswer: e.target.value as any})}
                          >
                            {['A', 'B', 'C', 'D', 'E'].map(o => <option key={o} value={o}>PILIHAN {o}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                      <button onClick={() => setEditingQuestion(null)} className="px-8 py-3 bg-slate-100 font-bold rounded-xl text-slate-500 hover:bg-slate-200 transition">BATAL</button>
                      <button onClick={saveQuestion} className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 transition">SIMPAN SOAL</button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {subjectQuestions.map((q, idx) => (
                     <div key={q.id} className="bg-white p-5 rounded-2xl border border-slate-200 relative group hover:border-indigo-400 transition shadow-sm hover:shadow-md">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-[10px] font-black text-indigo-400 tracking-widest uppercase">SOAL #{idx + 1}</div>
                          <div className="flex gap-2">
                             {(q.image || q.audio) && <span className="bg-indigo-50 text-indigo-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Media</span>}
                          </div>
                        </div>
                        <p className="line-clamp-3 text-sm text-slate-800 my-3 font-medium h-15 leading-relaxed">{q.text}</p>
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50">
                          <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase tracking-tighter">KUNCI: {q.correctAnswer}</span>
                          <div className="flex gap-3">
                            <button 
                              onClick={() => { setEditingQuestion(q); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                              className="text-indigo-600 text-[10px] font-black hover:underline uppercase tracking-tighter flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              Edit
                            </button>
                            <button 
                              onClick={() => deleteQuestion(q.id)} 
                              className="text-red-400 text-[10px] font-black hover:text-red-600 uppercase tracking-tighter flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              Hapus
                            </button>
                          </div>
                        </div>
                     </div>
                   ))}
                   {subjectQuestions.length === 0 && <div className="col-span-full py-20 text-center text-slate-300 italic border-2 border-dashed border-slate-200 rounded-2xl">Belum ada soal untuk mata pelajaran ini.</div>}
                </div>
              </div>
            ) : viewMode === 'schedule' ? (
              <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
                 <h2 className="text-2xl font-bold mb-6">Atur Jadwal: <span className="text-indigo-600">{selectedSubject?.name}</span></h2>
                 <form onSubmit={saveSchedule} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Mulai Akses</label>
                      <input 
                        type="datetime-local" 
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        value={editingSchedule?.startTime}
                        onChange={e => setEditingSchedule({...editingSchedule, startTime: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Berakhir Akses</label>
                      <input 
                        type="datetime-local" 
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        value={editingSchedule?.endTime}
                        onChange={e => setEditingSchedule({...editingSchedule, endTime: e.target.value})}
                      />
                    </div>
                    <div className="flex items-center gap-3 py-2 px-1">
                       <input 
                        type="checkbox" 
                        id="sched-active"
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        checked={editingSchedule?.isActive}
                        onChange={e => setEditingSchedule({...editingSchedule, isActive: e.target.checked})}
                       />
                       <label htmlFor="sched-active" className="text-sm font-bold text-slate-700">Aktifkan Ujian Sekarang</label>
                    </div>
                    <div className="flex gap-3 pt-4">
                       <button type="button" onClick={() => setViewMode('list')} className="flex-1 bg-slate-100 py-4 rounded-xl font-bold text-slate-600">BATAL</button>
                       <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg">SIMPAN JADWAL</button>
                    </div>
                 </form>
              </div>
            ) : (
              /* HASIL UJIAN VIEW */
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-200 rounded-full transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  </button>
                  <h2 className="text-2xl font-bold">Hasil Ujian: <span className="text-emerald-600">{selectedSubject?.name}</span></h2>
                  <div className="flex-1"></div>
                  <div className="flex gap-2">
                    <button 
                      onClick={exportToCsv}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md hover:bg-emerald-700 transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      DOWNLOAD CSV
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow overflow-hidden border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px]">Nama Peserta</th>
                        <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px]">Kelas</th>
                        <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px]">B / S</th>
                        <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px]">Skor</th>
                        <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px]">Pelanggaran</th>
                        <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px]">Status</th>
                        <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px]">Waktu Selesai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectResults.map(result => (
                        <tr key={result.id} className="border-b hover:bg-slate-50 transition">
                          <td className="px-6 py-4 font-bold text-slate-800">{result.userName}</td>
                          <td className="px-6 py-4 text-slate-600 font-bold">{result.userClass}</td>
                          <td className="px-6 py-4">
                            <span className="text-emerald-600 font-bold">{result.correct}</span>
                            <span className="text-slate-300 mx-1">/</span>
                            <span className="text-red-400 font-bold">{result.wrong}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`inline-block px-3 py-1 rounded-lg font-bold ${result.score >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {result.score}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-bold ${result.violations > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                              {result.violations}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${result.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {result.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-[10px] font-bold">
                            {new Date(result.endTime || result.startTime).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                      {subjectResults.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                             Belum ada peserta yang menyelesaikan ujian untuk mata pelajaran ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Data Peserta</h2>
              <div className="flex gap-3">
                <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleExcelUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-bold hover:bg-emerald-200 transition flex items-center gap-2 uppercase tracking-tighter">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  IMPORT CSV
                </button>
                <button onClick={() => setIsAddingUser(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 uppercase tracking-tighter shadow-md">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  TAMBAH PESERTA
                </button>
              </div>
            </div>

            {isAddingUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <form onSubmit={handleAddUserManual} className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold">Tambah Peserta Manual</h3>
                      <button type="button" onClick={() => setIsAddingUser(false)} className="text-slate-400 hover:text-red-500 font-bold text-2xl transition">&times;</button>
                   </div>
                   <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Nama Lengkap</label>
                        <input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="Budi Santoso" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Nomor Peserta</label>
                        <input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" value={newUser.participantNumber} onChange={e => setNewUser({...newUser, participantNumber: e.target.value})} placeholder="2024-001" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Kelas</label>
                        <select className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium appearance-none" value={newUser.className} onChange={e => setNewUser({...newUser, className: e.target.value})}>
                          <option value="XII AKL">XII AKL</option>
                          <option value="XII BDP">XII BDP</option>
                          <option value="XII PH">XII PH</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Password</label>
                        <input type="password" className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="********" />
                      </div>
                   </div>
                   <div className="mt-8 flex gap-3">
                      <button type="button" onClick={() => setIsAddingUser(false)} className="flex-1 bg-slate-100 py-4 rounded-xl font-bold text-slate-600">BATAL</button>
                      <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg">SIMPAN</button>
                   </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-xl shadow overflow-hidden border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px]">Nama Peserta</th>
                    <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px]">No. Peserta</th>
                    <th className="px-6 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px] text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{user.name}</div>
                        <div className="text-[10px] font-black text-indigo-500 tracking-tighter uppercase">{user.className}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-sm font-bold">{user.participantNumber}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => deleteUser(user.id)} className="text-red-500 font-black text-[10px] hover:underline uppercase tracking-widest">Hapus</button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic font-medium">Belum ada peserta terdaftar.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
