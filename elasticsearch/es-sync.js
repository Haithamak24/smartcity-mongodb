/**
 * es-sync.js — Smart City Services Platform
 * Synchronizes service_requests from MongoDB → Elasticsearch.
 *
 * Two modes:
 *   1. Initial bulk sync  — indexes all existing requests from MongoDB
 *   2. Live sync          — listens to MongoDB Change Streams and updates
 *                           Elasticsearch in real-time as requests change
 *
 * Architecture pattern: MongoDB (source of truth) → async → Elasticsearch (search index)
 *
 * This is the pattern described in the project spec:
 *   "MongoDB remains the source of truth, while requests are indexed
 *    asynchronously into Elasticsearch for advanced search capabilities."
 *
 * Run initial sync:  node elasticsearch/es-sync.js --mode=initial
 * Run live sync:     node elasticsearch/es-sync.js --mode=live
 * Run both:          node elasticsearch/es-sync.js --mode=both (default)
 */

const { MongoClient } = require("mongodb");
const { Client: ESClient } = require("@elastic/elasticsearch");

const MONGO_URI = "mongodb://localhost:27017";
const DB_NAME = "smartcity";
const ES_NODE = "http://localhost:9200";
const INDEX_NAME = "service_requests";
const BATCH_SIZE = 100; // documents per bulk request

const mongoClient = new MongoClient(MONGO_URI);
const esClient = new ESClient({ node: ES_NODE });

// ─────────────────────────────────────────────────────────────
// DOCUMENT TRANSFORMER
// Converts a MongoDB service_request document → ES document
// Key transformation: coordinates [lng, lat] → { lat, lng }
// ─────────────────────────────────────────────────────────────
function mongoDocToESDoc(doc) {
  const [lng, lat] = doc.location?.coordinates ?? [null, null];
  return {
    requestId: doc.requestId,
    citizenId: doc.citizenId?.toString(),
    citizenName: doc.citizenName,

    // Full-text search fields
    descriptionAr: doc.descriptionAr || "",
    descriptionEn: doc.descriptionEn || "",
    addressTextAr: doc.addressTextAr || "",
    addressTextEn: doc.addressTextEn || "",

    // Faceted filter fields
    status: doc.status,
    category: doc.category,
    subcategory: doc.subcategory,
    districtId: doc.districtId,
    districtName: doc.districtName,
    assignedDepartmentId: doc.assignedDepartmentId || null,
    assignedDepartmentName: doc.assignedDepartmentName || null,
    assignedTechnicianName: doc.assignedTechnicianName || null,
    priority: doc.priority,
    isDuplicate: doc.isDuplicate || false,

    // Geo — ES expects { lat, lng }
    geoLocation: lat != null && lng != null ? { lat, lon: lng } : null,

    // Timestamps
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    resolvedAt: doc.resolvedAt || null,

    // Rating
    citizenRating: doc.citizenRating || null,
  };
}

// ─────────────────────────────────────────────────────────────
// MODE 1: INITIAL BULK SYNC
// Reads all documents from MongoDB and bulk-indexes into ES
// ─────────────────────────────────────────────────────────────
async function initialSync(db) {
  console.log("\n🔄 Starting initial bulk sync: MongoDB → Elasticsearch...");
  const collection = db.collection("service_requests");
  const cursor = collection.find({});

  let batch = [];
  let totalIndexed = 0;
  let totalErrors = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const esDoc = mongoDocToESDoc(doc);

    // Bulk API requires alternating action + document lines
    batch.push({ index: { _index: INDEX_NAME, _id: doc._id.toString() } });
    batch.push(esDoc);

    if (batch.length >= BATCH_SIZE * 2) {
      const result = await esClient.bulk({ body: batch, refresh: false });
      const errored = result.items.filter(i => i.index?.error);
      totalIndexed += result.items.length - errored.length;
      totalErrors += errored.length;
      if (errored.length > 0) console.error("   ⚠️  Bulk errors:", errored[0].index.error);
      batch = [];
      process.stdout.write(`\r   Indexed: ${totalIndexed}`);
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    const result = await esClient.bulk({ body: batch, refresh: true });
    const errored = result.items.filter(i => i.index?.error);
    totalIndexed += result.items.length - errored.length;
    totalErrors += errored.length;
  }

  // Final refresh so documents are searchable
  await esClient.indices.refresh({ index: INDEX_NAME });

  console.log(`\n✅ Initial sync complete: ${totalIndexed} indexed, ${totalErrors} errors`);
}

// ─────────────────────────────────────────────────────────────
// MODE 2: LIVE SYNC VIA CHANGE STREAMS
// Watches MongoDB for inserts/updates and keeps ES in sync
//
// Change Stream events handled:
//   insert  → index new document in ES
//   update  → update the ES document
//   replace → replace the ES document
//   delete  → remove from ES index
// ─────────────────────────────────────────────────────────────
async function liveSync(db) {
  console.log("\n👁️  Starting live Change Stream sync: MongoDB → Elasticsearch...");
  console.log("   (Press Ctrl+C to stop)\n");

  const collection = db.collection("service_requests");

  // Change stream pipeline — only watch service_requests changes
  const pipeline = [
    {
      $match: {
        operationType: { $in: ["insert", "update", "replace", "delete"] },
      },
    },
  ];

  // fullDocument: "updateLookup" fetches the full document on update
  // (by default, updates only return the changed fields)
  const changeStream = collection.watch(pipeline, {
    fullDocument: "updateLookup",
  });

  let processed = 0;

  changeStream.on("change", async (event) => {
    try {
      const docId = event.documentKey._id.toString();

      switch (event.operationType) {
        case "insert": {
          const esDoc = mongoDocToESDoc(event.fullDocument);
          await esClient.index({ index: INDEX_NAME, id: docId, document: esDoc });
          processed++;
          console.log(`   ✅ [INSERT] Indexed: ${event.fullDocument.requestId} (${processed} total)`);
          break;
        }

        case "update":
        case "replace": {
          if (!event.fullDocument) break; // shouldn't happen with updateLookup
          const esDoc = mongoDocToESDoc(event.fullDocument);
          await esClient.index({ index: INDEX_NAME, id: docId, document: esDoc });
          processed++;
          console.log(`   🔄 [UPDATE] Re-indexed: ${event.fullDocument.requestId} — new status: ${event.fullDocument.status}`);
          break;
        }

        case "delete": {
          await esClient.delete({ index: INDEX_NAME, id: docId }).catch(() => {});
          processed++;
          console.log(`   🗑️  [DELETE] Removed from ES index: ${docId}`);
          break;
        }
      }
    } catch (err) {
      console.error("   ❌ Change stream handler error:", err.message);
    }
  });

  changeStream.on("error", (err) => {
    console.error("   ❌ Change stream error:", err.message);
  });

  // Keep process alive
  return new Promise(() => {}); // resolves never — Ctrl+C to stop
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function main() {
  const mode = process.argv.find(a => a.startsWith("--mode="))?.split("=")[1] || "both";

  try {
    console.log("🔌 Connecting to MongoDB and Elasticsearch...");
    await mongoClient.connect();
    const db = mongoClient.db(DB_NAME);
    const health = await esClient.cluster.health();
    console.log("✅ MongoDB connected | Elasticsearch status:", health.status);

    if (mode === "initial" || mode === "both") {
      await initialSync(db);
    }

    if (mode === "live" || mode === "both") {
      await liveSync(db); // blocks until Ctrl+C
    }

  } catch (err) {
    if (err.message.includes("ECONNREFUSED")) {
      console.error("❌ Connection refused — is MongoDB/Elasticsearch running?");
    } else {
      console.error("❌ Sync failed:", err.message);
    }
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n\n⚡ Shutting down gracefully...");
  await mongoClient.close();
  process.exit(0);
});

main();
