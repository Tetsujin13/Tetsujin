const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'topgato.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT ''
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      user_handle TEXT NOT NULL,
      stance TEXT NOT NULL,
      confidence INTEGER DEFAULT 50,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    )
  `);
});

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function ensureSubject({ slug, title, description = '' }) {
  const normalizedSlug = slug.trim().toLowerCase();
  const subject = await getAsync('SELECT * FROM subjects WHERE slug = ?', [normalizedSlug]);
  if (subject) {
    if ((title && title !== subject.title) || (description && description !== subject.description)) {
      await runAsync('UPDATE subjects SET title = ?, description = ? WHERE id = ?', [title || subject.title, description || subject.description, subject.id]);
    }
    return subject.id;
  }

  const result = await runAsync(
    'INSERT INTO subjects (slug, title, description) VALUES (?, ?, ?)',
    [normalizedSlug, title, description]
  );
  return result.lastID;
}

async function saveView({ subjectSlug, subjectTitle, subjectDescription, userHandle, stance, confidence = 50 }) {
  if (!subjectSlug || !subjectTitle || !userHandle || !stance) {
    throw new Error('Missing required fields for saving a view.');
  }

  const subjectId = await ensureSubject({ slug: subjectSlug, title: subjectTitle, description: subjectDescription });
  const cappedConfidence = Math.min(100, Math.max(0, Number(confidence) || 0));

  const result = await runAsync(
    'INSERT INTO views (subject_id, user_handle, stance, confidence) VALUES (?, ?, ?, ?)',
    [subjectId, userHandle.trim(), stance.trim(), cappedConfidence]
  );

  return { id: result.lastID, subjectId };
}

async function getSubjectSummaries() {
  const subjects = await allAsync('SELECT id, slug, title, description FROM subjects ORDER BY title ASC');
  const stanceRows = await allAsync(
    `SELECT subject_id AS subjectId, stance, COUNT(*) AS count, ROUND(AVG(confidence), 1) AS avgConfidence
     FROM views
     GROUP BY subject_id, stance`
  );

  const stanceMap = new Map();
  for (const row of stanceRows) {
    if (!stanceMap.has(row.subjectId)) {
      stanceMap.set(row.subjectId, []);
    }
    stanceMap.get(row.subjectId).push({
      stance: row.stance,
      count: Number(row.count) || 0,
      avgConfidence: row.avgConfidence ? Number(row.avgConfidence) : 0
    });
  }

  return subjects.map((subject) => {
    const stances = stanceMap.get(subject.id) || [];
    const total = stances.reduce((sum, entry) => sum + entry.count, 0);
    let consensus = null;
    let consensusPercent = 0;

    if (total > 0) {
      const leader = stances.reduce(
        (best, current) => (current.count > best.count ? current : best),
        { stance: '', count: 0 }
      );
      consensus = leader.stance;
      consensusPercent = Math.round((leader.count / total) * 100);
    }

    return {
      slug: subject.slug,
      title: subject.title,
      description: subject.description,
      totalViews: total,
      consensus,
      consensusPercent,
      stances
    };
  });
}

async function getSubjectDetail(slug) {
  const subject = await getAsync('SELECT * FROM subjects WHERE slug = ?', [slug]);
  if (!subject) {
    return null;
  }

  const breakdown = await allAsync(
    `SELECT stance, COUNT(*) AS count, ROUND(AVG(confidence), 1) AS avgConfidence
     FROM views
     WHERE subject_id = ?
     GROUP BY stance
     ORDER BY count DESC, stance ASC`,
    [subject.id]
  );

  const recent = await allAsync(
    `SELECT user_handle AS userHandle, stance, confidence, created_at AS createdAt
     FROM views
     WHERE subject_id = ?
     ORDER BY created_at DESC
     LIMIT 12`,
    [subject.id]
  );

  const totalViews = breakdown.reduce((sum, row) => sum + Number(row.count), 0);
  const consensusEntry = breakdown[0] || null;
  const consensusPercent = totalViews > 0 && consensusEntry ? Math.round((consensusEntry.count / totalViews) * 100) : 0;

  return {
    slug: subject.slug,
    title: subject.title,
    description: subject.description,
    totalViews,
    consensus: consensusEntry ? consensusEntry.stance : null,
    consensusPercent,
    breakdown: breakdown.map((row) => ({
      stance: row.stance,
      count: Number(row.count),
      avgConfidence: Number(row.avgConfidence || 0)
    })),
    recent
  };
}

module.exports = {
  saveView,
  getSubjectSummaries,
  getSubjectDetail,
  ensureSubject
};
