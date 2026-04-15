import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUser } from '../../../../lib/auth';
import { getDb } from '../../../../lib/mongodb';

type PasswordPayload = {
  currentPassword?: string;
  newPassword?: string;
};

function databaseErrorResponse(error: unknown) {
  if (error instanceof Error && error.message.includes('Missing MONGODB_URI')) {
    return NextResponse.json(
      {
        error:
          'Database is not configured. Set MONGODB_URI (and optional MONGODB_DB_NAME) in your environment variables, then restart/redeploy the app.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: 'Database is unavailable right now. Please try again shortly.' },
    { status: 503 }
  );
}

export async function PATCH(request: NextRequest) {
  let payload: PasswordPayload;

  try {
    payload = (await request.json()) as PasswordPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const currentPassword = payload.currentPassword ?? '';
  const newPassword = payload.newPassword ?? '';

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: 'Current password and new password are required.' },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters long.' },
      { status: 400 }
    );
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: 'New password must be different from current password.' },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const user = await getAuthenticatedUser(db, request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (typeof user.passwordHash !== 'string') {
      return NextResponse.json(
        { error: 'Password update is not available for this account.' },
        { status: 409 }
      );
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }

    const nextPasswordHash = await bcrypt.hash(newPassword, 10);

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: nextPasswordHash,
          passwordUpdatedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
