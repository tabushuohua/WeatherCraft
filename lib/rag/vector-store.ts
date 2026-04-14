import { promises as fs } from "fs";
import path from "path";
import { embedText } from "./embeddings";

export type FashionChunk = {
  id: string;
  title: string;
  text: string;
  source: string;
  topic: string;
  tags: string[];
  embedding?: number[];
};

export type FashionIndexFile = {
  version: number;
  model: string;
  createdAt: string;
  chunks: FashionChunk[];
};

const ROOT_DIR = path.join(process.cwd(), "data", "fashion-kb");
const INDEX_FILE = path.join(ROOT_DIR, "index.json");

export function getFashionKbDir() {
  return ROOT_DIR;
}

export function getFashionIndexPath() {
  return INDEX_FILE;
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function loadFashionIndex(): Promise<FashionIndexFile | null> {
  try {
    const raw = await fs.readFile(INDEX_FILE, "utf8");
    return JSON.parse(raw) as FashionIndexFile;
  } catch {
    return null;
  }
}

export async function loadFashionDocuments(): Promise<FashionChunk[]> {
  const index = await loadFashionIndex();
  if (index?.chunks?.length) {
    return index.chunks;
  }

  const files = await fs.readdir(ROOT_DIR).catch(() => []);
  const markdownFiles = files.filter((file) => file.endsWith(".md"));

  const docs = await Promise.all(
    markdownFiles.map(async (file) => {
      const content = await fs.readFile(path.join(ROOT_DIR, file), "utf8");
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch?.[1]?.trim() || file;
      const body = content.replace(/^#\s+.+$/m, "").trim();

      return {
        id: file,
        title,
        text: body,
        source: file,
        topic: file.replace(/\.md$/, ""),
        tags: [],
      } satisfies FashionChunk;
    })
  );

  return docs;
}

export async function buildFashionIndex(chunks: FashionChunk[]) {
  const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  const queryTexts = chunks.map((chunk) => `${chunk.title}\n${chunk.text}`);
  const embeddings = await Promise.all(queryTexts.map((text) => embedText(text)));

  const indexedChunks: FashionChunk[] = chunks.map((chunk, index) => ({
    ...chunk,
    embedding: embeddings[index]?.vector ?? [],
  }));

  const payload: FashionIndexFile = {
    version: 1,
    model,
    createdAt: new Date().toISOString(),
    chunks: indexedChunks,
  };

  await fs.mkdir(ROOT_DIR, { recursive: true });
  await fs.writeFile(INDEX_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}
