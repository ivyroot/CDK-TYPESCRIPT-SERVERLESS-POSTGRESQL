import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config();  // Load environment variables from .env file

export default defineConfig({
  dialect: 'postgresql',
  schema: './schema.ts',
  out: './drizzle',

})