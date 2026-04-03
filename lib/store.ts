// ─── TIPOS BASE ───────────────────────────────────────────────────────────────

export interface IntelItem {
  id: string;
  type: 'transcricao' | 'pesquisa' | 'alerta' | 'diagnostico' | 'analise';
  title: string;
  content: string;
  source?: string;
  createdAt: string;
  read: boolean;
}

export interface ClientDocument {
  id: string;
  filename: string;
  content: string;
  analysis?: string;
  createdAt: string;
}

export interface ResearchAgendaItem {
  id: string;
  tema: string;
  objetivo: string;
  queries: string[];
}

export interface ResearchResult {
  id: string;
  tema: string;
  sintese: string;
  fontes: string[];
  createdAt: string;
}

export interface InterviewScript {
  id: string;
  publico: string;
  duracao: string;
  blocos: { titulo: string; perguntas: string[] }[];
}

export interface TranscriptAnalysis {
  id: string;
  filename: string;
  publico: string;
  raw: string;
  keyQuotes: { citacao: string; relevancia: string }[];
  archetypes: string[];
  gaps: string[];
  alerts: string[];
  synthesis: string;
  createdAt: string;
}

export interface DeepAnalysis {
  status: 'not_started' | 'running' | 'done';
  arquetipo: string;
  tensaoCentral: string;
  territorios: { nome: string; viabilidade: string }[];
  territorioRecomendado: string;
  gapsPrincipais: string[];
  narrativaNucleo: string;
  proximosPassos: string[];
  createdAt?: string;
}

export interface Deliverable {
  id: string;
  tipo: string;
  titulo: string;
  conteudo: string;
  createdAt: string;
}

// ─── WORKFLOW ─────────────────────────────────────────────────────────────────

export type StepStatus = 'pending' | 'active' | 'done' | 'skipped';

export type StepType =
  | 'import'
  | 'documents'
  | 'web_research'
  | 'scripts'
  | 'transcripts'
  | 'deep_analysis'
  | 'chat';

export interface WorkflowStep {
  id: string;
  type: StepType;
  fase: number;
  status: StepStatus;
  approvedAt?: string;
  data?: Record<string, unknown>;
}

export const STEP_DEFINITIONS: {
  id: string;
  type: StepType;
  fase: number;
  label: string;
  narrativa: string;
}[] = [
  {
    id: 'import_site',
    type: 'import',
    fase: 1,
    label: 'Importar dados do site',
    narrativa:
      'Antes de qualquer entrevista, precisamos saber o que o cliente já revelou. Se ele passou pelo diagnóstico no site, há dados sobre percepção, intenção e contradições que antecipam o campo.',
  },
  {
    id: 'documents',
    type: 'documents',
    fase: 1,
    label: 'Documentos da empresa',
    narrativa:
      'Pitch, apresentação institucional, portfólio — qualquer material que o cliente usa para se apresentar ao mundo. A linguagem que uma empresa usa para se vender é uma fonte direta de leitura simbólica.',
  },
  {
    id: 'web_research',
    type: 'web_research',
    fase: 1,
    label: 'Pesquisa setorial',
    narrativa:
      'O sistema vai gerar uma agenda de pesquisa estruturada, executar a busca e sintetizar os achados — tensões do setor, posicionamento dos concorrentes, oportunidades de território.',
  },
  {
    id: 'scripts',
    type: 'scripts',
    fase: 1,
    label: 'Roteiros de entrevista',
    narrativa:
      'Roteiros gerados a partir de tudo que coletamos até aqui. Cada público exige uma abordagem diferente. Os roteiros são ponto de partida — o estrategista edita e aprova antes de usar.',
  },
  {
    id: 'transcripts',
    type: 'transcripts',
    fase: 1,
    label: 'Transcrições das entrevistas',
    narrativa:
      'Cada entrevista processada vira inteligência estruturada: citações-chave, arquétipos presentes, gaps entre discurso e percepção, alertas. O acúmulo alimenta a análise de Decifração.',
  },
  {
    id: 'deep_analysis',
    type: 'deep_analysis',
    fase: 2,
    label: 'Análise de Decifração',
    narrativa:
      'Com todos os dados da Escuta aprovados, o sistema cruza as informações e produz a análise estratégica completa: arquétipo real vs. aspirado, territórios disponíveis, gaps estruturais, narrativa-núcleo.',
  },
  {
    id: 'chat_decifração',
    type: 'chat',
    fase: 2,
    label: 'Co-criação — Decifração',
    narrativa:
      'Espaço de co-criação para Mapa Simbólico, Análise de Gaps e Imersão de Liderança. A IA opera com contexto completo — tudo que foi aprovado até aqui está disponível.',
  },
  {
    id: 'chat_reconstrucao',
    type: 'chat',
    fase: 3,
    label: 'Co-criação — Reconstrução',
    narrativa:
      'Co-criação da Plataforma de Marca, Código Linguístico e Narrativa de Marca. A IA tensiona, nomeia e lapida junto com o estrategista.',
  },
  {
    id: 'chat_travessia',
    type: 'chat',
    fase: 4,
    label: 'Co-criação — Travessia',
    narrativa:
      'Plano de Travessia, treinamento de time e curadoria de ativação. Com a plataforma aprovada, o trabalho passa para implementação real.',
  },
];

// ─── PROJETO ──────────────────────────────────────────────────────────────────

export interface SiteImportData {
  email?: string;
  empresa?: string;
  diagnostico?: Record<string, unknown>;
  relatorios?: unknown[];
  encontrado: boolean;
  mensagem?: string;
  erro?: string;
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
  emailContato?: string;
  workflowSteps: WorkflowStep[];
  siteImport?: SiteImportData;
  documents: ClientDocument[];
  researchAgenda: ResearchAgendaItem[];
  researchResults: ResearchResult[];
  interviewScripts: InterviewScript[];
  transcripts: TranscriptAnalysis[];
  deepAnalysis: DeepAnalysis;
  deliverables: Deliverable[];
  intel: IntelItem[];
  createdAt: string;
}

// ─── SEED ─────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'amum_projects_v2';

function buildInitialSteps(): WorkflowStep[] {
  return STEP_DEFINITIONS.map((def, i) => ({
    id: def.id,
    type: def.type,
    fase: def.fase,
    status: (i === 0 ? 'active' : 'pending') as StepStatus,
  }));
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
  emailContato: '',
  workflowSteps: buildInitialSteps(),
  documents: [],
  researchAgenda: [],
  researchResults: [],
  interviewScripts: [],
  transcripts: [],
  deepAnalysis: {
    status: 'not_started',
    arquetipo: '',
    tensaoCentral: '',
    territorios: [],
    territorioRecomendado: '',
    gapsPrincipais: [],
    narrativaNucleo: '',
    proximosPassos: [],
  },
  deliverables: [],
  intel: [
    {
      id: 'i1',
      type: 'pesquisa',
      title: 'Tensão central do mercado',
      content:
        'O mercado de Live Marketing quer ser visto como parceiro estratégico, mas ainda é contratado como fornecedor de execução. Essa é a tensão geradora que molda toda a narrativa de reposicionamento.',
      source: 'Pesquisa setorial prévia',
      createdAt: new Date().toISOString(),
      read: false,
    },
    {
      id: 'i2',
      type: 'pesquisa',
      title: 'Território disponível identificado',
      content:
        'Arquiteta de experiências de marca — posição ainda não ocupada no mercado de Live Marketing. Enquanto concorrentes disputam "criatividade" e "escala", o território de arquitetura estratégica está vago.',
      source: 'Análise competitiva',
      createdAt: new Date().toISOString(),
      read: false,
    },
    {
      id: 'i3',
      type: 'alerta',
      title: 'Janela macro — Copa 2026 e Olimpíadas 2028',
      content:
        'Experience marketing cresce +18% ao ano. Copa 2026 e Olimpíadas 2028 são janelas de oportunidade. O timing do reposicionamento é crítico — agir antes do pico do setor.',
      source: 'Contexto macroeconômico',
      createdAt: new Date().toISOString(),
      read: false,
    },
  ],
  createdAt: new Date().toISOString(),
};

// ─── FUNÇÕES DE ACESSO ────────────────────────────────────────────────────────

export function getProjects(): Project[] {
  if (typeof window === 'undefined') return [DOBRASIL_SEED];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = [DOBRASIL_SEED];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [DOBRASIL_SEED];
  }
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

export function approveStep(project: Project, stepId: string): Project {
  const steps = [...project.workflowSteps];
  const idx = steps.findIndex(s => s.id === stepId);
  if (idx >= 0) steps[idx] = { ...steps[idx], status: 'done', approvedAt: new Date().toISOString() };
  let activated = false;
  for (let i = idx + 1; i < steps.length; i++) {
    if (steps[i].status === 'pending' && !activated) {
      steps[i] = { ...steps[i], status: 'active' };
      activated = true;
    }
  }
  const updated = { ...project, workflowSteps: steps };
  saveProject(updated);
  return updated;
}

export function skipStep(project: Project, stepId: string): Project {
  const steps = [...project.workflowSteps];
  const idx = steps.findIndex(s => s.id === stepId);
  if (idx >= 0) steps[idx] = { ...steps[idx], status: 'skipped' };
  let activated = false;
  for (let i = idx + 1; i < steps.length; i++) {
    if (steps[i].status === 'pending' && !activated) {
      steps[i] = { ...steps[i], status: 'active' };
      activated = true;
    }
  }
  const updated = { ...project, workflowSteps: steps };
  saveProject(updated);
  return updated;
}

export function reopenStep(project: Project, stepId: string): Project {
  const steps = project.workflowSteps.map(s =>
    s.id === stepId ? { ...s, status: 'active' as const, approvedAt: undefined } : s
  );
  const updated = { ...project, workflowSteps: steps };
  saveProject(updated);
  return updated;
}

export function addIntel(
  projectId: string,
  item: Omit<IntelItem, 'id' | 'createdAt' | 'read'>
): void {
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

export function getProjectContext(project: Project): string {
  const parts: string[] = [];
  parts.push(`PROJETO: ${project.nome}`);
  parts.push(`SETOR: ${project.setor}`);
  parts.push(`ESCOPO: ${project.escopo}`);
  parts.push(`STATUS: ${project.status}`);

  if (project.siteImport?.encontrado) {
    parts.push(`\nDIAGNÓSTICO DO SITE (dados do cliente):\n${JSON.stringify(project.siteImport.diagnostico, null, 2)}`);
  }

  if (project.documents.length > 0) {
    parts.push(`\nDOCUMENTOS ANALISADOS (${project.documents.length}):`);
    project.documents.forEach(d => {
      if (d.analysis) parts.push(`- ${d.filename}: ${d.analysis.slice(0, 400)}`);
    });
  }

  if (project.researchResults.length > 0) {
    parts.push(`\nPESQUISA SETORIAL APROVADA:`);
    project.researchResults.forEach(r => {
      parts.push(`[${r.tema}]: ${r.sintese.slice(0, 400)}`);
    });
  }

  if (project.interviewScripts.length > 0) {
    parts.push(`\nROTEIROS APROVADOS: ${project.interviewScripts.map(s => s.publico).join(', ')}`);
  }

  if (project.transcripts.length > 0) {
    parts.push(`\nTRANSCRIÇÕES PROCESSADAS (${project.transcripts.length}):`);
    project.transcripts.forEach(t => {
      parts.push(`[${t.publico || t.filename}] Síntese: ${t.synthesis.slice(0, 300)}`);
      if (t.keyQuotes.length > 0) {
        parts.push(`  Citações: ${t.keyQuotes.slice(0, 2).map(q => `"${q.citacao}"`).join(' | ')}`);
      }
    });
  }

  if (project.deepAnalysis.status === 'done') {
    parts.push(`\nANÁLISE DE DECIFRAÇÃO APROVADA:`);
    parts.push(`Arquétipo: ${project.deepAnalysis.arquetipo}`);
    parts.push(`Tensão central: ${project.deepAnalysis.tensaoCentral}`);
    parts.push(`Território: ${project.deepAnalysis.territorioRecomendado}`);
    parts.push(`Narrativa-núcleo: ${project.deepAnalysis.narrativaNucleo}`);
  }

  if (project.intel.length > 0) {
    parts.push(`\nINTEL FEED (achados relevantes):`);
    project.intel.slice(0, 5).forEach(i => {
      parts.push(`- [${i.title}]: ${i.content.slice(0, 200)}`);
    });
  }

  return parts.join('\n');
}

export const PHASE_NAMES: Record<number, string> = {
  1: 'Escuta',
  2: 'Decifração',
  3: 'Reconstrução',
  4: 'Travessia',
  5: 'Regeneração',
};
