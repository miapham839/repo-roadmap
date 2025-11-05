import mysql from 'mysql2/promise';

// TiDB connection pool
let pool: mysql.Pool | null = null;

export function getTiDBPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.TIDB_HOST,
      port: parseInt(process.env.TIDB_PORT || '4000'),
      user: process.env.TIDB_USER,
      password: process.env.TIDB_PASSWORD,
      database: process.env.TIDB_DATABASE,
      ssl: {
        rejectUnauthorized: true,
      },
      connectionLimit: 10,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return pool;
}

export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T> {
  const pool = getTiDBPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}

export async function getConnection() {
  const pool = getTiDBPool();
  return await pool.getConnection();
}

// Type definitions for database entities
export interface User {
  id: string;
  github_id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile {
  id: number;
  user_id: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  track: 'frontend' | 'backend' | 'fullstack';
  preferences: {
    prefer: 'code' | 'docs' | 'tests';
    stack: string[];
  };
  profile_text?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Repo {
  id: number;
  owner: string;
  name: string;
  full_name: string;
  description?: string;
  url?: string;
  stars: number;
  topics?: string[];
  default_branch: string;
  language?: string;
  last_synced_at?: Date;
  created_at: Date;
}

export interface Issue {
  id: number;
  repo_id: number;
  gh_issue_id: number;
  number: number;
  title: string;
  body?: string;
  labels?: any[];
  state: 'open' | 'closed';
  html_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CodeUnit {
  id: number;
  repo_id: number;
  path: string;
  kind: 'readme' | 'doc' | 'code';
  content: string;
  language?: string;
  created_at: Date;
}

export interface Embedding {
  id: number;
  entity_type: 'issue' | 'code_unit' | 'profile';
  entity_id: number;
  vector: number[];
  snippet?: string;
  created_at: Date;
}

export interface Roadmap {
  id: number;
  user_id: string;
  repo_id: number;
  summary?: string;
  created_at: Date;
}

export interface RoadmapStep {
  id: number;
  roadmap_id: number;
  step_no: number;
  title: string;
  details?: string;
  linked_issue_id?: number;
  est_minutes: number;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: Date;
}
