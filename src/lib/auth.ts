import { createHash, randomBytes } from 'crypto';
import { ObjectId, type Db, type Document, type WithId } from 'mongodb';
import type { NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'agrarian_session';
const SESSION_TTL_DAYS = Number(process.env.AUTH_SESSION_TTL_DAYS ?? 7);
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

type SessionDoc = {
  userId: ObjectId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
};

export function normalizePhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length !== 10) {
    throw new Error('Phone number must be exactly 10 digits.');
  }
  return digits;
}

export function toPublicUser(user: WithId<Document>) {
  return {
    id: user._id.toString(),
    fullName: String(user.fullName ?? ''),
    phone: String(user.phone ?? ''),
    email: user.email ? String(user.email) : null,
    operationName: user.operationName ? String(user.operationName) : null,
    farmAddress: user.farmAddress ? String(user.farmAddress) : null,
  };
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createAuthSession(db: Db, userId: ObjectId, response: NextResponse) {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const sessions = db.collection<SessionDoc>('sessions');
  await sessions.createIndex({ tokenHash: 1 }, { unique: true });
  await sessions.createIndex({ userId: 1, expiresAt: 1 });
  await sessions.insertOne({
    userId,
    tokenHash,
    createdAt: new Date(),
    expiresAt,
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: rawToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function getAuthenticatedUser(db: Db, request: NextRequest): Promise<WithId<Document> | null> {
  const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) {
    return null;
  }

  const sessions = db.collection<SessionDoc>('sessions');
  const session = await sessions.findOne({
    tokenHash: hashSessionToken(rawToken),
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    return null;
  }

  const users = db.collection('users');
  return users.findOne({ _id: session.userId });
}

export async function clearAuthSession(db: Db, request: NextRequest, response: NextResponse) {
  const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    const sessions = db.collection<SessionDoc>('sessions');
    await sessions.deleteOne({ tokenHash: hashSessionToken(rawToken) });
  }

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}
