import { ObjectId, type Db, type Document, type Filter, type WithId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUser } from '../../../lib/auth';
import { getDb } from '../../../lib/mongodb';

type BookingStatus = 'pending' | 'confirmed' | 'rejected';

type BookingDoc = {
  _id: ObjectId;
  reservationId?: string;
  equipmentName?: string;
  startDate?: string;
  endDate?: string;
  status?: BookingStatus;
  createdAt?: Date;
  ownerId?: ObjectId | null;
  renterId?: ObjectId;
  userId?: ObjectId;
  renterName?: string;
};

type MessageDoc = {
  _id: ObjectId;
  bookingId: ObjectId;
  senderId: ObjectId;
  recipientId: ObjectId;
  text: string;
  createdAt: Date;
};

type ViewerRole = 'owner' | 'renter';

type SendMessagePayload = {
  conversationId?: string;
  text?: string;
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

function asObjectId(value: unknown): ObjectId | null {
  if (value instanceof ObjectId) {
    return value;
  }

  if (typeof value === 'string' && ObjectId.isValid(value)) {
    return new ObjectId(value);
  }

  return null;
}

function normalizeStatus(value: unknown): BookingStatus {
  if (value === 'pending' || value === 'confirmed' || value === 'rejected') {
    return value;
  }

  return 'pending';
}

function normalizeMessageText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length > 1200) {
    return trimmed.slice(0, 1200);
  }

  return trimmed;
}

function toStatusSeedMessage(status: BookingStatus, role: ViewerRole): string {
  if (status === 'pending') {
    return role === 'owner'
      ? 'Booking request received. Review and respond when ready.'
      : 'Booking request sent. Waiting for owner approval.';
  }

  if (status === 'rejected') {
    return role === 'owner'
      ? 'You declined this booking request. Continue here if you want to share alternatives.'
      : 'This booking request was declined. You can still message for alternatives.';
  }

  return 'Booking confirmed. Use this thread to coordinate pickup and return details.';
}

function resolveBookingParticipants(booking: BookingDoc) {
  const ownerId = asObjectId(booking.ownerId);
  const renterId = asObjectId(booking.renterId) ?? asObjectId(booking.userId);

  return {
    ownerId,
    renterId,
  };
}

function resolveViewerRole(userId: ObjectId, booking: BookingDoc): ViewerRole | null {
  const { ownerId, renterId } = resolveBookingParticipants(booking);

  if (ownerId && ownerId.equals(userId)) {
    return 'owner';
  }

  if (renterId && renterId.equals(userId)) {
    return 'renter';
  }

  return null;
}

function toCompactUserName(user: WithId<Document> | null | undefined): string {
  if (!user) {
    return 'User';
  }

  const fullName = typeof user.fullName === 'string' ? user.fullName.trim() : '';
  if (fullName) {
    return fullName;
  }

  const phone = typeof user.phone === 'string' ? user.phone.trim() : '';
  if (phone) {
    return phone;
  }

  return 'User';
}

async function ensureMessageIndexes(db: Db) {
  const messages = db.collection<MessageDoc>('messages');
  await Promise.all([
    messages.createIndex({ bookingId: 1, createdAt: 1 }),
    messages.createIndex({ recipientId: 1, createdAt: -1 }),
  ]);
}

async function loadNameLookup(db: Db, bookings: BookingDoc[], currentUser: WithId<Document>) {
  const userIdMap = new Map<string, ObjectId>();

  userIdMap.set(String(currentUser._id), currentUser._id as ObjectId);

  for (const booking of bookings) {
    const { ownerId, renterId } = resolveBookingParticipants(booking);

    if (ownerId) {
      userIdMap.set(ownerId.toString(), ownerId);
    }

    if (renterId) {
      userIdMap.set(renterId.toString(), renterId);
    }
  }

  const ids = Array.from(userIdMap.values());
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const users = await db
    .collection('users')
    .find({ _id: { $in: ids } }, { projection: { fullName: 1, phone: 1 } })
    .toArray();

  const names = new Map<string, string>();

  for (const user of users) {
    names.set(user._id.toString(), toCompactUserName(user));
  }

  return names;
}

async function loadConversationSummaries(
  db: Db,
  currentUser: WithId<Document>
) {
  const userId = currentUser._id as ObjectId;
  const bookings = await db
    .collection<BookingDoc>('bookings')
    .find(
      {
        $or: [{ ownerId: userId }, { renterId: userId }, { userId }],
      } as Filter<BookingDoc>,
      {
        sort: { createdAt: -1 },
      }
    )
    .limit(100)
    .toArray();

  if (bookings.length === 0) {
    return [] as Array<{
      id: string;
      reservationId: string;
      equipmentName: string;
      startDate: string;
      endDate: string;
      createdAt: string;
      status: BookingStatus;
      viewerRole: ViewerRole;
      counterpartName: string;
      lastMessage: string;
      lastMessageAt: string;
      lastMessageIsOwn: boolean;
    }>;
  }

  await ensureMessageIndexes(db);

  const namesByUserId = await loadNameLookup(db, bookings, currentUser);

  const bookingIds = bookings.map((booking) => booking._id);

  const latestMessageRows = await db
    .collection<MessageDoc>('messages')
    .aggregate<{ _id: ObjectId; message: MessageDoc }>([
      {
        $match: {
          bookingId: { $in: bookingIds },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $group: {
          _id: '$bookingId',
          message: {
            $first: '$$ROOT',
          },
        },
      },
    ])
    .toArray();

  const latestMessageByBookingId = new Map<string, MessageDoc>();

  for (const row of latestMessageRows) {
    latestMessageByBookingId.set(row._id.toString(), row.message);
  }

  return bookings.flatMap((booking) => {
    const viewerRole = resolveViewerRole(userId, booking);
    if (!viewerRole) {
      return [];
    }

    const { ownerId, renterId } = resolveBookingParticipants(booking);
    const counterpartId = viewerRole === 'owner' ? renterId : ownerId;
    const counterpartName =
      viewerRole === 'owner'
        ? (booking.renterName?.trim() ||
            (counterpartId ? namesByUserId.get(counterpartId.toString()) : null) ||
            'Renter')
        : (counterpartId ? namesByUserId.get(counterpartId.toString()) : null) || 'Owner';

    const status = normalizeStatus(booking.status);
    const latestMessage = latestMessageByBookingId.get(booking._id.toString());
    const lastMessageIsOwn = latestMessage ? latestMessage.senderId.equals(userId) : false;

    return [
      {
        id: booking._id.toString(),
        reservationId: String(booking.reservationId ?? ''),
        equipmentName: String(booking.equipmentName ?? 'Equipment Listing'),
        startDate: String(booking.startDate ?? ''),
        endDate: String(booking.endDate ?? ''),
        createdAt: toIsoDateString(booking.createdAt),
        status,
        viewerRole,
        counterpartName,
        lastMessage: latestMessage ? latestMessage.text : toStatusSeedMessage(status, viewerRole),
        lastMessageAt: latestMessage
          ? toIsoDateString(latestMessage.createdAt)
          : toIsoDateString(booking.createdAt),
        lastMessageIsOwn,
      },
    ];
  });
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const user = await getAuthenticatedUser(db, request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationIdParam = request.nextUrl.searchParams.get('conversationId');

    if (!conversationIdParam) {
      const conversations = await loadConversationSummaries(db, user);
      return NextResponse.json({
        currentUser: {
          id: String(user._id),
          fullName: toCompactUserName(user),
        },
        conversations,
      });
    }

    if (!ObjectId.isValid(conversationIdParam)) {
      return NextResponse.json({ error: 'A valid conversation ID is required.' }, { status: 400 });
    }

    const userId = user._id as ObjectId;
    const bookingId = new ObjectId(conversationIdParam);

    const booking = await db.collection<BookingDoc>('bookings').findOne({
      _id: bookingId,
      $or: [{ ownerId: userId }, { renterId: userId }, { userId }],
    } as Filter<BookingDoc>);

    if (!booking) {
      return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
    }

    const viewerRole = resolveViewerRole(userId, booking);
    if (!viewerRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await ensureMessageIndexes(db);

    const namesByUserId = await loadNameLookup(db, [booking], user);
    const status = normalizeStatus(booking.status);

    const messages = await db
      .collection<MessageDoc>('messages')
      .find(
        {
          bookingId,
        },
        {
          sort: {
            createdAt: 1,
          },
        }
      )
      .limit(400)
      .toArray();

    if (messages.length === 0) {
      return NextResponse.json({
        messages: [
          {
            id: `seed-${conversationIdParam}`,
            senderId: null,
            senderName: 'System',
            text: toStatusSeedMessage(status, viewerRole),
            createdAt: toIsoDateString(booking.createdAt),
            isOwnMessage: false,
            isSystem: true,
          },
        ],
      });
    }

    const messageRows = messages.map((message) => {
      const senderId = message.senderId.toString();
      const isOwnMessage = message.senderId.equals(userId);
      const senderName = isOwnMessage
        ? toCompactUserName(user)
        : namesByUserId.get(senderId) ?? (viewerRole === 'owner' ? 'Renter' : 'Owner');

      return {
        id: message._id.toString(),
        senderId,
        senderName,
        text: message.text,
        createdAt: toIsoDateString(message.createdAt),
        isOwnMessage,
        isSystem: false,
      };
    });

    return NextResponse.json({ messages: messageRows });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  let payload: SendMessagePayload;

  try {
    payload = (await request.json()) as SendMessagePayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const conversationId = payload.conversationId;
  if (!conversationId || !ObjectId.isValid(conversationId)) {
    return NextResponse.json({ error: 'A valid conversation ID is required.' }, { status: 400 });
  }

  const text = normalizeMessageText(payload.text);
  if (!text) {
    return NextResponse.json({ error: 'Message text cannot be empty.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const user = await getAuthenticatedUser(db, request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user._id as ObjectId;
    const bookingId = new ObjectId(conversationId);

    const booking = await db.collection<BookingDoc>('bookings').findOne({
      _id: bookingId,
      $or: [{ ownerId: userId }, { renterId: userId }, { userId }],
    } as Filter<BookingDoc>);

    if (!booking) {
      return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
    }

    const viewerRole = resolveViewerRole(userId, booking);
    if (!viewerRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ownerId, renterId } = resolveBookingParticipants(booking);

    const recipientId = viewerRole === 'owner' ? renterId : ownerId;
    if (!recipientId) {
      return NextResponse.json(
        { error: 'This booking is missing participant details and cannot receive messages yet.' },
        { status: 409 }
      );
    }

    await ensureMessageIndexes(db);

    const createdAt = new Date();
    const messageToInsert: Omit<MessageDoc, '_id'> = {
      bookingId,
      senderId: userId,
      recipientId,
      text,
      createdAt,
    };

    const result = await db.collection<Omit<MessageDoc, '_id'>>('messages').insertOne(messageToInsert);

    return NextResponse.json(
      {
        message: {
          id: result.insertedId.toString(),
          senderId: userId.toString(),
          senderName: toCompactUserName(user),
          text,
          createdAt: createdAt.toISOString(),
          isOwnMessage: true,
          isSystem: false,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
