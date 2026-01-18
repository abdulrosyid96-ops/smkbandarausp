
export type UserRole = 'student' | 'admin';

export interface User {
  id: string;
  participantNumber: string;
  name: string;
  className: string;
  password?: string;
}

export interface MediaData {
  image?: string; // base64
  audio?: string; // base64
}

export interface QuestionOption extends MediaData {
  text: string;
}

export interface Question extends MediaData {
  id: string;
  subjectId: string;
  text: string;
  options: {
    A: QuestionOption;
    B: QuestionOption;
    C: QuestionOption;
    D: QuestionOption;
    E: QuestionOption;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface Subject {
  id: string;
  name: string;
  questionCount: number;
}

export interface ExamSession {
  id: string;
  studentId: string;
  subjectId: string;
  startTime: number;
  endTime?: number;
  answers: Record<string, string>; // questionId -> answer
  violations: number;
  status: 'ongoing' | 'completed' | 'terminated';
}

export interface Schedule {
  id: string;
  subjectId: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export type AppState = 'login' | 'select-subject' | 'exam' | 'admin' | 'result';
