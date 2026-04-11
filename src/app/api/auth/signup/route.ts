import bcrypt from 'bcryptjs';
import { MongoServerError } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

import { createAuthSession, normalizePhone, toPublicUser } from '../../../../lib/auth';
import { getDb } from '../../../../lib/mongodb';

type SignupPayload = {
  fullName?: string;
  phone?: string;
  email?: string;
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
  let payload: SignupPayload;

  try {
    payload = (await request.json()) as SignupPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const fullName = payload.fullName?.trim();
  const password = payload.password ?? '';
  const email = payload.email?.trim().toLowerCase() || null;

  if (!fullName) {
    return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
  }

  let normalizedPhone = '';
  try {
    normalizedPhone = normalizePhone(payload.phone ?? '');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid phone number.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters long.' },
      { status: 400 }
    );
  }

  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const users = db.collection('users');

    await users.createIndex({ phone: 1 }, { unique: true });
    await users.createIndex(
      { email: 1 },
      {
        unique: true,
        partialFilterExpression: { email: { $type: 'string' } },
      }
    );

    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const result = await users.insertOne({
        fullName,
        phone: normalizedPhone,
        email,
        operationName: null,
        farmAddress: null,
        passwordHash,
        createdAt: new Date(),
      });

      const user = await users.findOne({ _id: result.insertedId });
      if (!user) {
        return NextResponse.json({ error: 'Could not create user.' }, { status: 500 });
      }

      const response = NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
      await createAuthSession(db, result.insertedId, response);
      return response;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        if (error.message.includes('phone')) {
          return NextResponse.json(
            { error: 'An account with this phone number already exists.' },
            { status: 409 }
          );
        }

        if (error.message.includes('email')) {
          return NextResponse.json(
            { error: 'An account with this email already exists.' },
            { status: 409 }
          );
        }
      }

      return NextResponse.json({ error: 'Unable to create account right now.' }, { status: 500 });
    }
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
