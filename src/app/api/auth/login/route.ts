/**
 * /api/auth/login — accepts username OR email + password
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const identifier = String(body.identifier || '').trim();
  const password = String(body.password || '');

  if (!identifier || !password) {
    return NextResponse.json(
      { ok: false, error: 'MISSING_FIELDS', message: 'مطلوب المعرّف وكلمة المرور' },
      { status: 400 }
    );
  }

  // Find by username or email
  const user = await db.user.findFirst({
    where: {
      OR: [
        { username: identifier },
        { email: identifier.toLowerCase() },
      ],
      isBanned: false,
    },
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_CREDENTIALS', message: 'بيانات الدخول غير صحيحة' },
      { status: 401 }
    );
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_CREDENTIALS', message: 'بيانات الدخول غير صحيحة' },
      { status: 401 }
    );
  }

  await createSession({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    },
  });
}
