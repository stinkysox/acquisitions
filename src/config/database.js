import 'dotenv/config';
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Optional Neon Local configuration for Docker Development
if (process.env.NODE_ENV === 'development') {
  neonConfig.fetchEndpoint = 'http://neon-local:5432/sql';
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
}

// Initialize Neon Client
const sql = neon(process.env.DATABASE_URL);

// Initialize Drizzle ORM
export const db = drizzle(sql);
export { sql };
