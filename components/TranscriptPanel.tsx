'use client';
import { useState, useRef } from 'react';
import { Project, Transcript, saveProject, addIntel } from '@/lib/store';

interface Props {
  project: Project;
  onUpdate: (p: Project) => void;
}

export default function TranscriptPanel({ project, onUpdate }: Props) {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selected, setSelected] = useState<Transcript | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setProcessing(file.name);
    const text = await file.text();

    const context = `Projeto: ${project.nome} | Setor: ${project.setor} | Fase: ${project.faseAtual} | Tensão central: ${project.research.tensaoCentral}`;

    try {
      const res = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, projectContext: context }),
      });
      const data = await res.json();

      const transcript: Transcript = {
        id: `tr_${Date.now()}`,
        filename: file.name,
        raw: text,
        analysis: data.analysis,
        createdAt: new Date().toISOString(),
      };

      const updated = { ...project };
      updated.transcripts = [transcript, ...project.transcripts];
      saveProject(updated);

      // Add to intel feed
      addIntel(project.id, {
        type: 'transcricao',
        title: `Análise: ${file.name.replace(/\.[^.]+$/, '')}`,
        content: data.analysis?.split('\n\n')[0]?.replace(/\*\*/g, '') || 'Ver transcrição para análise completa.',
        source: file.name,
      });

      const refreshed = { ...updated, intel: updated.intel };
      onUpdate(refreshed);
      setSelected(transcript);
    } catch {
      alert('Erro ao processar transcrição.');
    } finally {
      setProcessing(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  return (
    <div>
      {/* Drop zone */}
      {!selected && (
        <div
          className={`drop-zone ${dragging ? 'active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{ marginBottom: '24px' }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.md"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]); }}
          />
          {processing ? (
            <div>
              <span className="spinner" style={{ width: '20px', height: '20px' }} />
              <p style={{ marginTop: '12px', fontSize: '13px' }}>Processando {processing}…</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Aguarde ~60 segundos</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '24px', marginBottom: '8px' }}>↑</p>
              <p style={{ fontSize: '14px' }}>Arraste a transcrição aqui ou clique para selecionar</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Formatos aceitos: .txt, .md</p>
            </div>
          )}
        </div>
      )}

      {/* Transcript list */}
      {!selected && project.transcripts.length > 0 && (
        <div>
          <div className="section-title">Transcrições Processadas</div>
          {project.transcripts.map(tr => (
            <div
              key={tr.id}
              className="card"
              style={{ marginBottom: '8px', cursor: 'pointer' }}
              onClick={() => setSelected(tr)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px' }}>{tr.filename}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {new Date(tr.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <span className="badge badge-gold">Ver análise →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected transcript analysis */}
      {selected && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px' }}>{selected.filename}</h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {new Date(selected.createdAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>← Voltar</button>
          </div>
          <div className="card">
            <div style={{ fontSize: '13px', lineHeight: '1.8', whiteSpace: 'pre-wrap', color: 'var(--text-dim)' }}>
              {selected.analysis}
            </div>
          </div>
        </div>
      )}

      {!selected && project.transcripts.length === 0 && !processing && (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '8px' }}>
          Nenhuma transcrição processada ainda.
        </div>
      )}
    </div>
  );
}
