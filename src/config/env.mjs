import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 4000;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
export const OPENAI_EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

