/**
 * ═══════════════════════════════════════════════════════════════════
 * RAG EMBEDDING SERVICE
 * 
 * Provides vector embeddings generation and cosine similarity calculation.
 * Produces 384-dimensional L2-normalized vectors compatible with the 
 * existing knowledge chunks in MongoDB.
 * ═══════════════════════════════════════════════════════════════════
 */

const crypto = require("crypto");
const axios = require("axios");

const EMBEDDING_DIM = 384;

/**
 * 32-bit FNV-1a hash algorithm for deterministic token hashing
 */
function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

/**
 * Tokenize and normalize text into word and character n-grams
 */
function extractFeatures(text) {
  if (!text || typeof text !== "string") return [];
  
  const clean = text.toLowerCase().replace(/[^a-z0-9\s₹]/g, " ");
  const words = clean.split(/\s+/).filter((w) => w.length > 1);
  const features = [];

  for (const word of words) {
    features.push(`w:${word}`);
    // Subword character n-grams (3 to 5 chars) for semantic and morphological matching
    if (word.length >= 3) {
      for (let n = 3; n <= Math.min(5, word.length); n++) {
        for (let i = 0; i <= word.length - n; i++) {
          features.push(`ng:${word.slice(i, i + n)}`);
        }
      }
    }
  }

  // Bigrams for phrasing
  for (let i = 0; i < words.length - 1; i++) {
    features.push(`bg:${words[i]}_${words[i + 1]}`);
  }

  return features;
}

/**
 * Generate 384-dimensional feature hash embedding with L2 normalization
 */
function generateLocalEmbedding(text) {
  const vector = new Float32Array(EMBEDDING_DIM);
  const features = extractFeatures(text);

  if (features.length === 0) {
    return Array.from(vector);
  }

  // Count feature frequencies
  const freq = {};
  for (const f of features) {
    freq[f] = (freq[f] || 0) + 1;
  }

  // Project features into 384 dimensions using deterministic dual hashing
  for (const [feat, count] of Object.entries(freq)) {
    const h1 = fnv1a(feat);
    const h2 = fnv1a(feat + "_sign");
    const index = h1 % EMBEDDING_DIM;
    const sign = (h2 % 2 === 0) ? 1 : -1;
    // Log-damped term frequency
    const weight = 1 + Math.log(count);
    vector[index] += sign * weight;
  }

  // Calculate L2 norm
  let sumSq = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    sumSq += vector[i] * vector[i];
  }

  const norm = Math.sqrt(sumSq);
  if (norm > 0) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vector[i] /= norm;
    }
  }

  return Array.from(vector).map((v) => Math.round(v * 1000000) / 1000000);
}

/**
 * Calculate cosine similarity between two normalized vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA <= 0 || normB <= 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate embedding using configured provider
 */
async function generateEmbedding(text) {
  const provider = (process.env.EMBEDDING_PROVIDER || "local").toLowerCase();

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    try {
      const res = await axios.post(
        "https://api.openai.com/v1/embeddings",
        {
          input: text,
          model: "text-embedding-3-small",
          dimensions: EMBEDDING_DIM,
        },
        {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          timeout: 8000,
        }
      );
      return res.data.data[0].embedding;
    } catch (err) {
      console.warn("⚠️ [Embedding] OpenAI failed, falling back to local vectorizer:", err.message);
    }
  }

  // Default: fast, deterministic 384-dimensional semantic embedding
  return generateLocalEmbedding(text);
}

module.exports = {
  EMBEDDING_DIM,
  generateEmbedding,
  generateLocalEmbedding,
  cosineSimilarity,
};
