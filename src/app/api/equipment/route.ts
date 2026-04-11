import { ObjectId, type Document, type Filter } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUser } from '../../../lib/auth';
import { getDb } from '../../../lib/mongodb';

type EquipmentStatus = 'available' | 'in-use' | 'maintenance';

type EquipmentPayload = {
  name?: string;
  category?: string;
  location?: string;
  dailyRate?: number;
  brandModel?: string;
  status?: EquipmentStatus;
  imageUrl?: string | null;
  specs?: {
    horsepower?: string | null;
    fuelType?: string | null;
    transmission?: string | null;
    weight?: string | null;
  } | null;
  description?: string | null;
};

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSpecs(value: EquipmentPayload['specs']) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const normalized = {
    horsepower: normalizeOptionalText(value.horsepower),
    fuelType: normalizeOptionalText(value.fuelType),
    transmission: normalizeOptionalText(value.transmission),
    weight: normalizeOptionalText(value.weight),
  };

  if (!normalized.horsepower && !normalized.fuelType && !normalized.transmission && !normalized.weight) {
    return null;
  }

  return normalized;
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
    const scope = request.nextUrl.searchParams.get('scope');

    const filter: Filter<Document> = {};

    if (scope === 'mine') {
      const user = await getAuthenticatedUser(db, request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      filter.ownerId = user._id as ObjectId;
    }

    const docs = await db
      .collection('equipment')
      .find(
        filter,
        {
          projection: {
            name: 1,
            category: 1,
            location: 1,
            dailyRate: 1,
            brandModel: 1,
            status: 1,
            imageUrl: 1,
            description: 1,
            specs: 1,
            createdAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    const equipment = docs.map((doc: Document) => ({
      id: doc._id.toString(),
      name: doc.name ?? '',
      category: doc.category ?? '',
      location: doc.location ?? '',
      dailyRate: doc.dailyRate ?? 0,
      brandModel: doc.brandModel ?? '',
      status: doc.status ?? 'available',
      imageUrl: doc.imageUrl ?? null,
      description: doc.description ?? null,
      specs: doc.specs ?? null,
      createdAt: doc.createdAt ?? null,
    }));

    return NextResponse.json({ equipment });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  let payload: EquipmentPayload;

  try {
    payload = (await request.json()) as EquipmentPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const name = payload.name?.trim();
  const category = payload.category?.trim();
  const location = payload.location?.trim();
  const dailyRate = Number(payload.dailyRate ?? 0);

  if (!name || !category) {
    return NextResponse.json(
      { error: 'Both name and category are required.' },
      { status: 400 }
    );
  }

  if (!location) {
    return NextResponse.json(
      { error: 'Location is required.' },
      { status: 400 }
    );
  }

  if (!Number.isFinite(dailyRate) || dailyRate <= 0) {
    return NextResponse.json(
      { error: 'Daily rate must be greater than zero.' },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const user = await getAuthenticatedUser(db, request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedStatuses: EquipmentStatus[] = ['available', 'in-use', 'maintenance'];
    const status: EquipmentStatus = allowedStatuses.includes(payload.status ?? 'available')
      ? (payload.status as EquipmentStatus)
      : 'available';

    const newDoc = {
      ownerId: user._id as ObjectId,
      name,
      category,
      location,
      dailyRate,
      brandModel: normalizeOptionalText(payload.brandModel) ?? name,
      status,
      imageUrl: normalizeOptionalText(payload.imageUrl),
      specs: normalizeSpecs(payload.specs),
      description: normalizeOptionalText(payload.description),
      createdAt: new Date(),
    };

    const result = await db.collection('equipment').insertOne(newDoc);

    const { ownerId: _ownerId, ...serializableDoc } = newDoc;

    return NextResponse.json(
      {
        id: result.insertedId.toString(),
        ...serializableDoc,
      },
      { status: 201 }
    );
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const equipmentIdParam = request.nextUrl.searchParams.get('id');

  if (!equipmentIdParam || !ObjectId.isValid(equipmentIdParam)) {
    return NextResponse.json({ error: 'A valid equipment ID is required.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const user = await getAuthenticatedUser(db, request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const equipmentId = new ObjectId(equipmentIdParam);
    const equipment = await db
      .collection('equipment')
      .findOne({ _id: equipmentId }, { projection: { ownerId: 1 } });

    if (!equipment) {
      return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    }

    const ownerId = equipment.ownerId instanceof ObjectId ? equipment.ownerId : null;
    if (!ownerId || !ownerId.equals(user._id as ObjectId)) {
      return NextResponse.json(
        { error: 'Only the listing owner can delete this listing.' },
        { status: 403 }
      );
    }

    const activeBooking = await db.collection('bookings').findOne({
      equipmentId,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (activeBooking) {
      return NextResponse.json(
        {
          error:
            'This listing has active booking requests or confirmed rentals and cannot be deleted yet.',
        },
        { status: 409 }
      );
    }

    await db.collection('equipment').deleteOne({ _id: equipmentId });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
