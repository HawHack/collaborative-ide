import { Database } from "@hocuspocus/extension-database";
import { Logger } from "@hocuspocus/extension-logger";
import { Redis } from "@hocuspocus/extension-redis";
import { Server } from "@hocuspocus/server";
import * as Y from "yjs";

import { authenticateProjectToken } from "./auth.js";
import { getConfig } from "./config.js";
import { closeDb, fetchDocumentState, storeDocumentState, storePlainTextSnapshot } from "./db.js";
import { logger } from "./logger.js";

const config = getConfig();
const redisUrl = new URL(config.redisUrl);

const plainTextSyncTimers = new Map<string, NodeJS.Timeout>();

function schedulePlainTextSync(projectId: string, document: Y.Doc, userId?: string) {
  const existing = plainTextSyncTimers.get(projectId);
  if (existing) {
    clearTimeout(existing);
  }

  const timer = setTimeout(async () => {
    try {
      const plainText = document.getText("monaco").toString();
      await storePlainTextSnapshot(projectId, plainText, userId);
      logger.info("collab.snapshot_stored", { projectId, updatedByUserId: userId ?? null });
    } catch (error) {
      logger.error("collab.snapshot_store_failed", {
        projectId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      plainTextSyncTimers.delete(projectId);
    }
  }, 500);

  plainTextSyncTimers.set(projectId, timer);
}

const server = new Server({
  name: config.serverName,
  port: config.port,
  timeout: 30000,
  debounce: 1000,
  maxDebounce: 4000,
  extensions: [
    new Logger(),
    new Redis({
      host: redisUrl.hostname,
      port: Number(redisUrl.port || "6379"),
      password: redisUrl.password || undefined,
    }),
    new Database({
      fetch: async ({ documentName }: { documentName: string }) => {
        return fetchDocumentState(documentName);
      },
      store: async ({ documentName, state }: { documentName: string; state: Uint8Array }) => {
        await storeDocumentState(documentName, state);
      },
    }),
  ],

  async onAuthenticate(data: any) {
    const auth = await authenticateProjectToken(data.token, data.documentName);
    logger.info("collab.authenticated", {
      projectId: data.documentName,
      userId: auth.userId,
      socketId: data.socketId,
    });

    return {
      userId: auth.userId,
      email: auth.email,
    };
  },

  async onConnect(data: any) {
    logger.info("collab.connected", {
      projectId: data.documentName,
      socketId: data.socketId,
    });
  },

  async onAwarenessUpdate(data: any) {
    logger.info("collab.awareness_update", {
      projectId: data.documentName,
      added: data.added?.length ?? 0,
      updated: data.updated?.length ?? 0,
      removed: data.removed?.length ?? 0,
      clientsCount: data.clientsCount ?? 0,
    });
  },

  async onChange(data: any) {
    schedulePlainTextSync(data.documentName, data.document, data.context?.userId);
  },

  async onDisconnect(data: any) {
    logger.info("collab.disconnected", {
      projectId: data.documentName,
      socketId: data.socketId,
      userId: data.context?.userId ?? null,
    });
  },

  async onStoreDocument(data: any) {
    logger.info("collab.document_stored", {
      projectId: data.documentName,
      clientsCount: data.clientsCount ?? 0,
    });
  },

  async onListen(data: any) {
    logger.info("collab.listening", {
      port: data.port,
      serverName: config.serverName,
    });
  },

  async onDestroy() {
    await closeDb();
    logger.info("collab.destroyed");
  },
});

server.listen();