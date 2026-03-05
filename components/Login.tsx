import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, Truck, Wrench, Shield } from 'lucide-react';

interface LoginProps {
  onLogin: (role: 'MOTORISTA' | 'ADMIN' | 'MANOBRISTA', email: string, password: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<'MOTORISTA' | 'ADMIN' | 'MANOBRISTA'>('MOTORISTA');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('login_email');
    const savedPassword = localStorage.getItem('login_password');
    const savedRole = localStorage.getItem('login_role');
    const savedRemember = localStorage.getItem('login_remember') === 'true';

    if (savedRemember) {
      if (savedEmail) setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);
      if (savedRole) setRole(savedRole as any);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rememberMe) {
      localStorage.setItem('login_email', email);
      localStorage.setItem('login_password', password);
      localStorage.setItem('login_role', role);
      localStorage.setItem('login_remember', 'true');
    } else {
      localStorage.removeItem('login_email');
      localStorage.removeItem('login_password');
      localStorage.removeItem('login_role');
      localStorage.removeItem('login_remember');
    }
    onLogin(role, email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[400px] overflow-hidden relative">
        {/* Top Red Border */}
        <div className="h-2 bg-[#D32F2F] w-full absolute top-0 left-0"></div>

        <div className="p-8 pt-12 flex flex-col items-center">
          {/* Logo Placeholder */}
          <div className="mb-6">
            <img src="ALC-logotipo-dark.png" alt="ALC Transportes" className="w-32 h-auto object-contain" />
          </div>

          {/* Role Selection */}
          <div className="w-full grid grid-cols-3 gap-2 mb-8">
            <button
              type="button"
              onClick={() => setRole('MOTORISTA')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-300 ${role === 'MOTORISTA'
                ? 'border-[#D32F2F] bg-[#D32F2F]/5 text-[#D32F2F] shadow-inner'
                : 'border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
            >
              <Truck className={`h-6 w-6 mb-1.5 transition-transform ${role === 'MOTORISTA' ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Motorista</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('MANOBRISTA')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-300 ${role === 'MANOBRISTA'
                ? 'border-[#D32F2F] bg-[#D32F2F]/5 text-[#D32F2F] shadow-inner'
                : 'border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
            >
              <Wrench className={`h-6 w-6 mb-1.5 transition-transform ${role === 'MANOBRISTA' ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Manobrista</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('ADMIN')}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-300 ${role === 'ADMIN'
                ? 'border-[#D32F2F] bg-[#D32F2F]/5 text-[#D32F2F] shadow-inner'
                : 'border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
            >
              <Shield className={`h-6 w-6 mb-1.5 transition-transform ${role === 'ADMIN' ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Admin</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                E-MAIL CORPORATIVO
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 group-focus-within:text-[#D32F2F] transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 bg-[#EEF2F6] border-none rounded-xl text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-[#D32F2F]/20 focus:bg-white transition-all duration-300 ease-in-out"
                  placeholder="nome.sobrenome@alcepereirafilho.com.br"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                SENHA
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#D32F2F] transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 bg-[#EEF2F6] border-none rounded-xl text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-[#D32F2F]/20 focus:bg-white transition-all duration-300 ease-in-out"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pb-2">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-5 h-5 rounded-lg border-gray-200 text-[#D32F2F] focus:ring-[#D32F2F]/20 transition-all cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-700 transition-colors">
                  Lembrar meus dados
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center py-4 px-4 bg-[#1A1A1A] hover:bg-black text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 mt-8 group"
            >
              <span className="font-bold text-lg mr-2">Acessar Sistema</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center space-y-4">
            <div className="flex items-center justify-center space-x-4 text-[10px] text-gray-300 pt-4">
              <a href="#" className="hover:text-gray-500 transition-colors">Termos de Uso</a>
              <span>•</span>
              <a href="#" className="hover:text-gray-500 transition-colors">Privacidade</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};