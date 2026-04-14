import { embedText } from "./embeddings";
import { cosineSimilarity, loadFashionDocuments, loadFashionIndex, type FashionChunk } from "./vector-store";

const FASHION_KEYWORDS = [
  "穿搭",
  "搭配",
  "衣服",
  "面料",
  "材质",
  "版型",
  "场景",
  "通勤",
  "约会",
  "面试",
  "婚礼",
  "显瘦",
  "显高",
  "显白",
  "颜色",
  "季节",
  "秋冬",
  "夏季",
  "春秋",
  "叠穿",
  "风衣",
  "羽绒服",
  "牛仔",
  "针织",
  "羊毛",
  "棉",
  "涤纶",
];

export type RetrievedFashionChunk = FashionChunk & {
  score: number;
  reason: "vector" | "keyword";
};

export type FashionRagResult = {
  enabled: boolean;
  query: string;
  chunks: RetrievedFashionChunk[];
  context: string;
};

export function isFashionQuery(text: string) {
  const normalized = text.toLowerCase();
  return FASHION_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function keywordScore(query: string, chunk: FashionChunk) {
  const queryTokens = tokenize(query);
  const chunkTokens = tokenize(`${chunk.title} ${chunk.topic} ${chunk.tags.join(" ")} ${chunk.text}`);
  const tokenSet = new Set(chunkTokens);

  let overlap = 0;
  for (const token of queryTokens) {
    if (tokenSet.has(token)) overlap += 1;
  }

  const titleBonus = query.includes(chunk.title) ? 2 : 0;
  return overlap + titleBonus;
}

function formatContext(chunks: RetrievedFashionChunk[]) {
  if (chunks.length === 0) return "";

  return chunks
    .map((chunk, index) => {
      const tags = chunk.tags.length ? `标签: ${chunk.tags.join("、")}` : "";
      return [
        `# 知识片段 ${index + 1}`,
        `标题: ${chunk.title}`,
        `来源: ${chunk.source}`,
        tags,
        `相关度: ${chunk.score.toFixed(3)} (${chunk.reason})`,
        chunk.text,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");
}

export async function retrieveFashionContext(query: string, topK = 4): Promise<FashionRagResult> {
  if (!isFashionQuery(query)) {
    return {
      enabled: false,
      query,
      chunks: [],
      context: "",
    };
  }

  const index = await loadFashionIndex();
  const chunks = index?.chunks?.length ? index.chunks : await loadFashionDocuments();

  if (chunks.length === 0) {
    return {
      enabled: true,
      query,
      chunks: [],
      context: "",
    };
  }

  let ranked: RetrievedFashionChunk[] = chunks
    .map((chunk) => ({
      ...chunk,
      score: keywordScore(query, chunk),
      reason: "keyword" as const,
    }))
    .sort((a, b) => b.score - a.score);

  if (index?.chunks?.length && chunks.some((chunk) => Array.isArray(chunk.embedding) && chunk.embedding.length > 0)) {
    try {
      const queryVector = await embedText(query);
      ranked = chunks
        .map((chunk) => ({
          ...chunk,
          score: chunk.embedding ? cosineSimilarity(queryVector.vector, chunk.embedding) : 0,
          reason: "vector" as const,
        }))
        .sort((a, b) => b.score - a.score);
    } catch {
      // 退回 keyword ranking
    }
  }

  const selected = ranked.filter((chunk) => chunk.score > 0).slice(0, topK);

  return {
    enabled: true,
    query,
    chunks: selected,
    context: formatContext(selected),
  };
}
