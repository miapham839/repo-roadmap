-- Select the database first
USE test;

-- TiDB Serverless Schema for Repo Roadmap Agent
-- Note: Using TEXT for vectors (as JSON) since VECTOR type may have limitations

-- Users table (from NextAuth + GitHub OAuth)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  github_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_github_id (github_id)
);

-- User profiles (skill assessment)
CREATE TABLE IF NOT EXISTS user_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  skill_level ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
  track ENUM('frontend', 'backend', 'fullstack') NOT NULL,
  preferences JSON,
  profile_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
);

-- Repositories
CREATE TABLE IF NOT EXISTS repos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(511) NOT NULL,
  description TEXT,
  url VARCHAR(500),
  stars INT DEFAULT 0,
  topics JSON,
  default_branch VARCHAR(100) DEFAULT 'main',
  language VARCHAR(100),
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_repo (owner, name),
  INDEX idx_full_name (full_name)
);

-- Issues from GitHub
CREATE TABLE IF NOT EXISTS issues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repo_id INT NOT NULL,
  gh_issue_id BIGINT NOT NULL,
  number INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  body TEXT,
  labels JSON,
  state ENUM('open', 'closed') DEFAULT 'open',
  html_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_issue (repo_id, gh_issue_id),
  INDEX idx_repo_state (repo_id, state),
  FULLTEXT INDEX ft_issue_search (title, body)
);

-- Code units (README, docs, code snippets)
CREATE TABLE IF NOT EXISTS code_units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repo_id INT NOT NULL,
  path VARCHAR(1000) NOT NULL,
  kind ENUM('readme', 'doc', 'code') NOT NULL,
  content TEXT NOT NULL,
  language VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_repo_kind (repo_id, kind)
);

-- Embeddings for vector search (stored as JSON text)
CREATE TABLE IF NOT EXISTS embeddings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type ENUM('issue', 'code_unit', 'profile') NOT NULL,
  entity_id INT NOT NULL,
  vector TEXT NOT NULL,
  snippet TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entity (entity_type, entity_id)
);

-- Roadmaps
CREATE TABLE IF NOT EXISTS roadmaps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  repo_id INT NOT NULL,
  summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_repo (user_id, repo_id)
);

-- Roadmap steps
CREATE TABLE IF NOT EXISTS roadmap_steps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roadmap_id INT NOT NULL,
  step_no INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  details TEXT,
  linked_issue_id INT,
  est_minutes INT DEFAULT 60,
  status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_roadmap (roadmap_id)
);

-- Actions (calendar events, notion checklists)
CREATE TABLE IF NOT EXISTS actions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  roadmap_id INT NOT NULL,
  step_id INT,
  type ENUM('calendar', 'notion') NOT NULL,
  payload JSON,
  status ENUM('pending', 'created', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_roadmap (user_id, roadmap_id)
);

-- User feedback on issue recommendations (for learning)
CREATE TABLE IF NOT EXISTS user_issue_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  issue_id INT NOT NULL,
  signal ENUM('view', 'schedule', 'complete', 'skip') NOT NULL,
  weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_issue (user_id, issue_id)
);
