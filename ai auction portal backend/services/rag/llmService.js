/**
 * ═══════════════════════════════════════════════════════════════════
 * RAG LLM PROVIDER SERVICE
 * 
 * Clean, pluggable LLM provider interface supporting Groq, OpenAI,
 * and clear setup instructions if unconfigured. Never fabricates AI answers.
 * ═══════════════════════════════════════════════════════════════════
 */

const axios = require("axios");

/**
 * Generate completion using configured LLM provider
 * 
 * @param {string} systemPrompt - System prompt with role guardrails
 * @param {string} userPrompt - Context-enriched user query
 * @param {Array} history - Previous conversation messages
 * @returns {Promise<Object>} { content, provider, model, latencyMs }
 */
async function generateLLMResponse(systemPrompt, userPrompt, history = []) {
  const startTime = Date.now();

  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // 1. Primary Provider: Groq (Ultra-fast LLM inference with model fallback pool)
  if (groqKey && !groqKey.includes("your_groq_key")) {
    const requestedModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
    
    // Model fallback pool in order of preference
    const candidateModels = Array.from(new Set([
      requestedModel,
      "openai/gpt-oss-120b",
      "qwen/qwen3.8-27b",
      "allam-2-7b"
    ]));

    // Format conversation history for OpenAI-compatible Groq API
    const messages = [{ role: "system", content: systemPrompt }];

    if (Array.isArray(history)) {
      const recentHistory = history.slice(-4);
      for (const turn of recentHistory) {
        if (turn.role === "user" || turn.role === "assistant") {
          messages.push({
            role: turn.role,
            content: turn.content,
          });
        }
      }
    }

    messages.push({ role: "user", content: userPrompt });

    let lastError = null;

    for (const model of candidateModels) {
      // Set appropriate max_tokens depending on model limits (qwen has 1000 OTPM limit, 120b has 8000)
      const tokenCeiling = model.includes("qwen") ? 350 : 600;

      try {
        const response = await axios.post(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            model,
            messages,
            temperature: 0.2,
            max_tokens: tokenCeiling,
            top_p: 0.9,
          },
          {
            headers: {
              Authorization: `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            timeout: 18000,
          }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (content && content.trim().length > 0) {
          return {
            content: content.trim(),
            provider: "groq",
            model,
            latencyMs: Date.now() - startTime,
          };
        }
      } catch (err) {
        lastError = err;
        const errMsg = err.response?.data?.error?.message || err.message;
        console.warn(`⚠️ [LLMService] Groq model '${model}' failed: ${errMsg.slice(0, 100)} — trying fallback model...`);
      }
    }

    if (!openaiKey && lastError) {
      // If all Groq models hit rate limits or errors, synthesize grounded response from context
      console.warn("⚠️ [LLMService] All Groq models encountered limits. Synthesizing grounded factual response from context.");
      return synthesizeGroundedFallback(userPrompt, startTime);
    }
  }

  // 2. Secondary Provider: OpenAI (if configured)
  if (openaiKey && !openaiKey.includes("your_openai_key")) {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const messages = [{ role: "system", content: systemPrompt }];

    if (Array.isArray(history)) {
      for (const turn of history.slice(-4)) {
        if (turn.role === "user" || turn.role === "assistant") {
          messages.push({ role: turn.role, content: turn.content });
        }
      }
    }
    messages.push({ role: "user", content: userPrompt });

    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model,
          messages,
          temperature: 0.3,
          max_tokens: 800,
        },
        {
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (content) {
        return {
          content: content.trim(),
          provider: "openai",
          model,
          latencyMs: Date.now() - startTime,
        };
      }
    } catch (err) {
      console.error("❌ [LLMService] OpenAI API error:", err.response?.data || err.message);
      return synthesizeGroundedFallback(userPrompt, startTime);
    }
  }

  // 3. If neither provider is configured, return explicit configuration instruction
  const configError = new Error(
    "LLM Provider Not Configured: Please set GROQ_API_KEY in your backend .env file to enable AI response generation. Get your free high-speed API key at https://console.groq.com."
  );
  configError.statusCode = 503;
  configError.code = "LLM_NOT_CONFIGURED";
  throw configError;
}

/**
 * Resilient deterministic synthesizer when external APIs hit rate limits
 */
function synthesizeGroundedFallback(userPrompt, startTime) {
  let factualSummary = "Based on our verified platform database records and specifications:\n\n";

  if (userPrompt.includes("### Authoritative Live Database Facts:")) {
    const dbSection = userPrompt.split("### Authoritative Live Database Facts:")[1]?.split("---")[0]?.trim();
    if (dbSection) {
      factualSummary += `**Live Platform Records:**\n${dbSection.slice(0, 900)}\n\n`;
    }
  }

  if (userPrompt.includes("### Verified Platform Knowledge Documents:")) {
    const docsSection = userPrompt.split("### Verified Platform Knowledge Documents:")[1]?.split("---")[0]?.trim();
    if (docsSection) {
      factualSummary += `**Relevant Platform Guidelines & Specifications:**\n${docsSection.slice(0, 900)}\n\n`;
    }
  }

  factualSummary += "> ⚠️ *Inspection Note*: Visual damage ratings reflect external YOLOv8 camera image detection and do not certify hidden mechanical, transmission, or engine conditions.\n\n*Please refer to your dashboard or the cited sources below for complete details.*";

  return {
    content: factualSummary,
    provider: "grounded-synthesizer",
    model: "factual-fallback-v1",
    latencyMs: Date.now() - startTime,
  };
}

module.exports = {
  generateLLMResponse,
};
