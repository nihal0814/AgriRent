import { Db, MongoClient } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

const dbName = process.env.MONGODB_DB_NAME ?? 'modern_agrarian';

function getMongoClientPromise(): Promise<MongoClient> {
  if (global.mongoClientPromise) {
    return global.mongoClientPromise;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI. Add it to .env.local.');
  }

  const client = new MongoClient(uri);
  global.mongoClientPromise = client.connect();
  return global.mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const connectedClient = await getMongoClientPromise();
  return connectedClient.db(dbName);
}
