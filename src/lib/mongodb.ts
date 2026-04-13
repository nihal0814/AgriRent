import { Db, MongoClient } from 'mongodb';

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

const dbName = process.env.MONGODB_DB_NAME ?? 'modern_agrarian';

function getMongoClientPromise(): Promise<MongoClient> {
  if (global.mongoClientPromise) {
    return global.mongoClientPromise;
  }

  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error(
      'Missing MONGODB_URI. Set it in environment variables (local .env.local for dev, hosting provider settings for deployment).'
    );
  }

  const client = new MongoClient(uri);
  global.mongoClientPromise = client.connect();
  return global.mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const connectedClient = await getMongoClientPromise();
  return connectedClient.db(dbName);
}
