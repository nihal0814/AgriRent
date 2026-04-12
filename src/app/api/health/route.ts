import { NextResponse } from 'next/server';

import { getDb } from '../../../lib/mongodb';

export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });

    return NextResponse.json({
      status: 'ok',
      service: 'the-modern-agrarian',
      mongodb: 'up',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    const safeErrorMessage = process.env.NODE_ENV === 'production' ? 'Database is unavailable.' : errorMessage;

    return NextResponse.json(
      {
        status: 'degraded',
        service: 'the-modern-agrarian',
        mongodb: 'down',
        error: safeErrorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
