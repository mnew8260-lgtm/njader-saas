/**
 * /api/exports/[id] — download a specific scrape export file
 * GET: returns the file content with proper Content-Type and Content-Disposition
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });

  const { id } = await params;
  const exportRec = await db.scrapeExport.findFirst({
    where: { id, userId: user.id },
  });

  if (!exportRec) {
    return NextResponse.json({ ok: false, error: 'EXPORT_NOT_FOUND' }, { status: 404 });
  }

  // Set content type based on format
  const mimeTypes: Record<string, string> = {
    txt: 'text/plain; charset=utf-8',
    csv: 'text/csv; charset=utf-8',
    json: 'application/json; charset=utf-8',
  };
  const contentType = mimeTypes[exportRec.format] || 'text/plain';

  // Build filename
  const date = new Date(exportRec.createdAt).toISOString().split('T')[0];
  const cmdSlug = exportRec.commandId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `njadder_${cmdSlug}_${date}.${exportRec.format}`;

  return new NextResponse(exportRec.content, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });

  const { id } = await params;
  await db.scrapeExport.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
