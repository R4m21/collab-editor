// ── REGISTER TSX LOADER FIRST (To parse client.ts smoothly) ──
require("tsx/cjs");

// Load .env from parent directory
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

const { Server } = require("@hocuspocus/server");
const Y = require("yjs");

const clientPath = path.join(
  __dirname,
  "..",
  "lib",
  "generated",
  "prisma",
  "client",
);
const { PrismaClient } = require(clientPath);
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "[WS] ✗ CRITICAL: DATABASE_URL is missing in environment variables!",
  );
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PORT = parseInt(process.env.WS_PORT ?? "1234", 10);

const server = new Server({
  port: PORT,
  name: "collab-editor-ws",

  // Client authentication handshake tracking
  async onAuthenticate(data) {
    const { documentName } = data;

    const doc = await prisma.document.findUnique({
      where: { id: documentName },
      select: { id: true },
    });

    if (!doc) {
      throw new Error("Document not found");
    }

    return { documentId: documentName };
  },

  // Load baseline byte streams from Postgres DB
  async onLoadDocument(data) {
    const { documentName } = data;
    console.log(`[WS] Loading document structural state: ${documentName}`);

    try {
      const doc = await prisma.document.findUnique({
        where: { id: documentName },
        select: { content: true },
      });

      if (doc?.content) {
        return new Uint8Array(doc.content);
      }
    } catch (err) {
      console.error("[WS] Error loading document context layer:", err);
    }
  },

  // Commit dynamic realtime state changes periodically
  async onStoreDocument(data) {
    const { documentName, document } = data;
    console.log(`[WS] Committing binary buffer data: ${documentName}`);

    try {
      const state = Y.encodeStateAsUpdate(document);
      await prisma.document.update({
        where: { id: documentName },
        data: {
          content: Buffer.from(state),
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      console.error("[WS] Storage layer write error state:", err);
    }
  },

  async onConnect(data) {
    console.log(`[WS] Active sync bridge established: ${data.documentName}`);
  },

  async onDisconnect(data) {
    console.log(`[WS] Stream link termination: ${data.documentName}`);
  },
});

// Run server using official listen callback
server
  .listen()
  .then(() => {
    console.log(`[WS] ✓ Hocuspocus running on ws://localhost:${PORT}`);
  })
  .catch((err) => {
    console.error("[WS] Fatal error state initialization:", err);
    process.exit(1);
  });

// Clean memory execution closure hooks
process.on("SIGINT", async () => {
  console.log("\n[WS] Safe exit lifecycle sequence initialization...");
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
});
