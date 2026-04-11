import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

import { createAuthSession, normalizePhone, toPublicUser } from '../../../../lib/auth';
import { getDb } from '../../../../lib/mongodb';

type LoginPayload = {
  phone?: string;
  password?: string;
};

function databaseErrorResponse(error: unknown) {
  if (error instanceof Error && error.message.includes('Missing MONGODB_URI')) {
    return NextResponse.json(
      {
        error:
          'Database is not configured. Set MONGODB_URI in .env.local and restart the dev server.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: 'Database is unavailable right now. Please try again shortly.' },
    { status: 503 }
  );
}

export async function POST(request: NextRequest) {
  let payload: LoginPayload;

  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  let normalizedPhone = '';
  try {
    normalizedPhone = normalizePhone(payload.phone ?? '');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid phone number.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const password = payload.password ?? '';
  if (!password) {
    return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const users = db.collection('users');

    const user = await users.findOne({ phone: normalizedPhone });
    if (!user || typeof user.passwordHash !== 'string') {
      return NextResponse.json({ error: 'Invalid phone number or password.' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid phone number or password.' }, { status: 401 });
    }

    const response = NextResponse.json({ user: toPublicUser(user) });
    await createAuthSession(db, user._id, response);
    return response;
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
