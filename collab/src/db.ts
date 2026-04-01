import { Pool } from "pg";
import * as Y from "yjs";

import { getConfig } from "./config.js";

const config = getConfig();

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export async function assertProjectAccess(projectId: string, userId: string): Promise<void> {
  const result = await pool.query(
    `
      SELECT p.id
      FROM projects p
      LEFT JOIN project_members pm
        ON pm.project_id = p.id
      WHERE p.id = $1
        AND (p.owner_id = $2 OR pm.user_id = $2)
      LIMIT 1
    `,
    [projectId, userId]
  );

  if (result.rowCount === 0) {
    throw new Error("Project access denied.");
  }
}

export async function fetchDocumentState(projectId: string): Promise<Uint8Array | null> {
  const result = await pool.query<{
    ydoc_state: Buffer | null;
    plain_text: string | null;
  }>(
    `
      SELECT ydoc_state, plain_text
      FROM project_documents
      WHERE project_id = $1
      LIMIT 1
    `,
    [projectId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  if (row.ydoc_state) {
    return new Uint8Array(row.ydoc_state);
  }

  if (row.plain_text) {
    const doc = new Y.Doc();
    doc.getText("monaco").insert(0, row.plain_text);
    return Y.encodeStateAsUpdate(doc);
  }

  return null;
}

export async function storeDocumentState(projectId: string, state: Uint8Array): Promise<void> {
  await pool.query(
    `
      INSERT INTO project_documents (project_id, ydoc_state, last_synced_at, plain_text)
      VALUES ($1, $2, NOW(), COALESCE((SELECT plain_text FROM project_documents WHERE project_id = $1), ''))
      ON CONFLICT (project_id) DO UPDATE
      SET ydoc_state = EXCLUDED.ydoc_state,
          last_synced_at = NOW()
    `,
    [projectId, Buffer.from(state)]
  );
}

export async function storePlainTextSnapshot(
  projectId: string,
  plainText: string,
  updatedByUserId?: string
): Promise<void> {
  await pool.query(
    `
      INSERT INTO project_documents (project_id, plain_text, last_synced_at, updated_by_user_id)
      VALUES ($1, $2, NOW(), $3)
      ON CONFLICT (project_id) DO UPDATE
      SET plain_text = EXCLUDED.plain_text,
          updated_by_user_id = EXCLUDED.updated_by_user_id,
          last_synced_at = NOW()
    `,
    [projectId, plainText, updatedByUserId ?? null]
  );
}

export async function closeDb(): Promise<void> {
  await pool.end();
}