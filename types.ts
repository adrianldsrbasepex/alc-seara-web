export enum TipoUsuario {
  MOTORISTA = 'MOTORISTA',
  ADMIN = 'ADMIN'
}

export enum StatusRota {
  PENDENTE = 'Pendente',
  EM_ANDAMENTO = 'Em Andamento',
  PERNOITE = 'Pernoite',
  FINALIZADA = 'Finalizada',
  PROBLEMA = 'Problema'
}

export enum TipoDespesa {
  COMBUSTIVEL = 'Combustível',
  PEDAGIO = 'Pedágio',
  ALIMENTACAO = 'Alimentação',
  MANUTENCAO = 'Manutenção',
  OUTROS = 'Outros',
  PERNOITE_ADMIN = 'Pernoite (Admin)'
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  avatarUrl?: string;
}

export interface Motorista extends Usuario {
  placa: string;
  modeloVeiculo: string;
  telefone: string;
}

export interface Rota {
  id: string;
  driver_id?: string | null;
  original_driver_name?: string; // Store Excel driver name if not found in DB
  vehicle_id?: string;
  route_number?: string;
  origin: string;
  destination: string;
  date: string;
  status: StatusRota;
  cargo_type: string;
  estimated_revenue: number;
  initial_km: number;
  final_km?: number;
  unloading_photo_url?: string;
  leftover_photo_url?: string; // Can contain multiple URLs separated by comma
  description?: string;
}



export interface Despesa {
  id: string;
  rotaId: string;
  motoristaId: string;
  tipo: TipoDespesa;
  valor: number;
  date: string;
  observacoes?: string;
  img_url?: string;
}

export interface Veiculo {
  id: string;
  plate: string;
  model: string;
  daily_rate: number;
  km_rate: number;
}

export interface VehicleDailyStatus {
  id?: string;
  vehicle_id: string;
  date: string; // YYYY-MM-DD
  status: 'R' | 'C' | 'D' | 'P' | 'M' | 'O' | 'F'; // Using the single letter codes or mapped values
  // R=Em Rota, C=Completa Carga, D=Disponível, P=Pernoite, M=Manutenção/Oficina, F=Finalizada
  status_text: string;
}


// Interfaces de estatísticas
export interface EstatisticasPainel {
  rotasAtivas: number;
  rotasFinalizadas: number;
  rotasPernoite: number;
  problemas: number;
  receitaTotal: number;
  despesasTotal: number;
  lucroLiquido: number;
}

export enum StatusSolicitacao {
  AGUARDANDO = 'Aguardando',
  APROVADO = 'Aprovado',
  PAGO = 'Pago',
  RECUSADO = 'Recusado'
}

export interface SolicitacaoPagamento {
  id: string;
  motoristaId: string;
  tipo: 'Adiantamento' | 'Reembolso';
  valor: number;
  date: string;
  status: StatusSolicitacao;
  descricao: string;
}

export interface FinancialClosure {
  id: string;
  date: string; // ISO date string
  total_value: number;
  total_receivable: number;
  divergence: number;
  rows: any[]; // JSON data of the closure rows
  created_at?: string;
}