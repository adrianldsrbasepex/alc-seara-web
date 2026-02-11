import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { DriverPanel } from './components/DriverPanel';
import { AdminPanel } from './components/AdminPanel';
import { Motorista, Rota, Despesa, StatusRota, TipoUsuario, SolicitacaoPagamento } from './types';
import { servicoMotorista } from './services/driverService';
import { servicoRota } from './services/routeService';
import { servicoFinanceiro } from './services/financialService';
import { servicoFrota, Veiculo } from './services/fleetService';
import { Toast, ToastContainer, ToastType } from './components/Toast';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  // Estado da Aplicação
  const [visualizacaoAtual, setVisualizacaoAtual] = useState<'login' | 'driver' | 'admin'>('login');
  const [usuarioAtual, setUsuarioAtual] = useState<Motorista | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoPagamento[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Buscar Dados
  const buscarDados = async (silent = false) => {
    if (!silent) setCarregando(true);
    try {
      const [dadosMotoristas, dadosRotas, dadosDespesas, dadosVeiculos, dadosSolicitacoes] = await Promise.all([
        servicoMotorista.obterMotoristas(),
        servicoRota.obterRotas(),
        servicoFinanceiro.obterDespesas(),
        servicoFrota.obterVeiculos(),
        servicoFinanceiro.obterSolicitacoesPagamento()
      ]);
      setMotoristas(dadosMotoristas);
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
          const { count } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });
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
  const manipularLogin = async (tipo: 'MOTORISTA' | 'ADMIN', emailRaw: string, passwordRaw: string) => {
    const email = emailRaw.trim().toLowerCase();
    const password = passwordRaw.trim();
    setCarregando(true);
    try {
      // 1. Verificar se é motorista em qualquer modo de tentativa
      const motoristasDb = await servicoMotorista.obterMotoristas();
      const motorista = motoristasDb.find(m => m.email.trim().toLowerCase() === email);

      if (tipo === 'ADMIN') {
        // Bloqueio explícito: Motorista não pode entrar como ADMIN
        if (motorista) {
          addToast('Acesso negado: Motoristas não possuem permissão administrativa.', 'error');
          setCarregando(false);
          return;
        }

        // Verificação de Admin no Banco
        const { data: admin, error } = await supabase
          .from('admins')
          .select('*')
          .eq('email', email)
          .eq('password', password) // Adicionado para autenticação por senha
          .single();

        if (error || !admin) {
          addToast('Conta de administrador não encontrada ou não autorizada.', 'error');
        } else {
          // Setting explicit Admin session
          setUsuarioAtual({
            id: admin.id,
            nome: 'Administrador',
            email: admin.email,
            tipo: TipoUsuario.ADMIN
          } as any);
          setVisualizacaoAtual('admin');
          addToast('Bem-vindo ao Painel Administrativo', 'success');
        }
      } else {
        // Login Motorista
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

      const updated = await servicoRota.atualizarRota(rotaId, dadosAtualizacao);
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
      const novaRota = await servicoRota.criarRota(dadosRota);
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
    try {
      await servicoMotorista.excluirMotorista(id);
      setMotoristas(prev => prev.filter(m => m.id !== id));
      addToast('Motorista excluído com sucesso!', 'success');
    } catch (e) {
      console.error('Falha ao excluir motorista', e);
      addToast('Erro ao excluir motorista', 'error');
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
          expenses={despesas}
          veiculos={veiculos}
          solicitacoes={solicitacoes}
          onAddRoute={manipularAdicionarRota}
          onAddDriver={manipularAdicionarMotorista}
          onDeleteDriver={manipularExcluirMotorista}
          onLogout={manipularLogout}
          onRefresh={() => buscarDados(true)}
        />
      )}
    </>
  );
};

export default App;