import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 5000;

export const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5173";

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

export const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;