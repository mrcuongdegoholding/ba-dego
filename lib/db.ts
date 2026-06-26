import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

let rawConnectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
// Remove any sslmode=... parameters to prevent pg from overriding our custom ssl config
const connectionString = rawConnectionString ? rawConnectionString.replace(/\?sslmode=[^&]+&?|&sslmode=[^&]+/, '').replace(/\?$/, '') : undefined;

const isLocal = connectionString ? (connectionString.includes('localhost') || connectionString.includes('127.0.0.1')) : true;

// Setup connection pool
const pool = new Pool({
  connectionString: connectionString,
  ...(connectionString && !isLocal ? { ssl: { rejectUnauthorized: false } } : {})
});

let isInitialized = false;

function convertSql(sql: string) {
  let i = 1;
  // This simplistic replace handles most cases for this specific application.
  let converted = sql.replace(/\?/g, () => `$${i++}`);
  // Handle SQLite datetime function
  converted = converted.replace(/datetime\('now','localtime'\)/gi, 'NOW()');
  return converted;
}

class DbWrapper {
  prepare(sql: string) {
    const converted = convertSql(sql);
    return {
      all: async (...args: any[]) => {
        if (!isInitialized) await initSchema();
        const res = await pool.query(converted, args);
        return res.rows;
      },
      get: async (...args: any[]) => {
        if (!isInitialized) await initSchema();
        const res = await pool.query(converted, args);
        return res.rows[0];
      },
      run: async (...args: any[]) => {
        if (!isInitialized) await initSchema();
        let runSql = converted;
        if (runSql.trim().toUpperCase().startsWith('INSERT')) {
          if (!runSql.toUpperCase().includes('RETURNING ID')) {
             runSql += ' RETURNING id';
          }
        }
        const res = await pool.query(runSql, args);
        return { lastInsertRowid: res.rows[0]?.id || 0, changes: res.rowCount };
      }
    }
  }
}

const db = new DbWrapper();

export function getDb() {
  return db;
}

async function initSchema() {
  if (isInitialized) return;
  isInitialized = true;
  if (!(process.env.DATABASE_URL || process.env.POSTGRES_URL)) {
    console.warn("No DATABASE_URL provided. Cannot initialize schema.");
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_text TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL DEFAULT '',
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'ba',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Khởi tạo',
        stakeholders TEXT DEFAULT '[]',
        is_locked INTEGER NOT NULL DEFAULT 0,
        created_by TEXT DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS survey_step1 (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        process_name TEXT NOT NULL,
        department TEXT NOT NULL,
        role TEXT NOT NULL,
        frequency TEXT DEFAULT '',
        current_tools TEXT DEFAULT '[]',
        process_steps TEXT DEFAULT '[]',
        input_documents TEXT DEFAULT '[]',
        output_documents TEXT DEFAULT '[]',
        pain_points TEXT DEFAULT '[]',
        notes TEXT DEFAULT '',
        created_by TEXT DEFAULT 'Giang (BA)',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS survey_step2 (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        step1_id INTEGER REFERENCES survey_step1(id),
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'normal',
        is_pain_point INTEGER NOT NULL DEFAULT 0,
        follow_up TEXT DEFAULT '',
        created_by TEXT DEFAULT 'Giang (BA)',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS survey_step3 (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        step1_id INTEGER REFERENCES survey_step1(id),
        observation TEXT NOT NULL,
        action_type TEXT NOT NULL DEFAULT 'redundant',
        duration_minutes INTEGER DEFAULT 0,
        frequency TEXT DEFAULT '',
        automation_potential TEXT DEFAULT 'medium',
        is_pain_point INTEGER NOT NULL DEFAULT 0,
        hidden_requirement TEXT DEFAULT '',
        created_by TEXT DEFAULT 'Giang (BA)',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS analysis_5w1h (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        business_flow TEXT NOT NULL,
        what TEXT DEFAULT '',
        who TEXT DEFAULT '',
        where_field TEXT DEFAULT '',
        when_field TEXT DEFAULT '',
        why TEXT DEFAULT '',
        how_edge_cases TEXT NOT NULL DEFAULT '',
        source_step1_ids TEXT DEFAULT '[]',
        source_step2_ids TEXT DEFAULT '[]',
        source_step3_ids TEXT DEFAULT '[]',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS product_backlog (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        analysis_id INTEGER REFERENCES analysis_5w1h(id),
        user_story TEXT NOT NULL,
        acceptance_criteria TEXT DEFAULT '',
        priority TEXT NOT NULL DEFAULT 'P1-High',
        status TEXT NOT NULL DEFAULT 'To Do',
        epic_group TEXT DEFAULT '',
        estimated_hours REAL DEFAULT 0,
        is_locked INTEGER NOT NULL DEFAULT 0,
        is_change_request INTEGER NOT NULL DEFAULT 0,
        cr_reason TEXT DEFAULT '',
        cr_impact TEXT DEFAULT '',
        cr_manhours TEXT DEFAULT '',
        cr_approved INTEGER DEFAULT 0,
        created_by TEXT DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        version TEXT DEFAULT 'v1.0'
      );

      CREATE TABLE IF NOT EXISTS evaluation_checks (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        criterion_group TEXT NOT NULL,
        item_key TEXT NOT NULL,
        checked INTEGER NOT NULL DEFAULT 0,
        note TEXT DEFAULT '',
        updated_by TEXT DEFAULT '',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(project_id, entity_type, entity_id, criterion_group, item_key)
      );

      CREATE TABLE IF NOT EXISTS ai_settings (
        id SERIAL PRIMARY KEY,
        provider TEXT NOT NULL DEFAULT 'gemini',
        api_key TEXT NOT NULL DEFAULT '',
        model TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
        base_url TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1,
        updated_by TEXT DEFAULT '',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id),
        user_name TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        detail TEXT DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS backlog_history (
        id SERIAL PRIMARY KEY,
        backlog_id INTEGER NOT NULL REFERENCES product_backlog(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        version TEXT NOT NULL DEFAULT 'v1.0',
        user_story TEXT NOT NULL,
        acceptance_criteria TEXT DEFAULT '',
        priority TEXT DEFAULT 'P1-High',
        cr_reason TEXT DEFAULT '',
        cr_impact TEXT DEFAULT '',
        changed_by TEXT DEFAULT '',
        changed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      INSERT INTO users (username, password_text, full_name, role)
      SELECT 'admin', 'dego2024', 'Quản trị viên', 'admin'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='admin');

      INSERT INTO users (username, password_text, full_name, role)
      SELECT 'giang', 'giang123', 'Giang (BA)', 'ba'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='giang');

      INSERT INTO users (username, password_text, full_name, role)
      SELECT 'cuong', 'cuong123', 'Cường (Dev)', 'dev'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='cuong');

      INSERT INTO users (username, password_text, full_name, role)
      SELECT 'bao', 'bao123', 'Bảo (Dev)', 'dev'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='bao');

      INSERT INTO users (username, password_text, full_name, role)
      SELECT 'dung', 'ceo2024', 'CEO Trần Chí Dững', 'manager'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE username='dung');
    `);

    // Hash any user whose password is still plaintext-only (seed + legacy rows).
    const needHash = await pool.query(
      `SELECT id, password_text FROM users WHERE (password_hash IS NULL OR password_hash = '') AND password_text != ''`
    );
    for (const u of needHash.rows) {
      await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [bcrypt.hashSync(u.password_text, 10), u.id]);
    }
  } catch (e) {
    console.error("Init Schema Failed:", e);
  }
}
