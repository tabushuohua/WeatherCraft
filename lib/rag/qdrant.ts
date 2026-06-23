import { QdrantClient } from "@qdrant/js-client-rest";

export type QdrantPoint = {
  id: string | number;
  vector: number[];
  payload?: Record<string, any>;
};

const DEFAULT_COLLECTION = process.env.QDRANT_COLLECTION || "fashion_kb";

function getClient() {
  const url = process.env.QDRANT_URL || "http://localhost:6333";
  const apiKey = process.env.QDRANT_API_KEY;
  return new QdrantClient({ url, apiKey });
}

export async function ensureCollection(collection = DEFAULT_COLLECTION, vectorSize = 1536, distance = "Cosine") {
  const client = getClient();
  try {
    const existing = await client.getCollections();
    const exists = Array.isArray((existing as any)?.collections)
      ? (existing as any).collections.some((item: any) => item.name === collection)
      : false;

    if (!exists) {
      await client.createCollection(collection, {
        vectors: {
          size: vectorSize,
          distance,
        } as any,
      } as any);
    }
  } catch {
    // 如果已存在或其他可忽略错误，继续
  }
}

export async function upsertPoints(collection: string, points: QdrantPoint[]) {
  const client = getClient();
  // Qdrant client expects points with id, vector, payload
  const qPoints = points.map((p) => ({ id: p.id, vector: p.vector, payload: p.payload }));
  await client.upsert(collection, { points: qPoints });
}

export async function searchCollection(collection: string, vector: number[], top = 8, filter?: any) {
  const client = getClient();
  const res = await client.search(collection, { vector, limit: top, filter });
  return res;
}

export async function deletePoints(collection: string, ids: Array<string | number>) {
  const client = getClient();
  await client.delete(collection, { points: ids });
}

export default {
  ensureCollection,
  upsertPoints,
  searchCollection,
  deletePoints,
};
