import React, { useState } from 'react';
import { User, Lock, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLogin: (role: 'MOTORISTA' | 'ADMIN', email: string, password: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdminMode) {
      onLogin('ADMIN', email, password);
    } else {
      onLogin('MOTORISTA', email, password);
    }
  };

  const toggleMode = () => {
    setIsAdminMode(!isAdminMode);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[400px] overflow-hidden relative">
        {/* Top Red Border */}
        <div className="h-2 bg-[#D32F2F] w-full absolute top-0 left-0"></div>

        <div className="p-8 pt-12 flex flex-col items-center">
          {/* Logo Placeholder */}
          <div className="mb-6">
            <img src="/ALC-logotipo-dark.png" alt="ALC Transportes" className="w-32 h-auto object-contain" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo(a)</h1>
          <p className="text-gray-500 text-sm mb-8">Realize o login para iniciar sua jornada</p>

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
            <button
              onClick={toggleMode}
              className="text-sm text-gray-500 hover:text-[#D32F2F] transition-colors font-medium"
            >
              {isAdminMode ? 'Acesso Motorista' : 'Acesso Administrativo'}
            </button>

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