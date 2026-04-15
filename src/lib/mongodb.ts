import { Db, MongoClient } from 'mongodb';

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGODB_DB_NAME?.trim() || 'modern_agrarian';

function getMongoClientPromise(): Promise<MongoClient> {
  if (global.mongoClientPromise) {
    return global.mongoClientPromise;
  }

  const configuredUri = process.env.MONGODB_URI?.trim();
  const uri = configuredUri && configuredUri.length > 0 ? configuredUri : DEFAULT_MONGODB_URI;

  const client = new MongoClient(uri);
  global.mongoClientPromise = client.connect();
  return global.mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const connectedClient = await getMongoClientPromise();
  return connectedClient.db(dbName);
}
