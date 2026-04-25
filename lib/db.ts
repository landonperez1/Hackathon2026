import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "projectmind.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      reliability INTEGER NOT NULL DEFAULT 3,
      workload INTEGER NOT NULL DEFAULT 3,
      communication_style TEXT NOT NULL DEFAULT '',
      personality_notes TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      person_id TEXT,
      content TEXT NOT NULL,
      project_context TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS relationships (
      person_a_id TEXT NOT NULL,
      person_b_id TEXT NOT NULL,
      strength INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (person_a_id, person_b_id),
      FOREIGN KEY (person_a_id) REFERENCES people(id) ON DELETE CASCADE,
      FOREIGN KEY (person_b_id) REFERENCES people(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS strategies (
      id TEXT PRIMARY KEY,
      project_description TEXT NOT NULL,
      options_json TEXT NOT NULL,
      chosen_index INTEGER,
      rating INTEGER,
      feedback TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_files (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      storage_path TEXT,
      original_filename TEXT,
      mime_type TEXT,
      size_bytes INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS interaction_mentions (
      interaction_id TEXT NOT NULL,
      mention_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      PRIMARY KEY (interaction_id, mention_type, target_id),
      FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_interactions_person ON interactions(person_id);
    CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_strategies_created ON strategies(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
    CREATE INDEX IF NOT EXISTS idx_mentions_target ON interaction_mentions(mention_type, target_id);
  `);

  _db = db;
  return db;
}

export type Person = {
  id: string;
  name: string;
  role: string;
  reliability: number;
  workload: number;
  communication_style: string;
  personality_notes: string;
  created_at: number;
};

export type Interaction = {
  id: string;
  person_id: string | null;
  content: string;
  project_context: string;
  created_at: number;
};

export type Relationship = {
  person_a_id: string;
  person_b_id: string;
  strength: number;
};

export type StrategyOption = {
  title: string;
  summary: string;
  steps: Array<{
    person_id: string | null;
    person_name: string;
    action: string;
    communication_guidance: string;
  }>;
  estimated_timeframe: string;
  risks: string[];
  why_this_works: string;
};

export type Strategy = {
  id: string;
  project_description: string;
  options: StrategyOption[];
  chosen_index: number | null;
  rating: number | null;
  feedback: string | null;
  created_at: number;
  completed_at: number | null;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  created_at: number;
};

export type ProjectFile = {
  id: string;
  project_id: string;
  name: string;
  notes: string;
  storage_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: number;
};

export type MentionType = "person" | "project" | "file";

export type InteractionMention = {
  interaction_id: string;
  mention_type: MentionType;
  target_id: string;
};

export type StrategyRow = {
  id: string;
  project_description: string;
  options_json: string;
  chosen_index: number | null;
  rating: number | null;
  feedback: string | null;
  created_at: number;
  completed_at: number | null;
};

function uuid(): string {
  return crypto.randomUUID();
}

// People

export function listPeople(): Person[] {
  return getDb()
    .prepare("SELECT * FROM people ORDER BY name ASC")
    .all() as Person[];
}

export function getPerson(id: string): Person | undefined {
  return getDb().prepare("SELECT * FROM people WHERE id = ?").get(id) as
    | Person
    | undefined;
}

export function createPerson(input: {
  name: string;
  role?: string;
  reliability?: number;
  workload?: number;
  communication_style?: string;
  personality_notes?: string;
}): Person {
  const person: Person = {
    id: uuid(),
    name: input.name,
    role: input.role ?? "",
    reliability: input.reliability ?? 3,
    workload: input.workload ?? 3,
    communication_style: input.communication_style ?? "",
    personality_notes: input.personality_notes ?? "",
    created_at: Date.now(),
  };
  getDb()
    .prepare(
      `INSERT INTO people
       (id, name, role, reliability, workload, communication_style, personality_notes, created_at)
       VALUES (@id, @name, @role, @reliability, @workload, @communication_style, @personality_notes, @created_at)`
    )
    .run(person);
  return person;
}

export function updatePerson(
  id: string,
  patch: Partial<Omit<Person, "id" | "created_at">>
): Person | undefined {
  const existing = getPerson(id);
  if (!existing) return undefined;
  const merged = { ...existing, ...patch, id };
  getDb()
    .prepare(
      `UPDATE people SET
         name = @name,
         role = @role,
         reliability = @reliability,
         workload = @workload,
         communication_style = @communication_style,
         personality_notes = @personality_notes
       WHERE id = @id`
    )
    .run(merged);
  return merged;
}

export function deletePerson(id: string): boolean {
  const info = getDb().prepare("DELETE FROM people WHERE id = ?").run(id);
  return info.changes > 0;
}

// Interactions

export function listInteractions(limit = 200): Interaction[] {
  return getDb()
    .prepare("SELECT * FROM interactions ORDER BY created_at DESC LIMIT ?")
    .all(limit) as Interaction[];
}

export function listInteractionsForPerson(personId: string): Interaction[] {
  return getDb()
    .prepare(
      "SELECT * FROM interactions WHERE person_id = ? ORDER BY created_at DESC"
    )
    .all(personId) as Interaction[];
}

export function createInteraction(input: {
  person_id?: string | null;
  content: string;
  project_context?: string;
  mentions?: Array<{ type: MentionType; id: string }>;
}): Interaction {
  const interaction: Interaction = {
    id: uuid(),
    person_id: input.person_id ?? null,
    content: input.content,
    project_context: input.project_context ?? "",
    created_at: Date.now(),
  };
  const db = getDb();
  const insertInteraction = db.prepare(
    `INSERT INTO interactions
     (id, person_id, content, project_context, created_at)
     VALUES (@id, @person_id, @content, @project_context, @created_at)`
  );
  const insertMention = db.prepare(
    `INSERT OR IGNORE INTO interaction_mentions
     (interaction_id, mention_type, target_id)
     VALUES (?, ?, ?)`
  );
  const tx = db.transaction(() => {
    insertInteraction.run(interaction);
    if (input.person_id) {
      insertMention.run(interaction.id, "person", input.person_id);
    }
    for (const m of input.mentions ?? []) {
      insertMention.run(interaction.id, m.type, m.id);
    }
  });
  tx();
  return interaction;
}

export function listInteractionMentions(): InteractionMention[] {
  return getDb()
    .prepare("SELECT * FROM interaction_mentions")
    .all() as InteractionMention[];
}

export function listMentionsForInteraction(
  interactionId: string
): InteractionMention[] {
  return getDb()
    .prepare("SELECT * FROM interaction_mentions WHERE interaction_id = ?")
    .all(interactionId) as InteractionMention[];
}

export function deleteInteraction(id: string): boolean {
  const info = getDb().prepare("DELETE FROM interactions WHERE id = ?").run(id);
  return info.changes > 0;
}

// Relationships

function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function listRelationships(): Relationship[] {
  return getDb()
    .prepare("SELECT * FROM relationships")
    .all() as Relationship[];
}

export function setRelationship(
  personAId: string,
  personBId: string,
  strength: number
): Relationship | null {
  if (personAId === personBId) return null;
  const [a, b] = pairKey(personAId, personBId);
  const rel: Relationship = {
    person_a_id: a,
    person_b_id: b,
    strength,
  };
  getDb()
    .prepare(
      `INSERT INTO relationships (person_a_id, person_b_id, strength)
       VALUES (@person_a_id, @person_b_id, @strength)
       ON CONFLICT(person_a_id, person_b_id) DO UPDATE SET strength = excluded.strength`
    )
    .run(rel);
  return rel;
}

export function deleteRelationship(
  personAId: string,
  personBId: string
): boolean {
  const [a, b] = pairKey(personAId, personBId);
  const info = getDb()
    .prepare(
      "DELETE FROM relationships WHERE person_a_id = ? AND person_b_id = ?"
    )
    .run(a, b);
  return info.changes > 0;
}

// Strategies

function rowToStrategy(row: StrategyRow): Strategy {
  return {
    id: row.id,
    project_description: row.project_description,
    options: JSON.parse(row.options_json) as StrategyOption[],
    chosen_index: row.chosen_index,
    rating: row.rating,
    feedback: row.feedback,
    created_at: row.created_at,
    completed_at: row.completed_at,
  };
}

export function listStrategies(limit = 50): Strategy[] {
  const rows = getDb()
    .prepare("SELECT * FROM strategies ORDER BY created_at DESC LIMIT ?")
    .all(limit) as StrategyRow[];
  return rows.map(rowToStrategy);
}

export function getStrategy(id: string): Strategy | undefined {
  const row = getDb()
    .prepare("SELECT * FROM strategies WHERE id = ?")
    .get(id) as StrategyRow | undefined;
  return row ? rowToStrategy(row) : undefined;
}

export function createStrategy(input: {
  project_description: string;
  options: StrategyOption[];
}): Strategy {
  const strategy: Strategy = {
    id: uuid(),
    project_description: input.project_description,
    options: input.options,
    chosen_index: null,
    rating: null,
    feedback: null,
    created_at: Date.now(),
    completed_at: null,
  };
  getDb()
    .prepare(
      `INSERT INTO strategies
       (id, project_description, options_json, chosen_index, rating, feedback, created_at, completed_at)
       VALUES (@id, @project_description, @options_json, @chosen_index, @rating, @feedback, @created_at, @completed_at)`
    )
    .run({
      id: strategy.id,
      project_description: strategy.project_description,
      options_json: JSON.stringify(strategy.options),
      chosen_index: strategy.chosen_index,
      rating: strategy.rating,
      feedback: strategy.feedback,
      created_at: strategy.created_at,
      completed_at: strategy.completed_at,
    });
  return strategy;
}

export function rateStrategy(
  id: string,
  chosenIndex: number,
  rating: number,
  feedback: string
): Strategy | undefined {
  const existing = getStrategy(id);
  if (!existing) return undefined;
  getDb()
    .prepare(
      `UPDATE strategies
       SET chosen_index = ?, rating = ?, feedback = ?, completed_at = ?
       WHERE id = ?`
    )
    .run(chosenIndex, rating, feedback, Date.now(), id);
  return getStrategy(id);
}

export function listCompletedStrategies(limit = 20): Strategy[] {
  const rows = getDb()
    .prepare(
      "SELECT * FROM strategies WHERE rating IS NOT NULL ORDER BY completed_at DESC LIMIT ?"
    )
    .all(limit) as StrategyRow[];
  return rows.map(rowToStrategy);
}

// Projects

export function listProjects(): Project[] {
  return getDb()
    .prepare("SELECT * FROM projects ORDER BY created_at DESC")
    .all() as Project[];
}

export function getProject(id: string): Project | undefined {
  return getDb().prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | Project
    | undefined;
}

export function createProject(input: {
  name: string;
  description?: string;
}): Project {
  const project: Project = {
    id: uuid(),
    name: input.name,
    description: input.description ?? "",
    created_at: Date.now(),
  };
  getDb()
    .prepare(
      `INSERT INTO projects (id, name, description, created_at)
       VALUES (@id, @name, @description, @created_at)`
    )
    .run(project);
  return project;
}

export function updateProject(
  id: string,
  patch: Partial<Omit<Project, "id" | "created_at">>
): Project | undefined {
  const existing = getProject(id);
  if (!existing) return undefined;
  const merged = { ...existing, ...patch, id };
  getDb()
    .prepare(
      `UPDATE projects SET name = @name, description = @description WHERE id = @id`
    )
    .run(merged);
  return merged;
}

export function deleteProject(id: string): boolean {
  const info = getDb().prepare("DELETE FROM projects WHERE id = ?").run(id);
  return info.changes > 0;
}

// Project files

export function listProjectFiles(projectId: string): ProjectFile[] {
  return getDb()
    .prepare(
      "SELECT * FROM project_files WHERE project_id = ? ORDER BY created_at DESC"
    )
    .all(projectId) as ProjectFile[];
}

export function listAllFiles(): ProjectFile[] {
  return getDb()
    .prepare("SELECT * FROM project_files ORDER BY created_at DESC")
    .all() as ProjectFile[];
}

export function getProjectFile(id: string): ProjectFile | undefined {
  return getDb()
    .prepare("SELECT * FROM project_files WHERE id = ?")
    .get(id) as ProjectFile | undefined;
}

export function createProjectFile(input: {
  project_id: string;
  name: string;
  notes?: string;
  storage_path?: string | null;
  original_filename?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
}): ProjectFile {
  const file: ProjectFile = {
    id: uuid(),
    project_id: input.project_id,
    name: input.name,
    notes: input.notes ?? "",
    storage_path: input.storage_path ?? null,
    original_filename: input.original_filename ?? null,
    mime_type: input.mime_type ?? null,
    size_bytes: input.size_bytes ?? null,
    created_at: Date.now(),
  };
  getDb()
    .prepare(
      `INSERT INTO project_files
       (id, project_id, name, notes, storage_path, original_filename, mime_type, size_bytes, created_at)
       VALUES (@id, @project_id, @name, @notes, @storage_path, @original_filename, @mime_type, @size_bytes, @created_at)`
    )
    .run(file);
  return file;
}

export function updateProjectFile(
  id: string,
  patch: { name?: string; notes?: string }
): ProjectFile | undefined {
  const existing = getProjectFile(id);
  if (!existing) return undefined;
  const merged = { ...existing, ...patch };
  getDb()
    .prepare(`UPDATE project_files SET name = @name, notes = @notes WHERE id = @id`)
    .run(merged);
  return merged;
}

export function deleteProjectFile(id: string): ProjectFile | undefined {
  const existing = getProjectFile(id);
  if (!existing) return undefined;
  getDb().prepare("DELETE FROM project_files WHERE id = ?").run(id);
  return existing;
}
