
import React, { useState, useEffect } from 'react';
import { AppState, User, Subject, ExamSession } from './types';
import { db } from './db';
import LoginForm from './components/LoginForm';
import SubjectSelector from './components/SubjectSelector';
import ExamInterface from './components/ExamInterface';
import AdminDashboard from './components/AdminDashboard';
import ResultPage from './components/ResultPage';

const App: React.FC = () => {
  const [view, setView] = useState<AppState>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [activeSession, setActiveSession] = useState<ExamSession | null>(null);

  const handleLogin = (user: User, isAdmin: boolean) => {
    setCurrentUser(user);
    if (isAdmin) {
      setView('admin');
    } else {
      setView('select-subject');
    }
  };

  const startExam = (subject: Subject) => {
    // Extra safeguard to ensure one attempt per subject
    const exams = db.getExams();
    const hasAlreadyTaken = exams.some(e => e.studentId === currentUser?.id && e.subjectId === subject.id);
    
    if (hasAlreadyTaken) {
      alert('Anda sudah mengikuti ujian untuk mata pelajaran ini.');
      return;
    }

    setSelectedSubject(subject);
    const session: ExamSession = {
      id: Math.random().toString(36).substr(2, 9),
      studentId: currentUser!.id,
      subjectId: subject.id,
      startTime: Date.now(),
      answers: {},
      violations: 0,
      status: 'ongoing'
    };
    setActiveSession(session);
    db.saveExam(session);
    setView('exam');
  };

  const finishExam = (session: ExamSession) => {
    const completedSession: ExamSession = {
      ...session,
      status: 'completed',
      endTime: Date.now()
    };
    db.saveExam(completedSession);
    setActiveSession(completedSession);
    setView('result');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedSubject(null);
    setActiveSession(null);
    setView('login');
  };

  return (
    <div className="min-h-screen">
      {view === 'login' && (
        <LoginForm onLogin={handleLogin} />
      )}
      {view === 'select-subject' && currentUser && (
        <SubjectSelector 
          onSelect={startExam} 
          user={currentUser} 
          onLogout={handleLogout}
        />
      )}
      {view === 'exam' && currentUser && selectedSubject && activeSession && (
        <ExamInterface 
          user={currentUser} 
          subject={selectedSubject} 
          session={activeSession}
          onFinish={finishExam}
        />
      )}
      {view === 'admin' && (
        <AdminDashboard onLogout={handleLogout} />
      )}
      {view === 'result' && activeSession && (
        <ResultPage 
          session={activeSession} 
          user={currentUser!} 
          onClose={handleLogout} 
        />
      )}
    </div>
  );
};

export default App;
