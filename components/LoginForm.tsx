
import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../db';

interface LoginFormProps {
  onLogin: (user: User, isAdmin: boolean) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [num, setNum] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('XII AKL');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isAdminMode) {
      if (num === 'admin' && password === 't@N9er4n9') {
        onLogin({ id: 'admin', participantNumber: 'admin', name: 'Administrator', className: 'Staff' }, true);
      } else {
        setError('Username atau Password Admin salah');
      }
      return;
    }

    if (!num || !name || !className || !password) {
      setError('Harap isi semua kolom');
      return;
    }

    const users = db.getUsers();
    let user = users.find(u => u.participantNumber === num && u.password === password);
    
    if (!user) {
      user = { id: Math.random().toString(36).substr(2, 9), participantNumber: num, name, className, password };
      db.saveUsers([...users, user]);
    }

    onLogin(user, false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4 no-select">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md transition-all duration-300 border border-slate-200">
        <div className="text-center mb-6">
          <img 
            src="https://i.ibb.co.com/TB3HKXn7/lodo.png" 
            alt="Logo SMK Bandara" 
            className="w-24 h-24 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-black text-slate-800 leading-tight">
            Ujian Satuan Pendidikan<br/>
            <span className="text-indigo-600">SMK Bandara</span>
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Computer Based Test System</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
          <button 
            type="button"
            onClick={() => { setIsAdminMode(false); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${!isAdminMode ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
          >
            Siswa
          </button>
          <button 
            type="button"
            onClick={() => { setIsAdminMode(true); setNum('admin'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${isAdminMode ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
              {isAdminMode ? 'Username Admin' : 'Nomor Peserta'}
            </label>
            <input 
              type="text" 
              value={num}
              onChange={(e) => setNum(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium"
              placeholder={isAdminMode ? 'admin' : 'Nomor sesuai kartu ujian'}
            />
          </div>
          
          {!isAdminMode && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium"
                  placeholder="Nama sesuai kartu ujian"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Kelas</label>
                <select 
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium appearance-none"
                >
                  <option value="XII AKL">XII AKL</option>
                  <option value="XII BDP">XII BDP</option>
                  <option value="XII PH">XII PH</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium"
              placeholder="********"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl text-center animate-shake">
              {error}
            </div>
          )}

          <button 
            type="submit"
            className={`w-full text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${isAdminMode ? 'bg-slate-800 hover:bg-slate-900' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {isAdminMode ? 'Masuk Panel Admin' : 'Mulai Sesi Ujian'}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          &copy; 2026 SMK BANDARA • SMART CBT SYSTEM
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
