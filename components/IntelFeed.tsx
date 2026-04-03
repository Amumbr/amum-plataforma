'use client';
import { IntelItem } from '@/lib/store';

interface Props {
  items: IntelItem[];
  compact?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  transcricao: 'Transcrição',
  pesquisa: 'Pesquisa',
  alerta: 'Alerta',
  diagnostico: 'Diagnóstico',
};

export default function IntelFeed({ items, compact }: Props) {
  if (items.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
        Nenhum intel registrado ainda. Faça upload de transcrições para começar.
      </div>
    );
  }

  const displayed = compact ? items.slice(0, 3) : items;

  return (
    <div>
      {displayed.map(item => (
        <div key={item.id} className={`intel-item ${item.type}`}>
          <div className="intel-type">{TYPE_LABELS[item.type] || item.type}</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '14px', marginBottom: '6px', color: 'var(--text)' }}>
            {item.title}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.6' }}>
            {item.content}
          </div>
          {item.source && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Fonte: {item.source}
            </div>
          )}
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {new Date(item.createdAt).toLocaleDateString('pt-BR')}
          </div>
        </div>
      ))}
      {compact && items.length > 3 && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
          +{items.length - 3} itens adicionais na aba Intel Feed
        </div>
      )}
    </div>
  );
}
