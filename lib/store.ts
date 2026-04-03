export interface IntelItem {
  id: string;
  type: 'transcricao' | 'pesquisa' | 'alerta' | 'diagnostico';
  title: string;
  content: string;
  source?: string;
  createdAt: string;
  read: boolean;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
}

export interface PhaseTasks {
  [phase: number]: Task[];
}

export interface Transcript {
  id: string;
  filename: string;
  raw: string;
  analysis?: string;
  createdAt: string;
}

export interface ResearchBrief {
  tensaoCentral: string;
  territorioDisponivel: string;
  concorrentes: { nome: string; arquetipo: string }[];
  contextoMacro: string;
  benchmark: string[];
}

export interface Project {
  id: string;
  nome: string;
  setor: string;
  faseAtual: number;
  investimento: string;
  escopo: string;
  status: string;
  interlocutor: string;
  intel: IntelItem[];
  tasks: PhaseTasks;
  transcripts: Transcript[];
  research: ResearchBrief;
  createdAt: string;
}

const STORAGE_KEY = 'amum_projects';

function defaultTasks(): PhaseTasks {
  return {
    1: [
      { id: 't1', text: 'Entrevistas com sócias/liderança (2 × 90 min)', done: false },
      { id: 't2', text: 'Entrevistas com gerentes de conta (5 × 45 min)', done: false },
      { id: 't3', text: 'Entrevistas com time completo (12 × 30 min)', done: false },
      { id: 't4', text: 'Entrevistas com clientes ativos (8 × 45 min)', done: false },
      { id: 't5', text: 'Pesquisa setorial e análise de concorrentes', done: false },
      { id: 't6', text: 'Mapeamento de percepção de marca', done: false },
      { id: 't7', text: 'Gate Fase 1: Validação dos achados com cliente', done: false },
    ],
    2: [
      { id: 't8', text: 'Mapa simbólico da marca atual', done: false },
      { id: 't9', text: 'Análise de gaps entre percepção e intenção', done: false },
      { id: 't10', text: 'Workshop de decifração com liderança', done: false },
      { id: 't11', text: 'Gate Fase 2: Escolha formal do território', done: false },
    ],
    3: [
      { id: 't12', text: 'Plataforma de Marca — documento completo', done: false },
      { id: 't13', text: 'Código linguístico e diretrizes de voz', done: false },
      { id: 't14', text: 'Narrativa de marca (versões longa e curta)', done: false },
      { id: 't15', text: 'Gate Fase 3: Aprovação formal da Plataforma', done: false },
    ],
    4: [
      { id: 't16', text: 'Plano de Travessia — ativação por frente', done: false },
      { id: 't17', text: 'Treinamento de time — linguagem e cultura', done: false },
      { id: 't18', text: 'Gate Fase 4: Revisão trimestral de aderência', done: false },
    ],
    5: [
      { id: 't19', text: 'Monitor semestral de marca', done: false },
      { id: 't20', text: 'Revisão anual de plataforma', done: false },
    ],
  };
}

const DOBRASIL_SEED: Project = {
  id: 'dobrasil',
  nome: 'doBrasil live mkt',
  setor: 'Live Marketing & Experiências',
  faseAtual: 1,
  investimento: 'R$ 160.000',
  escopo: 'Jornada Completa — Fases 1 a 4 (12 entregáveis)',
  status: 'Ativo — Entrevistas com sócias iniciam esta semana',
  interlocutor: 'A confirmar',
  intel: [
    {
      id: 'i1',
      type: 'pesquisa',
      title: 'Tensão central do mercado',
      content: 'O mercado de Live Marketing quer ser visto como parceiro estratégico, mas ainda é contratado como fornecedor de execução. Essa é a tensão geradora que molda toda a narrativa de reposicionamento.',
      source: 'Pesquisa setorial',
      createdAt: new Date().toISOString(),
      read: false,
    },
    {
      id: 'i2',
      type: 'pesquisa',
      title: 'Território disponível identificado',
      content: 'Arquiteta de experiências de marca — posição ainda não ocupada no mercado de Live Marketing. Enquanto concorrentes disputam "criatividade" e "escala", o território de arquitetura estratégica está vago.',
      source: 'Análise competitiva',
      createdAt: new Date().toISOString(),
      read: false,
    },
    {
      id: 'i3',
      type: 'alerta',
      title: 'Contexto macro favorável — Copa 2026 e Olimpíadas 2028',
      content: 'Janela de oportunidade excepcional: Copa 2026 e Olimpíadas 2028 movimentarão o setor de experiências. O experience marketing cresce +18% ao ano. Timing do reposicionamento é crítico — agir antes do pico.',
      source: 'Contexto macroeconômico',
      createdAt: new Date().toISOString(),
      read: false,
    },
  ],
  tasks: defaultTasks(),
  transcripts: [],
  research: {
    tensaoCentral: 'Mercado quer estratégia, cliente compra execução',
    territorioDisponivel: 'Arquiteta de experiências de marca — posição não ocupada',
    concorrentes: [
      { nome: 'Full Jazz', arquetipo: 'Criador' },
      { nome: 'Bullet Group', arquetipo: 'Cara Comum' },
      { nome: 'Floresta', arquetipo: 'Explorador' },
      { nome: 'Cubo Eventos', arquetipo: 'Mago' },
    ],
    contextoMacro: 'Copa 2026, Olimpíadas 2028 — experience marketing +18% ao ano',
    benchmark: [
      'Eventos de tecnologia com design de jornada (SXSW, Web Summit)',
      'Ativações de marca com métrica de impacto cultural',
      'Formatos de imersão que antecipam tendências setoriais',
    ],
  },
  createdAt: new Date().toISOString(),
};

export function getProjects(): Project[] {
  if (typeof window === 'undefined') return [DOBRASIL_SEED];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = [DOBRASIL_SEED];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(raw);
}

export function getProject(id: string): Project | undefined {
  return getProjects().find(p => p.id === id);
}

export function saveProject(project: Project): void {
  if (typeof window === 'undefined') return;
  const projects = getProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) projects[idx] = project;
  else projects.push(project);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function addIntel(projectId: string, item: Omit<IntelItem, 'id' | 'createdAt' | 'read'>): void {
  const project = getProject(projectId);
  if (!project) return;
  project.intel.unshift({
    ...item,
    id: `i_${Date.now()}`,
    createdAt: new Date().toISOString(),
    read: false,
  });
  saveProject(project);
}

export const PHASE_NAMES: Record<number, string> = {
  1: 'Escuta',
  2: 'Decifração',
  3: 'Reconstrução',
  4: 'Travessia',
  5: 'Regeneração',
};
