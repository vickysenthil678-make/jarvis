import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import mammoth from "mammoth";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { createRequire } from "module";

// Setup dotenv
dotenv.config();

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const PORT = 3000;
const app = express();

// Increase JSON request limits since we handle image uploads and large files
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Local persistent JSON Database path
const DB_PATH = path.join(process.cwd(), "db.json");

interface LocalDb {
  threads: any[];
  memories: any[];
  preferences: {
    theme: "light" | "dark";
    voiceEnabled: boolean;
    currentVoice: string;
    autoSpeak: boolean;
    temperature: number;
  };
}

// Ensure local db exists
function initDb(): LocalDb {
  if (!fs.existsSync(DB_PATH)) {
    const defaultData: LocalDb = {
      threads: [],
      memories: [],
      preferences: {
        theme: "dark",
        voiceEnabled: false,
        currentVoice: "Zephyr",
        autoSpeak: false,
        temperature: 0.7,
      },
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), "utf-8");
    return defaultData;
  }
  try {
    const content = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to read database, resetting to default:", error);
    const defaultData: LocalDb = {
      threads: [],
      memories: [],
      preferences: {
        theme: "dark",
        voiceEnabled: false,
        currentVoice: "Zephyr",
        autoSpeak: false,
        temperature: 0.7,
      },
    };
    return defaultData;
  }
}

function saveDb(data: LocalDb) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save database:", error);
  }
}

// Initialize database
const db = initDb();

// Lazy initialize Gemini AI client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables. Gemini calls will fail.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Configure Multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Helper for Cosine Similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ---------------- API ENDPOINTS ----------------

// 1. Thread Management APIs
app.get("/api/threads", (req, res) => {
  const currentDb = initDb();
  // Return list of threads stripped of detail to keep payloads small
  const summaries = currentDb.threads.map((t) => ({
    id: t.id,
    title: t.title,
    modelId: t.modelId,
    searchGrounding: t.searchGrounding,
    createdAt: t.createdAt,
    lastUpdated: t.messages[t.messages.length - 1]?.timestamp || t.createdAt,
  }));
  res.json(summaries);
});

app.post("/api/threads", (req, res) => {
  const currentDb = initDb();
  const { title, modelId, searchGrounding } = req.body;
  const newThread = {
    id: "thread_" + Date.now().toString(36),
    title: title || "New Chat",
    messages: [],
    modelId: modelId || "gemini-3.5-flash",
    searchGrounding: searchGrounding || false,
    createdAt: new Date().toISOString(),
  };
  currentDb.threads.unshift(newThread); // prepend
  saveDb(currentDb);
  res.status(201).json(newThread);
});

app.get("/api/threads/:id", (req, res) => {
  const currentDb = initDb();
  const thread = currentDb.threads.find((t) => t.id === req.params.id);
  if (!thread) {
    return res.status(404).json({ error: "Thread not found" });
  }
  res.json(thread);
});

app.delete("/api/threads/:id", (req, res) => {
  const currentDb = initDb();
  const index = currentDb.threads.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Thread not found" });
  }
  currentDb.threads.splice(index, 1);
  saveDb(currentDb);
  res.json({ success: true });
});

// Update a thread (e.g. modify individual properties of thread or its message list)
app.put("/api/threads/:id", (req, res) => {
  const currentDb = initDb();
  const threadIndex = currentDb.threads.findIndex((t) => t.id === req.params.id);
  if (threadIndex === -1) {
    return res.status(404).json({ error: "Thread not found" });
  }
  
  const { title, messages, modelId, searchGrounding } = req.body;
  const thread = currentDb.threads[threadIndex];
  
  if (title !== undefined) thread.title = title;
  if (messages !== undefined) thread.messages = messages;
  if (modelId !== undefined) thread.modelId = modelId;
  if (searchGrounding !== undefined) thread.searchGrounding = searchGrounding;
  
  currentDb.threads[threadIndex] = thread;
  saveDb(currentDb);
  res.json(thread);
});

// 2. Personal Memories / Long-term Database APIs
app.get("/api/memories", (req, res) => {
  const currentDb = initDb();
  res.json(currentDb.memories.map((m) => ({ id: m.id, content: m.content, timestamp: m.timestamp })));
});

app.post("/api/memories", async (req, res) => {
  const currentDb = initDb();
  const { content, associatedThreadId } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Memory content cannot be empty" });
  }

  let embedding: number[] | undefined;
  try {
    const ai = getGeminiClient();
    const result = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: content,
    });
    embedding = result.embeddings?.[0]?.values;
  } catch (error) {
    console.error("Embedding generation failed, saving memory without embeddings:", error);
  }

  const newMemory = {
    id: "memory_" + Date.now().toString(36),
    content: content.trim(),
    timestamp: new Date().toISOString(),
    embedding,
    associatedThreadId,
  };

  currentDb.memories.unshift(newMemory);
  saveDb(currentDb);
  res.status(201).json({ id: newMemory.id, content: newMemory.content, timestamp: newMemory.timestamp });
});

app.delete("/api/memories/:id", (req, res) => {
  const currentDb = initDb();
  const index = currentDb.memories.findIndex((m) => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Memory not found" });
  }
  currentDb.memories.splice(index, 1);
  saveDb(currentDb);
  res.json({ success: true });
});

// Global user preferences
app.get("/api/preferences", (req, res) => {
  const currentDb = initDb();
  res.json(currentDb.preferences);
});

app.put("/api/preferences", (req, res) => {
  const currentDb = initDb();
  const { theme, voiceEnabled, currentVoice, autoSpeak, temperature } = req.body;
  if (theme !== undefined) currentDb.preferences.theme = theme;
  if (voiceEnabled !== undefined) currentDb.preferences.voiceEnabled = voiceEnabled;
  if (currentVoice !== undefined) currentDb.preferences.currentVoice = currentVoice;
  if (autoSpeak !== undefined) currentDb.preferences.autoSpeak = autoSpeak;
  if (temperature !== undefined) currentDb.preferences.temperature = temperature;
  saveDb(currentDb);
  res.json(currentDb.preferences);
});

// 3. Document/File Upload Endpoint
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file provided" });
  }

  const { originalname, mimetype, buffer, size } = req.file;

  try {
    let extractedText = "";

    // Parse according to mimetype
    if (mimetype === "application/pdf" || originalname.endsWith(".pdf")) {
      const data = await pdfParse(buffer);
      extractedText = data.text || "";
    } else if (
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      originalname.endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || "";
    } else if (mimetype.startsWith("text/") || originalname.endsWith(".txt") || originalname.endsWith(".csv")) {
      extractedText = buffer.toString("utf-8");
    } else if (mimetype.startsWith("image/")) {
      // Images will use Gemini's native multimodal capabilities, so we return original base64
      const base64Image = buffer.toString("base64");
      const previewUrl = `data:${mimetype};base64,${base64Image}`;
      return res.json({
        name: originalname,
        type: mimetype,
        size,
        extractedText: "Detected image file. Visual analysis/OCR will be performed on dispatch.",
        previewUrl,
      });
    } else {
      // Default to plain utf-8 reading if applicable
      extractedText = buffer.toString("utf-8");
    }

    res.json({
      name: originalname,
      type: mimetype,
      size,
      extractedText: extractedText.trim() || "[No text content extracted]",
    });
  } catch (error: any) {
    console.error("File parsing error:", error);
    res.status(500).json({ error: `Failed to parse file: ${error.message}` });
  }
});

// 4. TTS Voice Synthesis Endpoint
app.post("/api/tts", async (req, res) => {
  const { text, voice } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Text is required for TTS" });
  }

  try {
    const ai = getGeminiClient();
    
    // Limits length of synthesized speech to key output range
    const cleanText = text.substring(0, 300);

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say clearly and eloquently: ${cleanText}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || "Zephyr" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio block returned in Gemini response");
    }

    res.json({ audioBase64: base64Audio });
  } catch (error: any) {
    console.error("TTS generation failed:", error);
    res.status(500).json({ error: `TTS service error: ${error.message}` });
  }
});

// 5. Chat Query and Search Grounding Engine
app.post("/api/chat", async (req, res) => {
  const { threadId, prompt, history, searchGrounding, modelId, temperature, attachedFile } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const ai = getGeminiClient();
    const currentDb = initDb();

    // 1. Semantic Memory Search
    let contextMemoryTrigger = "";
    try {
      if (currentDb.memories.length > 0) {
        const embedRes = await ai.models.embedContent({
          model: "gemini-embedding-2-preview",
          contents: prompt,
        });
        const userEmbedding = embedRes.embeddings?.[0]?.values;

        if (userEmbedding) {
          // Score memories
          const scored = currentDb.memories
            .map((m) => {
              if (!m.embedding) return { item: m, score: 0 };
              const score = cosineSimilarity(userEmbedding, m.embedding);
              return { item: m, score };
            })
            .filter((x) => x.score > 0.65) // match threshold
            .sort((a, b) => b.score - a.score)
            .slice(0, 3); // top 3 memories

          if (scored.length > 0) {
            contextMemoryTrigger = "\n[Information Remembered About User for Continuity]:\n" + 
              scored.map((x) => `- ${x.item.content}`).join("\n");
          }
        }
      }
    } catch (memError) {
      console.warn("Semantic memory recall failed (ignoring):", memError);
    }

    // 2. Assemble System Instruction
    const systemInstruction = `You are a world-class, premium full-stack AI Assistant similar to ChatGPT and Perplexity.
You deliver beautiful, deeply structural, visually optimized markdown answers complete with headings, tables, bullet points, and code templates.
Provide code snippets in their respective languages with rich explanatory comments. Debug and highlight code logic when requested.
Always respect facts and details.${contextMemoryTrigger}
When providing facts from searches, be highly objective and reference URLs naturally without technical jargon.`;

    // 3. Assemble Conversational Contents array
    // Map existing history to Gemini schema: { role: 'user' | 'model', parts: [{ text: string }] }
    const contents: any[] = [];
    
    if (history && history.length > 0) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Append context of uploaded text document natively if provided
    let finalPrompt = prompt;
    let partsPayload: any[] = [];

    if (attachedFile) {
      if (attachedFile.previewUrl && attachedFile.previewUrl.startsWith("data:image/")) {
        // Image OCR / Vision support
        const mimeType = attachedFile.type;
        const base64Data = attachedFile.previewUrl.split(",")[1];
        
        partsPayload.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
        
        partsPayload.push({
          text: `[Image attachment: ${attachedFile.name}]\n${prompt}`,
        });
      } else if (attachedFile.extractedText) {
        // Text / PDF / DOCX parsing context projection
        finalPrompt = `[Context extracted from uploaded file: ${attachedFile.name}]\n${attachedFile.extractedText}\n\n[User Query]:\n${prompt}`;
        partsPayload.push({ text: finalPrompt });
      } else {
        partsPayload.push({ text: finalPrompt });
      }
    } else {
      partsPayload.push({ text: finalPrompt });
    }

    // Add current Turn to the contents
    contents.push({
      role: "user",
      parts: partsPayload,
    });

    // 4. Configure Tools (e.g. Google Search Grounding)
    const toolsConfig: any[] = [];
    if (searchGrounding) {
      toolsConfig.push({ googleSearch: {} });
    }

    // Determine target model
    const activeModel = modelId || "gemini-3.5-flash";

    // 5. Generate assistant response
    const config: any = {
      systemInstruction,
      temperature: temperature !== undefined ? temperature : 0.7,
    };

    if (toolsConfig.length > 0) {
      config.tools = toolsConfig;
    }

    const response = await ai.models.generateContent({
      model: activeModel,
      contents,
      config,
    });

    const outputText = response.text || "[No response generated]";
    
    // Extract search grounding citations
    const chunkSources: any[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks && Array.isArray(groundingChunks)) {
      groundingChunks.forEach((chunk: any, i: number) => {
        if (chunk.web && chunk.web.uri) {
          chunkSources.push({
            title: chunk.web.title || "Web Source",
            url: chunk.web.uri,
            index: i + 1,
          });
        }
      });
    }

    // 6. Save thread state in DB
    const threadIndex = currentDb.threads.findIndex((t) => t.id === threadId);
    if (threadIndex !== -1) {
      const activeThread = currentDb.threads[threadIndex];
      // Append user prompt message
      const userMessage = {
        id: "msg_" + Date.now().toString(36) + "_u",
        role: "user",
        content: prompt,
        timestamp: new Date().toISOString(),
        file: attachedFile ? {
          name: attachedFile.name,
          type: attachedFile.type,
          size: attachedFile.size,
        } : undefined,
      };

      // Append model assistant message
      const assistantMessage = {
        id: "msg_" + Date.now().toString(36) + "_a",
        role: "assistant",
        content: outputText,
        timestamp: new Date().toISOString(),
        sources: chunkSources.length > 0 ? chunkSources : undefined,
      };

      activeThread.messages.push(userMessage);
      activeThread.messages.push(assistantMessage);
      
      // Auto upgrade title if it was default
      if (activeThread.title === "New Chat" && activeThread.messages.length <= 2) {
        activeThread.title = prompt.substring(0, 30) + (prompt.length > 30 ? "..." : "");
      }

      currentDb.threads[threadIndex] = activeThread;
      saveDb(currentDb);
    }

    res.json({
      text: outputText,
      sources: chunkSources,
    });
  } catch (error: any) {
    console.error("Chat routing error:", error);
    res.status(500).json({ error: error.message || "An error occurred during conversational dispatch." });
  }
});

// Start listening and integrate Vite compilation
async function startServer() {
  // Vite integration for asset serving
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting development Express server running transparently...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving compiled production assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully listening on port ${PORT}`);
  });
}

startServer();
