import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getAuthenticatedUser, toPublicUser } from '../../../../lib/auth';
import { getDb } from '../../../../lib/mongodb';

type UpdateProfilePayload = {
  fullName?: string;
  operationName?: string | null;
  farmAddress?: string | null;
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

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const user = await getAuthenticatedUser(db, request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ user: toPublicUser(user) });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  let payload: UpdateProfilePayload;

  try {
    payload = (await request.json()) as UpdateProfilePayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const fullName = payload.fullName?.trim();
  const operationName = payload.operationName?.trim() ?? null;
  const farmAddress = payload.farmAddress?.trim() ?? null;

  if (!fullName) {
    return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const user = await getAuthenticatedUser(db, request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(user._id) },
      {
        $set: {
          fullName,
          operationName,
          farmAddress,
          updatedAt: new Date(),
        },
      }
    );

    const updatedUser = await db.collection('users').findOne({ _id: new ObjectId(user._id) });
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ user: toPublicUser(updatedUser) });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
