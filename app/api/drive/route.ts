import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient, saveMarkdownToDrive, formatDate, sanitizeFilename } from '@/lib/google-drive';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === 'save') return handleSave(body);
  if (action === 'check') return handleCheck();
  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}

// ─── CHECK: verifica se Drive está configurado ─────────────────────────────────
async function handleCheck() {
  const hasKey = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const hasFolder = !!process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  return NextResponse.json({ configured: hasKey && hasFolder, hasKey, hasFolder });
}

// ─── SAVE: salva um entregável no Drive ────────────────────────────────────────
async function handleSave(body: {
  action: string;
  projectName: string;
  phase: string;      // Ex: "1 - Escuta", "2 - Decifração", "Co-criação"
  type: string;       // Ex: "sintese-documental", "transcricao", "analise"
  title: string;      // Título legível
  content: string;    // Conteúdo Markdown
}) {
  const { projectName, phase, type, title, content } = body;

  if (!content?.trim()) return NextResponse.json({ error: 'Conteúdo vazio.' }, { status: 400 });

  try {
    const drive = getDriveClient();
    const date = formatDate();
    const filename = sanitizeFilename(`${type} — ${date}.md`);

    const result = await saveMarkdownToDrive(drive, {
      projectName: sanitizeFilename(projectName),
      phase,
      filename,
      content: buildMarkdown(title, content, date),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── MARKDOWN BUILDER ─────────────────────────────────────────────────────────
function buildMarkdown(title: string, content: string, date: string): string {
  return `# ${title}\n\n*Gerado pela plataforma AMUM em ${date}*\n\n---\n\n${content}\n`;
}
