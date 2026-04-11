import { ObjectId, type Filter } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUser } from '../../../lib/auth';
import { getDb } from '../../../lib/mongodb';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SERVICE_FEE = 42;
const INSURANCE_FEE = 15;

type BookingPayload = {
  equipmentId?: string;
  startDate?: string;
  endDate?: string;
};

type BookingUpdatePayload = {
  bookingId?: string;
  action?: 'approve' | 'reject';
};

type BookingStatus = 'pending' | 'confirmed' | 'rejected';

type BookingDoc = {
  _id: ObjectId;
  reservationId: string;
  userId?: ObjectId;
  renterId?: ObjectId;
  ownerId?: ObjectId | null;
  equipmentId: ObjectId;
  equipmentName: string;
  category: string;
  location: string;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  rentalDays: number;
  dailyRate: number;
  subtotal: number;
  serviceFee: number;
  insuranceFee: number;
  total: number;
  status?: BookingStatus;
  createdAt: Date;
  ownerReviewedAt?: Date | null;
  renterName?: string;
  renterPhone?: string;
};

function isBookingStatus(value: unknown): value is BookingStatus {
  return value === 'pending' || value === 'confirmed' || value === 'rejected';
}

function normalizeBookingStatus(value: unknown): BookingStatus {
  if (isBookingStatus(value)) {
    return value;
  }

  return 'confirmed';
}

function toIsoDateString(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== 'string') {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function calculateRentalDays(startDate: Date, endDate: Date): number {
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) {
    return 0;
  }

  return Math.floor(diffMs / DAY_IN_MS) + 1;
}

function createReservationId(): string {
  const randomChunk = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');

  return `AR-${Date.now()}-${randomChunk}`;
}

function toBookingResponse(booking: BookingDoc) {
  return {
    id: booking._id.toString(),
    reservationId: booking.reservationId,
    equipmentId: booking.equipmentId.toString(),
    equipmentName: booking.equipmentName,
    category: booking.category,
    location: booking.location,
    imageUrl: booking.imageUrl,
    startDate: booking.startDate,
    endDate: booking.endDate,
    rentalDays: booking.rentalDays,
    dailyRate: booking.dailyRate,
    subtotal: booking.subtotal,
    serviceFee: booking.serviceFee,
    insuranceFee: booking.insuranceFee,
    total: booking.total,
    status: normalizeBookingStatus(booking.status),
    createdAt: toIsoDateString(booking.createdAt),
    ownerReviewedAt: booking.ownerReviewedAt ? toIsoDateString(booking.ownerReviewedAt) : null,
    renterName: booking.renterName,
    renterPhone: booking.renterPhone,
  };
}

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

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const user = await getAuthenticatedUser(db, request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scope = request.nextUrl.searchParams.get('scope');
    const statusParam = request.nextUrl.searchParams.get('status');

    if (statusParam && !isBookingStatus(statusParam)) {
      return NextResponse.json(
        { error: 'Status must be one of: pending, confirmed, rejected.' },
        { status: 400 }
      );
    }

    const userId = user._id as ObjectId;
    const filters: Filter<BookingDoc> =
      scope === 'owner'
        ? { ownerId: userId }
        : {
            $or: [{ renterId: userId }, { userId }],
          };

    if (statusParam) {
      filters.status = statusParam as BookingStatus;
    }

    const bookingDocs = await db
      .collection<BookingDoc>('bookings')
      .find(filters, { sort: { createdAt: -1 } })
      .limit(50)
      .toArray();

    if (bookingDocs.length === 0) {
      return NextResponse.json({ booking: null, bookings: [] });
    }

    const bookings = bookingDocs.map(toBookingResponse);

    return NextResponse.json({ booking: bookings[0], bookings });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  let payload: BookingPayload;

  try {
    payload = (await request.json()) as BookingPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  if (!payload.equipmentId || !ObjectId.isValid(payload.equipmentId)) {
    return NextResponse.json({ error: 'A valid equipment ID is required.' }, { status: 400 });
  }

  const parsedStartDate = parseDateOnly(payload.startDate);
  const parsedEndDate = parseDateOnly(payload.endDate);

  if (!parsedStartDate || !parsedEndDate) {
    return NextResponse.json(
      { error: 'Start date and end date are required in YYYY-MM-DD format.' },
      { status: 400 }
    );
  }

  const rentalDays = calculateRentalDays(parsedStartDate, parsedEndDate);
  if (rentalDays <= 0) {
    return NextResponse.json({ error: 'End date must be on or after start date.' }, { status: 400 });
  }

  const startDate = payload.startDate as string;
  const endDate = payload.endDate as string;

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (parsedStartDate.getTime() < todayUtc.getTime()) {
    return NextResponse.json({ error: 'Start date cannot be in the past.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const user = await getAuthenticatedUser(db, request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const equipmentObjectId = new ObjectId(payload.equipmentId);
    const equipmentDoc = await db.collection('equipment').findOne({ _id: equipmentObjectId });

    if (!equipmentDoc) {
      return NextResponse.json({ error: 'Equipment not found.' }, { status: 404 });
    }

    const ownerId = equipmentDoc.ownerId instanceof ObjectId ? equipmentDoc.ownerId : null;
    if (!ownerId) {
      return NextResponse.json(
        {
          error:
            'This listing is missing owner verification and cannot accept booking requests right now.',
        },
        { status: 409 }
      );
    }

    if (ownerId.equals(user._id as ObjectId)) {
      return NextResponse.json(
        { error: 'You cannot request a booking for your own listing.' },
        { status: 400 }
      );
    }

    const dailyRate = Number(equipmentDoc.dailyRate ?? 0);
    if (!Number.isFinite(dailyRate) || dailyRate <= 0) {
      return NextResponse.json(
        { error: 'This listing cannot be booked right now.' },
        { status: 409 }
      );
    }

    const subtotal = dailyRate * rentalDays;
    const serviceFee = SERVICE_FEE;
    const insuranceFee = INSURANCE_FEE;
    const total = subtotal + serviceFee + insuranceFee;
    const createdAt = new Date();
    const reservationId = createReservationId();

    const equipmentName = String(equipmentDoc.brandModel ?? equipmentDoc.name ?? 'Equipment Listing');
    const category = String(equipmentDoc.category ?? 'General');
    const location = String(equipmentDoc.location ?? 'Location to be shared');
    const imageUrl = typeof equipmentDoc.imageUrl === 'string' ? equipmentDoc.imageUrl : null;

    const bookingDoc: Omit<BookingDoc, '_id'> = {
      reservationId,
      renterId: user._id as ObjectId,
      ownerId,
      equipmentId: equipmentObjectId,
      equipmentName,
      category,
      location,
      imageUrl,
      startDate,
      endDate,
      rentalDays,
      dailyRate,
      subtotal,
      serviceFee,
      insuranceFee,
      total,
      status: 'pending' as const,
      createdAt,
      ownerReviewedAt: null,
      renterName: String(user.fullName ?? 'Renter'),
      renterPhone: String(user.phone ?? ''),
    };

    const result = await db.collection<Omit<BookingDoc, '_id'>>('bookings').insertOne(bookingDoc);

    const insertedBooking: BookingDoc = {
      _id: result.insertedId,
      ...bookingDoc,
    };

    return NextResponse.json(
      {
        booking: toBookingResponse(insertedBooking),
      },
      { status: 201 }
    );
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  let payload: BookingUpdatePayload;

  try {
    payload = (await request.json()) as BookingUpdatePayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  if (!payload.bookingId || !ObjectId.isValid(payload.bookingId)) {
    return NextResponse.json({ error: 'A valid booking ID is required.' }, { status: 400 });
  }

  if (payload.action !== 'approve' && payload.action !== 'reject') {
    return NextResponse.json(
      { error: "Action must be either 'approve' or 'reject'." },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const user = await getAuthenticatedUser(db, request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = new ObjectId(payload.bookingId);
    const bookings = db.collection<BookingDoc>('bookings');
    const existingBooking = await bookings.findOne({ _id: bookingId });

    if (!existingBooking) {
      return NextResponse.json({ error: 'Booking request not found.' }, { status: 404 });
    }

    const ownerId = existingBooking.ownerId instanceof ObjectId ? existingBooking.ownerId : null;
    if (!ownerId || !ownerId.equals(user._id as ObjectId)) {
      return NextResponse.json(
        { error: 'Only the listing owner can approve or reject this request.' },
        { status: 403 }
      );
    }

    const currentStatus = normalizeBookingStatus(existingBooking.status);
    if (currentStatus !== 'pending') {
      return NextResponse.json(
        {
          error: 'Only pending booking requests can be updated.',
          booking: toBookingResponse(existingBooking),
        },
        { status: 409 }
      );
    }

    const nextStatus: BookingStatus = payload.action === 'approve' ? 'confirmed' : 'rejected';
    const ownerReviewedAt = new Date();

    await bookings.updateOne(
      { _id: bookingId },
      {
        $set: {
          status: nextStatus,
          ownerReviewedAt,
        },
      }
    );

    const updatedBooking: BookingDoc = {
      ...existingBooking,
      status: nextStatus,
      ownerReviewedAt,
    };

    return NextResponse.json({ booking: toBookingResponse(updatedBooking) });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
