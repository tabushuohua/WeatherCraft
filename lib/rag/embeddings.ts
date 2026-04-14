const OPENAI_EMBEDDING_URL = "https://api.openai.com/v1/embeddings";

export type EmbeddingResult = {
  vector: number[];
  model: string;
};

function getEmbeddingApiKey() {
  const apiKey = process.env.AIHUBMIX_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("AIHUBMIX_API_KEY / OPENAI_API_KEY 未配置，无法生成知识库向量");
  }
  return apiKey;
}

function getEmbeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL
    ?? process.env.AIHUBMIX_EMBEDDING_MODEL
    ?? "text-embedding-3-small";
}

function getEmbeddingUrl() {
  if (process.env.OPENAI_EMBEDDING_URL) return process.env.OPENAI_EMBEDDING_URL;

  const baseUrl = process.env.AIHUBMIX_BASE_URL || process.env.OPENAI_BASE_URL;
  if (!baseUrl) return OPENAI_EMBEDDING_URL;

  return `${baseUrl.replace(/\/$/, "")}/embeddings`;
}

export async function embedText(text: string): Promise<EmbeddingResult> {
  const model = getEmbeddingModel();
  const apiKey = getEmbeddingApiKey();
  const embeddingUrl = getEmbeddingUrl();

  const response = await fetch(embeddingUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding 请求失败: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const vector = data?.data?.[0]?.embedding;

  if (!Array.isArray(vector)) {
    throw new Error("Embedding 响应中未返回有效向量");
  }

  return { vector, model };
}

export async function embedTexts(texts: string[]): Promise<EmbeddingResult[]> {
  if (texts.length === 0) return [];

  const model = getEmbeddingModel();
  const apiKey = getEmbeddingApiKey();
  const embeddingUrl = getEmbeddingUrl();

  const response = await fetch(embeddingUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: texts,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding 批量请求失败: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const items = Array.isArray(data?.data) ? data.data : [];

  return items.map((item: { embedding: number[] }) => ({
    vector: item.embedding,
    model,
  }));
}
