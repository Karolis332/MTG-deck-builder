import { getDb } from '@/lib/db';

export interface KnowledgeChunk {
  title: string;
  chunkText: string;
  category: string;
  source: 'edhrec' | 'mtggoldfish';
}

interface QueryKnowledgeOptions {
  searchTerms: string[];
  commander?: string;
  format?: string;
  maxResults?: number;
  sources?: Array<'edhrec' | 'mtggoldfish'>;
}

export function queryKnowledge(options: QueryKnowledgeOptions): KnowledgeChunk[] {
  const {
    searchTerms,
    maxResults = 5,
    sources = ['edhrec', 'mtggoldfish'],
  } = options;

  if (searchTerms.length === 0) return [];

  const db = getDb();
  const ftsQuery = searchTerms.map(t => `"${t.replace(/"/g, '')}"`).join(' OR ');
  const results: KnowledgeChunk[] = [];

  // Allocate results: 60% EDHREC, 40% MTGGoldfish
  const edhrecLimit = Math.ceil(maxResults * 0.6);
  const goldfishLimit = maxResults - edhrecLimit;

  // Query EDHREC knowledge
  if (sources.includes('edhrec')) {
    try {
      const rows = db.prepare(`
        SELECT ek.title, ek.chunk_text, ek.category
        FROM edhrec_knowledge_fts fts
        JOIN edhrec_knowledge ek ON fts.rowid = ek.id
        WHERE edhrec_knowledge_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `).all(ftsQuery, edhrecLimit) as Array<{ title: string; chunk_text: string; category: string }>;

      for (const row of rows) {
        results.push({
          title: row.title,
          chunkText: row.chunk_text,
          category: row.category,
          source: 'edhrec',
        });
      }
    } catch {
      // FTS5 table may not exist yet
    }
  }

  // Query MTGGoldfish knowledge
  if (sources.includes('mtggoldfish')) {
    try {
      const rows = db.prepare(`
        SELECT mk.title, mk.chunk_text, mk.category
        FROM mtggoldfish_knowledge_fts fts
        JOIN mtggoldfish_knowledge mk ON fts.rowid = mk.id
        WHERE mtggoldfish_knowledge_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `).all(ftsQuery, goldfishLimit) as Array<{ title: string; chunk_text: string; category: string }>;

      for (const row of rows) {
        results.push({
          title: row.title,
          chunkText: row.chunk_text,
          category: row.category,
          source: 'mtggoldfish',
        });
      }
    } catch {
      // FTS5 table may not exist yet
    }
  }

  return results;
}

export function formatKnowledgeForPrompt(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return '';

  const edhrecChunks = chunks.filter(c => c.source === 'edhrec');
  const goldfishChunks = chunks.filter(c => c.source === 'mtggoldfish');
  const parts: string[] = [];

  if (edhrecChunks.length > 0) {
    parts.push('EDHREC Articles:');
    for (const c of edhrecChunks) {
      parts.push(`[${c.category}] ${c.title}:\n${c.chunkText.slice(0, 400)}`);
    }
  }

  if (goldfishChunks.length > 0) {
    parts.push('MTGGoldfish Articles:');
    for (const c of goldfishChunks) {
      parts.push(`[${c.category}] ${c.title}:\n${c.chunkText.slice(0, 400)}`);
    }
  }

  return `\n═══ COMMUNITY KNOWLEDGE (relevant articles) ═══\n` + parts.join('\n---\n');
}
