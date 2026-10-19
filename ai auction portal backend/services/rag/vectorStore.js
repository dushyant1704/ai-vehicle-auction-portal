/**
 * ═══════════════════════════════════════════════════════════════════
 * RAG VECTOR STORE & HYBRID RETRIEVAL ADAPTER
 * 
 * Supports role-based access control, tenant boundary enforcement,
 * Atlas Vector Search, and high-performance in-memory hybrid cosine
 * retrieval fallback.
 * ═══════════════════════════════════════════════════════════════════
 */

const KnowledgeChunk = require("../../models/KnowledgeChunk");
const { generateEmbedding, cosineSimilarity } = require("./embeddingService");

/**
 * Keyword match scoring (token overlap & exact phrase matching)
 */
function calculateKeywordScore(query, text, title) {
  if (!query || (!text && !title)) return 0;

  const qTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (qTerms.length === 0) return 0;

  const target = `${title || ""} ${text || ""}`.toLowerCase();
  let matches = 0;
  for (const term of qTerms) {
    if (target.includes(term)) matches++;
  }

  // Bonus for title matches
  let titleBonus = 0;
  const tLower = (title || "").toLowerCase();
  for (const term of qTerms) {
    if (tLower.includes(term)) titleBonus += 0.2;
  }

  // Exact phrase match bonus
  let phraseBonus = 0;
  if (query.length > 5 && target.includes(query.toLowerCase())) {
    phraseBonus = 0.3;
  }

  const baseScore = matches / qTerms.length;
  return Math.min(1.0, baseScore * 0.5 + titleBonus + phraseBonus);
}

/**
 * Build security filter based on authenticated user identity and role
 */
function buildRoleFilter(user) {
  const role = (user?.role || "buyer").toLowerCase();

  // Map incoming role to canonical role types
  const canonicalRole =
    role === "bank" ? "bank" :
    role === "seller" ? "seller" :
    role === "admin" ? "admin" : "buyer";

  if (canonicalRole === "admin") {
    // Admin has access to administrative and general knowledge chunks
    return {
      permittedRoles: "admin",
    };
  }

  if (canonicalRole === "seller" || canonicalRole === "bank") {
    // Seller/Bank can access seller-permitted public knowledge, plus their own tenant chunks
    const sellerId = user?.id || user?._id;
    return {
      permittedRoles: { $in: ["seller", "bank"] },
      $or: [
        { sellerId: null },
        { sellerId: { $exists: false } },
        ...(sellerId ? [{ sellerId: sellerId }] : []),
      ],
    };
  }

  // General Bidder (buyer): public bidder knowledge only, never seller-private chunks
  return {
    permittedRoles: "buyer",
    $or: [{ sellerId: null }, { sellerId: { $exists: false } }],
  };
}

/**
 * Hybrid Vector + Keyword Search with strict RBAC enforcement
 * 
 * @param {string} queryText - User's query
 * @param {Object} user - Authenticated user { id, role }
 * @param {Object} options - Search options (topK, minScore, sourceTypes)
 * @returns {Promise<Array>} Array of ranked matching chunks with scores
 */
async function searchChunks(queryText, user, options = {}) {
  const { topK = 6, minScore = 0.05, sourceTypes = null } = options;

  if (!queryText || typeof queryText !== "string" || !queryText.trim()) {
    return [];
  }

  const queryEmbedding = await generateEmbedding(queryText);
  const securityFilter = buildRoleFilter(user);

  if (sourceTypes && Array.isArray(sourceTypes) && sourceTypes.length > 0) {
    securityFilter.sourceType = { $in: sourceTypes };
  }

  // Check if Atlas Vector Search is enabled and configured
  if (process.env.USE_ATLAS_VECTOR_SEARCH === "true") {
    try {
      const atlasPipeline = [
        {
          $vectorSearch: {
            index: process.env.ATLAS_VECTOR_INDEX || "vector_index",
            path: "embedding",
            queryVector: queryEmbedding,
            numCandidates: topK * 10,
            limit: topK * 2,
            filter: securityFilter,
          },
        },
        {
          $project: {
            title: 1,
            sourceType: 1,
            sourceId: 1,
            content: 1,
            chunkIndex: 1,
            metadata: 1,
            permittedRoles: 1,
            sellerId: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ];

      const atlasResults = await KnowledgeChunk.aggregate(atlasPipeline);
      if (atlasResults && atlasResults.length > 0) {
        return atlasResults.slice(0, topK);
      }
    } catch (err) {
      console.warn("⚠️ [VectorStore] Atlas Vector Search fallback to native hybrid:", err.message);
    }
  }

  // Native Hybrid Search: fetch authorized candidate chunks and calculate scores
  const candidates = await KnowledgeChunk.find(securityFilter)
    .select("title sourceType sourceId content chunkIndex metadata permittedRoles sellerId embedding")
    .lean();

  if (!candidates || candidates.length === 0) {
    return [];
  }

  const scoredResults = [];

  for (const chunk of candidates) {
    // 1. Vector similarity
    const vecScore = chunk.embedding && chunk.embedding.length > 0
      ? cosineSimilarity(queryEmbedding, chunk.embedding)
      : 0;

    // 2. Keyword relevance
    const kwScore = calculateKeywordScore(queryText, chunk.content, chunk.title);

    // 3. Combined hybrid score (70% vector semantic + 30% keyword exactness)
    const hybridScore = vecScore * 0.70 + kwScore * 0.30;

    if (hybridScore >= minScore) {
      // Create clean snippet (first 300 characters)
      const cleanSnippet = (chunk.content || "")
        .replace(/\n+/g, " ")
        .trim()
        .slice(0, 320);

      scoredResults.push({
        _id: chunk._id,
        title: chunk.title,
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
        content: chunk.content,
        snippet: cleanSnippet.length >= 320 ? `${cleanSnippet}...` : cleanSnippet,
        chunkIndex: chunk.chunkIndex,
        metadata: chunk.metadata || {},
        score: Math.round(hybridScore * 1000) / 1000,
        vectorScore: Math.round(vecScore * 1000) / 1000,
        keywordScore: Math.round(kwScore * 1000) / 1000,
      });
    }
  }

  // Sort by hybrid score descending and return top K
  scoredResults.sort((a, b) => b.score - a.score);
  return scoredResults.slice(0, topK);
}

/**
 * Ingest or update a knowledge chunk with vector embedding
 */
async function upsertChunk(chunkData) {
  const { sourceId, sourceType, chunkIndex = 0, content, title } = chunkData;

  const embedding =
    chunkData.embedding && chunkData.embedding.length === 384
      ? chunkData.embedding
      : await generateEmbedding(`${title}\n${content}`);

  const updateDoc = {
    ...chunkData,
    embedding,
    updatedAt: new Date(),
  };

  return KnowledgeChunk.findOneAndUpdate(
    { sourceId, sourceType, chunkIndex },
    { $set: updateDoc },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
}

/**
 * Remove knowledge chunks associated with a source
 */
async function deleteChunksBySource(sourceId, sourceType) {
  const filter = { sourceId };
  if (sourceType) filter.sourceType = sourceType;
  return KnowledgeChunk.deleteMany(filter);
}

module.exports = {
  searchChunks,
  upsertChunk,
  deleteChunksBySource,
  buildRoleFilter,
};
