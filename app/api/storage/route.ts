import { NextResponse } from 'next/server';

/**
 * POST /api/storage
 * Persiste uma imagem DALL-E no Supabase Storage antes que a URL expire (~1h).
 *
 * Body: { dalleUrl: string; projectId: string; imageId: string }
 * Returns: { publicUrl: string }
 *
 * Requer em Vercel env vars:
 *   NEXT_PUBLIC_SUPABASE_URL — já existente
 *   SUPABASE_SERVICE_ROLE_KEY — adicionar no dashboard Supabase → Settings → API
 *
 * Setup único no Supabase Dashboard:
 *   Storage → New bucket → nome: "moodboard" → Public: true
 */

export async function POST(req: Request) {
  try {
    const { dalleUrl, projectId, imageId } = await req.json() as {
      dalleUrl: string;
      projectId: string;
      imageId: string;
    };

    if (!dalleUrl || !projectId || !imageId) {
      return NextResponse.json({ error: 'Campos obrigatórios: dalleUrl, projectId, imageId' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes nas env vars' }, { status: 500 });
    }

    // 1. Fetch the DALL-E image server-side (sem CORS)
    const imgRes = await fetch(dalleUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ error: `Falha ao buscar imagem DALL-E: ${imgRes.status}` }, { status: 502 });
    }
    const imageBuffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') || 'image/png';

    // 2. Upload to Supabase Storage
    const storagePath = `${projectId}/${imageId}.png`;
    const uploadUrl   = `${supabaseUrl}/storage/v1/object/moodboard/${storagePath}`;

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': contentType,
        'x-upsert': 'true',  // overwrite if exists
      },
      body: imageBuffer,
    });

    if (!uploadRes.ok) {
      const detail = await uploadRes.text();
      return NextResponse.json({ error: `Supabase Storage upload falhou: ${uploadRes.status}`, detail }, { status: 502 });
    }

    // 3. Build permanent public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/moodboard/${storagePath}`;
    return NextResponse.json({ publicUrl });

  } catch (err) {
    console.error('[storage]', err);
    return NextResponse.json({ error: 'Erro interno', detail: String(err) }, { status: 500 });
  }
}
