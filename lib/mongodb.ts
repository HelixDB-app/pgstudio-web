import { MongoClient, type MongoClientOptions } from "mongodb";

// In development, MONGODB_URI_LOCAL overrides so you can use local MongoDB when Atlas is unreachable (ENOTFOUND).
// Use standard URI (no SRV) if set — avoids "querySrv ECONNREFUSED" on networks that block DNS SRV.
const uri =
    (process.env.NODE_ENV === "development" && process.env.MONGODB_URI_LOCAL) ||
    process.env.MONGODB_URI_STANDARD ||
    process.env.MONGODB_URI;

if (!uri) {
    throw new Error('Missing environment variable: "MONGODB_URI" (or "MONGODB_URI_STANDARD", or "MONGODB_URI_LOCAL" in dev)');
}

// Fail fast with clear errors; avoid long hangs on ENOTFOUND / unreachable host
const options: MongoClientOptions = {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
    // eslint-disable-next-line no-var
    var _mongoClientPromise: Promise<MongoClient> | undefined;
    // eslint-disable-next-line no-var
    var _mongoClientUri: string | undefined;
}

if (process.env.NODE_ENV === "development") {
    // Reuse the client only if the URI hasn't changed (e.g. after setting MONGODB_URI_STANDARD, restart or new client)
    if (!global._mongoClientPromise || global._mongoClientUri !== uri) {
        global._mongoClientUri = uri;
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

export default clientPromise;
