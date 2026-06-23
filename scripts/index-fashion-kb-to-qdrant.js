const fs = require("fs/promises");
const path = require("path");
const { QdrantClient } = require("@qdrant/js-client-rest");

const ROOT_DIR = path.join(process.cwd(), "data", "fashion-kb");

function getEmbeddingApiKey() {
  return process.env.AIHUBMIX_API_KEY || process.env.OPENAI_API_KEY || "";
}

function getEmbeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL || process.env.AIHUBMIX_EMBEDDING_MODEL || "text-embedding-3-small";
}

function getEmbeddingUrl() {
  if (process.env.OPENAI_EMBEDDING_URL) return process.env.OPENAI_EMBEDDING_URL;

  const baseUrl = process.env.AIHUBMIX_BASE_URL || process.env.OPENAI_BASE_URL;
  if (!baseUrl) return "https://api.openai.com/v1/embeddings";

  return `${baseUrl.replace(/\/$/, "")}/embeddings`;
}

async function chunkText(text, chunkSize = 900, overlap = 120) {
  const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks = [];

  let buffer = "";
  for (const paragraph of paragraphs) {
    const next = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (next.length <= chunkSize) {
      buffer = next;
      continue;
    }

    if (buffer) chunks.push(buffer);
    if (paragraph.length > chunkSize) {
      for (let i = 0; i < paragraph.length; i += chunkSize - overlap) {
        chunks.push(paragraph.slice(i, i + chunkSize));
      }
      buffer = "";
    } else {
      buffer = paragraph;
    }
  }

  if (buffer) chunks.push(buffer);
  return chunks;
}

async function embedTexts(texts) {
  const apiKey = getEmbeddingApiKey();
  if (!apiKey) {
    throw new Error("请先设置 AIHUBMIX_API_KEY 或 OPENAI_API_KEY，再执行知识库索引构建。");
  }

  const model = getEmbeddingModel();
  const embeddingUrl = getEmbeddingUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let response;

  try {
    response = await fetch(embeddingUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: texts }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Embedding 请求失败: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return { model, vectors: data.data.map((item) => item.embedding) };
}

async function loadMarkdownChunks() {
  const files = (await fs.readdir(ROOT_DIR)).filter((file) => file.endsWith(".md"));
  const chunks = [];

  for (const file of files) {
    const fullPath = path.join(ROOT_DIR, file);
    const content = await fs.readFile(fullPath, "utf8");
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1]?.trim() || file;
    const body = content.replace(/^#\s+.+$/m, "").trim();
    const sections = await chunkText(body);

    sections.forEach((text, index) => {
      chunks.push({
        id: `${file}::${index + 1}`,
        title: `${title} / chunk ${index + 1}`,
        text,
        source: file,
        topic: file.replace(/\.md$/, ""),
        tags: [],
      });
    });
  }

  return chunks;
}

async function main() {
  const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
  const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "fashion_kb";
  const client = new QdrantClient({ url: QDRANT_URL, apiKey: process.env.QDRANT_API_KEY });

  const chunks = await loadMarkdownChunks();
  if (chunks.length === 0) throw new Error("未找到可索引的穿搭知识文本。");

  const texts = chunks.map((chunk) => `${chunk.title}\n${chunk.text}`);
  const { model, vectors } = await embedTexts(texts).catch((err) => {
    console.error("Embedding 失败：", err);
    process.exit(1);
  });

  const vectorSize = (vectors[0] || []).length || 1536;
  // 创建 collection（忽略已存在错误）
  try {
    await client.collections.create({
      collection_name: QDRANT_COLLECTION,
      vectors: { size: vectorSize, distance: "Cosine" },
    });
  } catch (e) {}

  const batchSize = 64;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = [];
    for (let j = i; j < Math.min(i + batchSize, chunks.length); j++) {
      const vec = vectors[j] || [];
      if (!Array.isArray(vec) || vec.length === 0) continue;
      batch.push({ id: chunks[j].id, vector: vec, payload: { title: chunks[j].title, source: chunks[j].source, topic: chunks[j].topic, tags: chunks[j].tags } });
    }

    if (batch.length === 0) continue;
    await client.points.upsert({ collection_name: QDRANT_COLLECTION, points: batch });
    console.log(`Upserted points ${i + 1}..${Math.min(i + batchSize, chunks.length)}`);
  }

  console.log(`已将 ${chunks.length} 个 chunk 导入 Qdrant 集合 ${QDRANT_COLLECTION}（模型: ${model}）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
