'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { createProject } from '@/lib/store';

const INVESTIMENTOS = [
  'Diagnóstico Grátis',
  'Espelho Simbólico — R$ 490',
  'Mapa de Tensão Cultural — R$ 890',
  'Plano de Travessia — R$ 1.490',
  'Pesquisa Setorial — R$ 8.000',
  'Pesquisa de Percepção — R$ 9.500',
  'Pesquisa de Linguagem — R$ 7.500',
  'Pesquisa Interna — R$ 8.500',
  'Pesquisa ESG — R$ 12.000',
  'Pesquisa Cultural — R$ 14.000',
  'Pesquisa 360° — R$ 45.000',
  'Mapa Simbólico — R$ 15.000',
  'Análise de Gaps — R$ 12.000',
  'Plataforma de Marca — R$ 28.000',
  'Código Linguístico — R$ 18.000',
  'Narrativa de Marca — R$ 16.000',
  'Plano de Travessia (Fase 4) — R$ 22.000',
  'Mentoria de Implementação — R$ 8.000/mês',
  'Monitor de Marca — R$ 6.000/trim',
  'Jornada Essencial — R$ 85.000',
  'Jornada Completa — R$ 160.000',
  'Jornada Regenerativa — R$ 210.000',
  'Outro / A definir',
];

const SETORES_SUGERIDOS = [
  'Live Marketing & Experiências',
  'Consultoria e Serviços Profissionais',
  'Tecnologia e Software',
  'Saúde e Bem-estar',
  'Educação',
  'Varejo e E-commerce',
  'Indústria e Manufatura',
  'Imobiliário',
  'Financeiro e Fintechs',
  'Alimentação e Bebidas',
  'Moda e Lifestyle',
  'Comunicação e Mídia',
  'Energia e Sustentabilidade',
  'Terceiro Setor / ONG',
  'Governo e Setor Público',
];

export default function NovoProjeto() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: '',
    setor: '',
    setorCustom: '',
    investimento: '',
    investimentoCustom: '',
    escopo: '',
    interlocutor: '',
    emailContato: '',
    status: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = 'Nome do cliente é obrigatório.';
    const setorFinal = form.setor === '__custom' ? form.setorCustom.trim() : form.setor;
    if (!setorFinal) e.setor = 'Setor é obrigatório.';
    const invFinal = form.investimento === '__custom' ? form.investimentoCustom.trim() : form.investimento;
    if (!invFinal) e.investimento = 'Investimento é obrigatório.';
    if (!form.escopo.trim()) e.escopo = 'Escopo é obrigatório.';
    if (!form.interlocutor.trim()) e.interlocutor = 'Interlocutor é obrigatório.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    const setorFinal = form.setor === '__custom' ? form.setorCustom.trim() : form.setor;
    const invFinal = form.investimento === '__custom' ? form.investimentoCustom.trim() : form.investimento;
    const project = createProject({
      nome: form.nome.trim(),
      setor: setorFinal,
      investimento: invFinal,
      escopo: form.escopo.trim(),
      interlocutor: form.interlocutor.trim(),
      emailContato: form.emailContato.trim() || undefined,
      status: form.status.trim() || 'Ativo',
    });
    router.push(`/projetos/${project.id}`);
  }

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h2>Novo projeto</h2>
            <p>Cadastro de projeto de branding estratégico</p>
          </div>
          <button
            className="btn-small"
            onClick={() => router.push('/projetos')}
            style={{ opacity: 0.7 }}
          >
            ← Voltar
          </button>
        </div>

        <div style={{ maxWidth: '680px' }}>

          {/* Nome */}
          <div className="form-group">
            <label className="form-label">
              Nome do cliente / projeto <span style={{ color: 'var(--gold)' }}>*</span>
            </label>
            <input
              className={`input${errors.nome ? ' input-error' : ''}`}
              placeholder="Ex: doBrasil Live Mkt"
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
            />
            {errors.nome && <p className="form-error">{errors.nome}</p>}
          </div>

          {/* Setor */}
          <div className="form-group">
            <label className="form-label">
              Setor <span style={{ color: 'var(--gold)' }}>*</span>
            </label>
            <select
              className={`input${errors.setor ? ' input-error' : ''}`}
              value={form.setor}
              onChange={e => set('setor', e.target.value)}
            >
              <option value="">Selecione o setor</option>
              {SETORES_SUGERIDOS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="__custom">Outro (digitar)</option>
            </select>
            {form.setor === '__custom' && (
              <input
                className="input"
                placeholder="Descreva o setor"
                value={form.setorCustom}
                onChange={e => set('setorCustom', e.target.value)}
                style={{ marginTop: '8px' }}
              />
            )}
            {errors.setor && <p className="form-error">{errors.setor}</p>}
          </div>

          {/* Investimento */}
          <div className="form-group">
            <label className="form-label">
              Investimento / escopo comercial <span style={{ color: 'var(--gold)' }}>*</span>
            </label>
            <select
              className={`input${errors.investimento ? ' input-error' : ''}`}
              value={form.investimento}
              onChange={e => set('investimento', e.target.value)}
            >
              <option value="">Selecione o investimento</option>
              {INVESTIMENTOS.map(inv => (
                <option key={inv} value={inv}>{inv}</option>
              ))}
              <option value="__custom">Outro / personalizado</option>
            </select>
            {form.investimento === '__custom' && (
              <input
                className="input"
                placeholder="Ex: R$ 35.000 — Pesquisa + Plataforma"
                value={form.investimentoCustom}
                onChange={e => set('investimentoCustom', e.target.value)}
                style={{ marginTop: '8px' }}
              />
            )}
            {errors.investimento && <p className="form-error">{errors.investimento}</p>}
          </div>

          {/* Escopo */}
          <div className="form-group">
            <label className="form-label">
              Escopo contratado <span style={{ color: 'var(--gold)' }}>*</span>
            </label>
            <textarea
              className={`textarea${errors.escopo ? ' input-error' : ''}`}
              placeholder="Ex: Fases 1 a 3 — Pesquisa de Percepção, Decifração e Plataforma de Marca (8 entregáveis)"
              rows={3}
              value={form.escopo}
              onChange={e => set('escopo', e.target.value)}
            />
            {errors.escopo && <p className="form-error">{errors.escopo}</p>}
          </div>

          {/* Interlocutor */}
          <div className="form-group">
            <label className="form-label">
              Interlocutor único do cliente <span style={{ color: 'var(--gold)' }}>*</span>
            </label>
            <input
              className={`input${errors.interlocutor ? ' input-error' : ''}`}
              placeholder="Nome e cargo — Ex: Ana Lima, Diretora de Marketing"
              value={form.interlocutor}
              onChange={e => set('interlocutor', e.target.value)}
            />
            {errors.interlocutor && <p className="form-error">{errors.interlocutor}</p>}
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Toda comunicação do projeto passa por este ponto focal.
            </p>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">
              Email de contato
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>opcional</span>
            </label>
            <input
              className="input"
              type="email"
              placeholder="contato@empresa.com.br — usado para importar diagnóstico do site AMUM"
              value={form.emailContato}
              onChange={e => set('emailContato', e.target.value)}
            />
          </div>

          {/* Status inicial */}
          <div className="form-group">
            <label className="form-label">
              Status inicial
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>opcional</span>
            </label>
            <input
              className="input"
              placeholder="Ex: Ativo — Proposta aprovada, kick-off agendado"
              value={form.status}
              onChange={e => set('status', e.target.value)}
            />
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <button
              className="btn-approve"
              onClick={handleSubmit}
              disabled={saving}
              style={{ minWidth: '180px' }}
            >
              {saving ? 'Criando...' : '+ Criar projeto'}
            </button>
            <button
              className="btn-skip"
              onClick={() => router.push('/projetos')}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>

        </div>
      </main>

      <style jsx>{`
        .form-group {
          margin-bottom: 24px;
        }
        .form-label {
          display: block;
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 8px;
          font-family: 'Helvetica Neue', sans-serif;
          letter-spacing: 0.02em;
        }
        .input-error {
          border-color: rgba(220, 80, 80, 0.5) !important;
        }
        .form-error {
          font-size: 12px;
          color: rgba(220, 80, 80, 0.9);
          margin-top: 6px;
          font-family: 'Helvetica Neue', sans-serif;
        }
        select.input {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238a7f72' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 36px;
        }
        select.input option {
          background: #1e1b16;
          color: var(--text);
        }
      `}</style>
    </div>
  );
}
