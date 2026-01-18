
import { Subject, Question, User, ExamSession, Schedule } from './types';

const STORAGE_KEYS = {
  SUBJECTS: 'cbt_subjects',
  QUESTIONS: 'cbt_questions',
  USERS: 'cbt_users',
  EXAMS: 'cbt_exams',
  SCHEDULES: 'cbt_schedules',
  CLOUD_CONFIG: 'cbt_cloud_config'
};

// Mock Subjects
const DEFAULT_SUBJECTS: Subject[] = [
  { id: '1', name: 'Bahasa Indonesia', questionCount: 40 },
  { id: '2', name: 'Matematika', questionCount: 40 },
  { id: '3', name: 'Bahasa Inggris', questionCount: 40 },
  { id: '4', name: 'English Conversation', questionCount: 100 },
  { id: '5', name: 'Fisika', questionCount: 40 },
  { id: '6', name: 'Kimia', questionCount: 40 },
  { id: '7', name: 'Biologi', questionCount: 40 },
  { id: '8', name: 'Ekonomi', questionCount: 40 },
  { id: '9', name: 'Geografi', questionCount: 40 },
  { id: '10', name: 'Sosiologi', questionCount: 40 },
  { id: '11', name: 'Sejarah', questionCount: 40 },
  { id: '12', name: 'PAI', questionCount: 40 },
  { id: '13', name: 'PKn', questionCount: 40 },
  { id: '14', name: 'Seni Budaya', questionCount: 40 },
  { id: '15', name: 'PJOK', questionCount: 40 },
  { id: '16', name: 'Informatika', questionCount: 40 },
  { id: '17', name: 'Prakarya', questionCount: 40 },
  { id: '18', name: 'Bahasa Arab', questionCount: 40 },
  { id: '19', name: 'Tahfidz', questionCount: 40 }
];

export const db = {
  // CONFIGURATION
  getCloudConfig: () => {
    const data = localStorage.getItem(STORAGE_KEYS.CLOUD_CONFIG);
    return data ? JSON.parse(data) : { scriptUrl: '' };
  },
  saveCloudConfig: (config: { scriptUrl: string }) => {
    localStorage.setItem(STORAGE_KEYS.CLOUD_CONFIG, JSON.stringify(config));
  },

  // DATA FETCHING
  getSubjects: (): Subject[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    return data ? JSON.parse(data) : DEFAULT_SUBJECTS;
  },
  saveSubjects: (subjects: Subject[]) => {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  },
  getQuestions: (): Question[] => {
    const data = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    return data ? JSON.parse(data) : [];
  },
  saveQuestion: (question: Question) => {
    const questions = db.getQuestions();
    const index = questions.findIndex(q => q.id === question.id);
    if (index >= 0) questions[index] = question;
    else questions.push(question);
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
  },
  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },
  saveUsers: (users: User[]) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },
  getExams: (): ExamSession[] => {
    const data = localStorage.getItem(STORAGE_KEYS.EXAMS);
    return data ? JSON.parse(data) : [];
  },
  saveExam: (exam: ExamSession) => {
    const exams = db.getExams();
    const index = exams.findIndex(e => e.id === exam.id);
    if (index >= 0) exams[index] = exam;
    else exams.push(exam);
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
    
    // Auto-sync to Google Sheets if configured
    const config = db.getCloudConfig();
    if (config.scriptUrl && (exam.status === 'completed' || exam.status === 'terminated')) {
      db.syncToGoogleSheets(exam);
    }
  },
  getSchedules: (): Schedule[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
    return data ? JSON.parse(data) : [];
  },
  saveSchedules: (schedules: Schedule[]) => {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  },

  // GOOGLE SHEETS SYNC LOGIC
  syncToGoogleSheets: async (exam: ExamSession) => {
    const config = db.getCloudConfig();
    if (!config.scriptUrl) return;

    const subjects = db.getSubjects();
    const questions = db.getQuestions();
    const users = db.getUsers();
    
    const user = users.find(u => u.id === exam.studentId);
    const subject = subjects.find(s => s.id === exam.subjectId);
    const subQuestions = questions.filter(q => q.subjectId === exam.subjectId);
    
    let correct = 0;
    subQuestions.forEach(q => {
      if (exam.answers[q.id] === q.correctAnswer) correct++;
    });
    
    const score = subQuestions.length > 0 ? (correct / subQuestions.length) * 100 : 0;

    const payload = {
      timestamp: new Date().toISOString(),
      participantNumber: user?.participantNumber,
      name: user?.name,
      className: user?.className,
      subject: subject?.name,
      score: Math.round(score),
      correct,
      wrong: subQuestions.length - correct,
      violations: exam.violations,
      status: exam.status
    };

    try {
      await fetch(config.scriptUrl, {
        method: 'POST',
        mode: 'no-cors', // standard for Google Apps Script Web Apps
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('Successfully synced to Google Sheets');
    } catch (error) {
      console.error('Failed to sync to Google Sheets:', error);
    }
  }
};
