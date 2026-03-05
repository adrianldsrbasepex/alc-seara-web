import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { DriverPanel } from './components/DriverPanel';
import { AdminPanel } from './components/AdminPanel';
import { ShunterPanel } from './components/ShunterPanel';
import { Motorista, Rota, Despesa, StatusRota, TipoUsuario, SolicitacaoPagamento, Usuario, Veiculo } from './types';
import { servicoMotorista } from './services/driverService';
import { servicoRotas } from './services/routeService';
import { servicoFinanceiro } from './services/financialService';
import { servicoFrota } from './services/fleetService';
import { servicoManobrista } from './services/shunterService';
import { Toast, ToastContainer, ToastType } from './components/Toast';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  // Estado da Aplicação
  const [visualizacaoAtual, setVisualizacaoAtual] = useState<'login' | 'driver' | 'admin' | 'shunter'>('login');
  const [usuarioAtual, setUsuarioAtual] = useState<Usuario | Motorista | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [manobristas, setManobristas] = useState<Usuario[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoPagamento[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Buscar Dados
  const buscarDados = async (silent = false) => {
    if (!silent) setCarregando(true);
    try {
      const [dadosMotoristas, dadosManobristas, dadosRotas, dadosDespesas, dadosVeiculos, dadosSolicitacoes] = await Promise.all([
        servicoMotorista.obterMotoristas(),
        servicoManobrista.obterManobristas(),
        servicoRotas.obterRotas(),
        servicoFinanceiro.obterDespesas(),
        servicoFrota.obterVeiculos(),
        servicoFinanceiro.obterSolicitacoesPagamento()
      ]);
      setMotoristas(dadosMotoristas);
      setManobristas(dadosManobristas);
      setRotas(dadosRotas || []);
      setDespesas(dadosDespesas || []);
      setVeiculos(dadosVeiculos || []);
      setSolicitacoes(dadosSolicitacoes || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      if (!silent) setCarregando(false);
    }
  };

  useEffect(() => {
    if (visualizacaoAtual === 'admin' || visualizacaoAtual === 'driver') {
      buscarDados();

      // Configurar polling de 10 segundos
      const interval = setInterval(() => {
        buscarDados(true);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [visualizacaoAtual]);

  // Add official vehicles once if needed
  useEffect(() => {
    if (visualizacaoAtual === 'admin') {
      const initVehicles = async () => {
        try {
          // Using count estimation or fetching all IDs (more robust)
          const { count, error } = await supabase
            .from('vehicles')
            .select('*', { count: 'exact', head: true });

          if (error) throw error;

          if ((count || 0) < 12) {
            await servicoFrota.adicionarVeiculosOficiais();
            buscarDados(true);
          }
        } catch (e) {
          console.error("Vehicle check error:", e);
        }
      };
      initVehicles();
    }
  }, [visualizacaoAtual]);

  // Manipuladores
  const manipularLogin = async (tipo: 'MOTORISTA' | 'ADMIN' | 'MANOBRISTA', emailRaw: string, passwordRaw: string) => {
    const email = emailRaw.trim().toLowerCase();
    const password = passwordRaw.trim();
    setCarregando(true);
    try {
      if (tipo === 'ADMIN') {
        const motoristasDb = await servicoMotorista.obterMotoristas();
        const motorista = motoristasDb.find(m => m.email.trim().toLowerCase() === email);

        // Bloqueio explícito: Motorista não pode entrar como ADMIN
        if (motorista) {
          addToast('Acesso negado: Motoristas não possuem permissão administrativa.', 'error');
          setCarregando(false);
          return;
        }

        // Verificação de Admin no Banco (Supabase)
        const { data: admin, error } = await supabase
          .from('admins')
          .select('*')
          .eq('email', email)
          .eq('password', password) // Ideally hashing should be used, but replicating current logic
          .single();

        if (error || !admin) {
          addToast('Conta de administrador não encontrada ou não autorizada.', 'error');
        } else {
          setUsuarioAtual({
            id: admin.id,
            nome: 'Administrador',
            email: admin.email,
            tipo: TipoUsuario.ADMIN
          } as any);
          setVisualizacaoAtual('admin');
          addToast('Bem-vindo ao Painel Administrativo', 'success');
        }
      } else if (tipo === 'MANOBRISTA') {
        // Login Manobrista
        const { data: shunter, error } = await supabase
          .from('shunters')
          .select('*')
          .eq('email', email)
          .eq('password', password)
          .single();

        if (error || !shunter) {
          addToast('Credenciais de manobrista inválidas. Verifique o e-mail/senha.', 'error');
        } else {
          setUsuarioAtual({
            id: shunter.id,
            nome: shunter.name,
            email: shunter.email,
            tipo: TipoUsuario.MANOBRISTA
          });
          setVisualizacaoAtual('shunter');
          addToast(`Bem-vindo, ${shunter.name}`, 'success');
        }
      } else {
        // Login Motorista
        const motoristasDb = await servicoMotorista.obterMotoristas();
        const motorista = motoristasDb.find(m => m.email.trim().toLowerCase() === email);

        if (motorista) {
          setUsuarioAtual({ ...motorista, tipo: TipoUsuario.MOTORISTA });
          setVisualizacaoAtual('driver');
          addToast(`Bem-vindo, ${motorista.nome}`, 'success');
        } else {
          addToast('Motorista não encontrado. Verifique o e-mail ou contate o administrador.', 'error');
        }
      }
    } catch (e) {
      console.error("Erro na verificação de login:", e);
      addToast('Erro ao realizar login. Tente novamente.', 'error');
    } finally {
      setCarregando(false);
    }
  };

  // SEGURANÇA: Bloqueio de acesso cruzado em tempo de renderização
  useEffect(() => {
    if (visualizacaoAtual === 'admin' && usuarioAtual?.tipo !== TipoUsuario.ADMIN) {
      if (usuarioAtual) {
        addToast('Tentativa de acesso não autorizada ao painel admin.', 'error');
      }
      setVisualizacaoAtual('login');
      setUsuarioAtual(null);
    }
    if (visualizacaoAtual === 'driver' && usuarioAtual?.tipo !== TipoUsuario.MOTORISTA) {
      setVisualizacaoAtual('login');
      setUsuarioAtual(null);
    }
    if (visualizacaoAtual === 'shunter' && usuarioAtual?.tipo !== TipoUsuario.MANOBRISTA) {
      setVisualizacaoAtual('login');
      setUsuarioAtual(null);
    }
  }, [visualizacaoAtual, usuarioAtual]);

  const manipularLogout = () => {
    setVisualizacaoAtual('login');
    setUsuarioAtual(null);
  };

  const manipulatingAtualizarRota = async (rotaId: string, dadosAtualizacao: Partial<Rota>) => {
    try {
      // In a real app we would call a proper update endpoint
      const rotaAtual = rotas.find(r => r.id === rotaId);
      if (!rotaAtual) return;

      const updated = await servicoRotas.atualizarRota(rotaId, dadosAtualizacao);
      setRotas(prev => prev.map(r => r.id === rotaId ? updated : r));
    } catch (e) {
      console.error('Falha ao atualizar rota', e);
      addToast('Erro ao atualizar rota', 'error');
    }
  };

  // Helper func to get tomorrow's date string YYYY-MM-DD
  const getTomorrowValues = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00'); // avoid timezone issues
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  // AUTOMATION WRAPPER
  const wrappedAtualizarRota = async (rotaId: string, dadosAtualizacao: Partial<Rota>) => {
    await manipulatingAtualizarRota(rotaId, dadosAtualizacao);

    // Automate Fleet Status
    const route = rotas.find(r => r.id === rotaId);
    if (!route || !route.vehicle_id) return;

    const vehicleId = route.vehicle_id;
    // CRITICAL: Use the route's date instead of current system date
    const routeDate = route.date;

    try {
      if (dadosAtualizacao.status === StatusRota.EM_ANDAMENTO) {
        // Set 'R' (Em Rota) for the route date
        await servicoFrota.upsertStatusDiario({
          vehicle_id: vehicleId,
          date: routeDate,
          status: 'R',
          status_text: 'Em Rota (Automático)'
        });
      } else if (dadosAtualizacao.status === StatusRota.PERNOITE) {
        // Set 'P' (Pernoite) for the route date
        await servicoFrota.upsertStatusDiario({
          vehicle_id: vehicleId,
          date: routeDate,
          status: 'P',
          status_text: 'Pernoite (Automático)'
        });
        // Set 'D' (Disponível) for tomorrow relative to route date
        const tomorrow = getTomorrowValues(routeDate);
        await servicoFrota.upsertStatusDiario({
          vehicle_id: vehicleId,
          date: tomorrow,
          status: 'D',
          status_text: 'Disponível (Pós-Pernoite)'
        });
      } else if (dadosAtualizacao.status === StatusRota.FINALIZADA) {
        // Check if there's already a pernoite record for the route date
        const yearMonth = routeDate.substring(0, 7);
        const allStatuses = await servicoFrota.obterStatusDiario(yearMonth);
        const existingStatus = allStatuses.find(s => s.vehicle_id === vehicleId && s.date === routeDate);

        if (existingStatus?.status !== 'P') {
          // Set 'F' (Finalizada) for the route date
          await servicoFrota.upsertStatusDiario({
            vehicle_id: vehicleId,
            date: routeDate,
            status: 'F',
            status_text: 'Finalizada (Automático)'
          });
        }

        // Set 'D' (Disponível) for tomorrow relative to route date
        const tomorrow = getTomorrowValues(routeDate);
        await servicoFrota.upsertStatusDiario({
          vehicle_id: vehicleId,
          date: tomorrow,
          status: 'D',
          status_text: 'Disponível (Pós-Rota)'
        });
      }
    } catch (error) {
      console.error("Automation Error (Fleet Status):", error);
    }
  };

  const manipularAdicionarDespesa = async (dadosDespesa: Omit<Despesa, 'id'>) => {
    try {
      const novaDespesa = await servicoFinanceiro.criarDespesa(dadosDespesa);
      setDespesas(prev => [novaDespesa, ...prev]);
      addToast('Despesa registrada com sucesso!', 'success');
    } catch (e) {
      console.error('Falha ao adicionar despesa', e);
    }
  };

  const manipularAdicionarRota = async (dadosRota: Omit<Rota, 'id'>) => {
    try {
      const novaRota = await servicoRotas.criarRota(dadosRota);
      setRotas(prev => [novaRota, ...prev]);
    } catch (e) {
      console.error('Falha ao criar rota', e);
      addToast('Erro ao criar rota', 'error');
    }
  };

  const wrappedAdicionarRota = async (dadosRota: Omit<Rota, 'id'>) => {
    await manipularAdicionarRota(dadosRota);

    // Automate Start using Route Date
    if (dadosRota.vehicle_id && dadosRota.status === StatusRota.EM_ANDAMENTO) {
      try {
        await servicoFrota.upsertStatusDiario({
          vehicle_id: dadosRota.vehicle_id,
          date: dadosRota.date,
          status: 'R',
          status_text: 'Em Rota (Automático)'
        });
      } catch (error) {
        console.error("Automation Error (New Route):", error);
      }
    }
  };

  const manipularAdicionarMotorista = async (dadosMotorista: Omit<Motorista, 'id'>) => {
    try {
      // Criação de motorista via serviço
      const novoMotorista = await servicoMotorista.criarMotorista(dadosMotorista);
      setMotoristas(prev => [...prev, novoMotorista]);
    } catch (e) {
      console.error('Falha ao criar motorista', e);
      addToast('Erro ao criar motorista', 'error');
    }
  };

  const manipularExcluirMotorista = async (id: string) => {
    console.log('--- DIAGNÓSTICO DE EXCLUSÃO ---');
    console.log('ID do motorista:', id);
    console.log('Motoristas em estado:', motoristas.map(m => m.id));

    try {
      // 1. Check for all potential dependencies
      const temRotas = rotas.some(r => r.driver_id === id);
      const temDespesas = despesas.some(e => e.motoristaId === id);
      const temSolicitacoes = solicitacoes.some(s => s.motoristaId === id);

      console.log('Dependências encontradas:', { temRotas, temDespesas, temSolicitacoes });

      if (temRotas || temDespesas || temSolicitacoes) {
        let deps = [];
        if (temRotas) deps.push('rotas');
        if (temDespesas) deps.push('despesas');
        if (temSolicitacoes) deps.push('solicitações de pagamento');

        const msg = `Impossível excluir motorista com ${deps.join(', ')} vinculadas.`;
        console.warn(msg);
        addToast(msg, 'error');
        return;
      }

      // 2. Optimistic Update
      setMotoristas(prev => prev.filter(m => m.id !== id));

      // 3. Deletion with verification (driverService was updated to verify)
      await servicoMotorista.excluirMotorista(id);

      addToast('Motorista excluído com sucesso!', 'success');
      buscarDados(true);
    } catch (e: any) {
      console.error('Falha ao excluir motorista:', e);
      // Revert local state
      buscarDados(true);

      const errorMsg = e.message || 'Erro desconhecido ao excluir motorista.';
      addToast(errorMsg, 'error');
    }
  };

  const manipularAdicionarManobrista = async (dados: { name: string, email: string, password?: string }) => {
    try {
      await servicoManobrista.criarManobrista(dados);
      buscarDados(true);
    } catch (e) {
      console.error('Falha ao criar manobrista', e);
      addToast('Erro ao criar manobrista', 'error');
    }
  };

  const manipularExcluirManobrista = async (id: string) => {
    try {
      await servicoManobrista.deletarManobrista(id);
      setManobristas(prev => prev.filter(s => s.id !== id));
      addToast('Manobrista excluído com sucesso!', 'success');
    } catch (e) {
      console.error('Falha ao excluir manobrista', e);
      addToast('Erro ao excluir manobrista', 'error');
    }
  };

  // Lógica de Renderização
  if (carregando && visualizacaoAtual !== 'login') {
    return <div className="min-h-screen flex items-center justify-center">Carregando dados...</div>;
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {visualizacaoAtual === 'login' && (
        <Login onLogin={manipularLogin} />
      )}

      {visualizacaoAtual === 'driver' && usuarioAtual && (
        <DriverPanel
          driver={usuarioAtual}
          routes={rotas}
          expenses={despesas}
          onUpdateRoute={wrappedAtualizarRota}
          onAddExpense={manipularAdicionarDespesa}
          onAddRoute={wrappedAdicionarRota}
          onLogout={manipularLogout}
        />
      )}

      {visualizacaoAtual === 'admin' && usuarioAtual?.tipo === TipoUsuario.ADMIN && (
        <AdminPanel
          routes={rotas}
          drivers={motoristas}
          shunters={manobristas}
          expenses={despesas}
          veiculos={veiculos}
          solicitacoes={solicitacoes}
          onAddRoute={manipularAdicionarRota}
          onAddDriver={manipularAdicionarMotorista}
          onAddShunter={manipularAdicionarManobrista}
          onDeleteDriver={manipularExcluirMotorista}
          onDeleteShunter={manipularExcluirManobrista}
          onLogout={manipularLogout}
          onRefresh={buscarDados}
        />
      )}
      {visualizacaoAtual === 'shunter' && usuarioAtual?.tipo === TipoUsuario.MANOBRISTA && (
        <ShunterPanel
          shunter={usuarioAtual}
          onLogout={manipularLogout}
        />
      )}
    </>
  );
};

export default App;