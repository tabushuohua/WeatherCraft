const fs = require("fs/promises");
const path = require("path");

const ROOT_DIR = path.join(process.cwd(), "data", "fashion-kb");
const INDEX_FILE = path.join(ROOT_DIR, "index.json");
const DEFAULT_EMBEDDING_URL = "https://api.openai.com/v1/embeddings";

function getEmbeddingApiKey() {
  return process.env.AIHUBMIX_API_KEY || process.env.OPENAI_API_KEY || "";
}

function getEmbeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL || process.env.AIHUBMIX_EMBEDDING_MODEL || "text-embedding-3-small";
}

function getEmbeddingUrl() {
  if (process.env.OPENAI_EMBEDDING_URL) return process.env.OPENAI_EMBEDDING_URL;

  const baseUrl = process.env.AIHUBMIX_BASE_URL || process.env.OPENAI_BASE_URL;
  if (!baseUrl) return DEFAULT_EMBEDDING_URL;

  return `${baseUrl.replace(/\/$/, "")}/embeddings`;
}

async function loadDotEnvFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const equalIndex = trimmed.indexOf("=");
      if (equalIndex <= 0) continue;

      const key = trimmed.slice(0, equalIndex).trim();
      let value = trimmed.slice(equalIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // 忽略不存在的 env 文件
  }
}

async function loadEnvironment() {
  await loadDotEnvFile(path.join(process.cwd(), ".env.local"));
  await loadDotEnvFile(path.join(process.cwd(), ".env"));
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

async function tryEmbedTexts(texts) {
  try {
    return await embedTexts(texts);
  } catch (error) {
    console.warn("⚠️ Embedding 失败，已自动降级为关键词索引：", error?.message || error);
    return {
      model: getEmbeddingModel(),
      vectors: texts.map(() => []),
    };
  }
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
  await loadEnvironment();

  const chunks = await loadMarkdownChunks();
  if (chunks.length === 0) {
    throw new Error("未找到可索引的穿搭知识文本。");
  }

  const texts = chunks.map((chunk) => `${chunk.title}\n${chunk.text}`);
  const { model, vectors } = await tryEmbedTexts(texts);

  const payload = {
    version: 1,
    model,
    createdAt: new Date().toISOString(),
    chunks: chunks.map((chunk, index) => ({
      ...chunk,
      embedding: vectors[index] || [],
    })),
  };

  await fs.writeFile(INDEX_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`已生成知识库索引：${payload.chunks.length} 个 chunk`);
  console.log(`输出文件：${INDEX_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
