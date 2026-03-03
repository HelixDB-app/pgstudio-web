import { MongoClient } from "mongodb";

// Use standard URI (no SRV) if set — avoids "querySrv ECONNREFUSED" on networks that block DNS SRV
const uri =
    process.env.MONGODB_URI_STANDARD ||
    process.env.MONGODB_URI;

if (!uri) {
    throw new Error('Missing environment variable: "MONGODB_URI" (or "MONGODB_URI_STANDARD")');
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
    // eslint-disable-next-line no-var
    var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
    // In development, reuse the client across hot-reloads
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    client = new MongoClient(uri);
    clientPromise = client.connect();
}

export default clientPromise;
