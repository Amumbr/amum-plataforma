import { google, drive_v3 } from 'googleapis';

// ─── CLIENT ───────────────────────────────────────────────────────────────────

export function getDriveClient(): drive_v3.Drive {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON não configurada no Vercel.');
  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
}

// ─── FOLDER MANAGEMENT ────────────────────────────────────────────────────────

// Garante que uma pasta existe dentro de um parent. Cria se não existir.
// Retorna o ID da pasta.
export async function ensureFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string
): Promise<string> {
  // Busca pasta existente
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
  const existing = await drive.files.list({ q, fields: 'files(id)', pageSize: 1 });
  if (existing.data.files?.length) return existing.data.files[0].id!;

  // Cria pasta
  const created = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
  });
  return created.data.id!;
}

// Estrutura: AMUM Projetos / {cliente} / {fase} / arquivo
export async function ensureProjectFolder(
  drive: drive_v3.Drive,
  projectName: string,
  phase: string
): Promise<string> {
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootId) throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID não configurada no Vercel.');
  const clientFolder = await ensureFolder(drive, projectName, rootId);
  const phaseFolder = await ensureFolder(drive, phase, clientFolder);
  return phaseFolder;
}

// ─── SAVE FILE ────────────────────────────────────────────────────────────────

export interface SaveResult {
  fileId: string;
  webViewLink: string;
  filename: string;
}

export async function saveMarkdownToDrive(
  drive: drive_v3.Drive,
  params: {
    projectName: string;
    phase: string;
    filename: string;
    content: string;
  }
): Promise<SaveResult> {
  const { projectName, phase, filename, content } = params;
  const folderId = await ensureProjectFolder(drive, projectName, phase);

  // Verifica se já existe um arquivo com esse nome (para atualizar em vez de criar)
  const q = `name='${filename.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed=false`;
  const existing = await drive.files.list({ q, fields: 'files(id)', pageSize: 1 });

  let fileId: string;
  if (existing.data.files?.length) {
    // Atualiza arquivo existente
    const updated = await drive.files.update({
      fileId: existing.data.files[0].id!,
      media: { mimeType: 'text/markdown', body: content },
      fields: 'id, webViewLink',
    });
    fileId = updated.data.id!;
  } else {
    // Cria novo arquivo
    const { Readable } = await import('stream');
    const created = await drive.files.create({
      requestBody: { name: filename, parents: [folderId], mimeType: 'text/markdown' },
      media: { mimeType: 'text/markdown', body: Readable.from([content]) },
      fields: 'id, webViewLink',
    });
    fileId = created.data.id!;
  }

  const file = await drive.files.get({ fileId, fields: 'webViewLink' });
  return { fileId, webViewLink: file.data.webViewLink || '', filename };
}

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────

export function formatDate(): string {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '-');
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 100);
}
