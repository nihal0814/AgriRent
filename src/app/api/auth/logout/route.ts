import { NextRequest, NextResponse } from 'next/server';

import { clearAuthSession, SESSION_COOKIE_NAME } from '../../../../lib/auth';
import { getDb } from '../../../../lib/mongodb';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  try {
    const db = await getDb();
    await clearAuthSession(db, request, response);
  } catch {
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

  return response;
}
