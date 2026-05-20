/**
 * es-mapping.js — Smart City Services Platform
 * Sets up the Elasticsearch index with proper mapping for service_requests.
 * Author: Haitham
 *
 * Architecture: MongoDB is the source of truth.
 *               Requests are indexed asynchronously into Elasticsearch
 *               for advanced full-text and semantic search.
 *
 * Why Elasticsearch replaces Cassandra here:
 *   - Cassandra would store time-series event logs (wide-column, append-only)
 *   - But our platform's real unmet need is *search*:
 *       Citizens write free-text descriptions like "رائحة كريهة بالقرب من المدرسة"
 *       or "water leaking from the ground near the market"
 *   - None of MongoDB, Redis, or Neo4j handles this kind of fuzzy,
 *     bilingual, ranked full-text search well
 *   - Elasticsearch provides: full-text search, fuzzy matching (typos),
 *     Arabic analyzer, faceted filtering, and relevance scoring
 *
 * Run: node elasticsearch/es-mapping.js
 *
 * Prerequisites:
 *   npm install @elastic/elasticsearch
 *   Elasticsearch running on localhost:9200
 */

const { Client } = require("@elastic/elasticsearch");

const ES_NODE = "http://localhost:9200";
const INDEX_NAME = "service_requests";

const client = new Client({ node: ES_NODE });

// ─────────────────────────────────────────────────────────────
// INDEX SETTINGS & MAPPINGS
// ─────────────────────────────────────────────────────────────
const indexConfig = {
  settings: {
    number_of_shards: 1,   // single node for development; increase for production
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        // Arabic + English mixed-input analyzer
        // Handles: "water leak near السوق" or "تسرب مياه near market"
        arabic_english_analyzer: {
          type: "custom",
          tokenizer: "standard",
          filter: [
            "lowercase",
            "arabic_normalization",  // normalizes Arabic characters (alef/hamza variations)
            "arabic_stop",           // removes Arabic stop words
            "english_stop",          // removes English stop words
            "asciifolding",          // converts é → e, ü → u etc.
          ],
        },
        // Autocomplete analyzer — for search-as-you-type
        autocomplete_analyzer: {
          type: "custom",
          tokenizer: "standard",
          filter: ["lowercase", "edge_ngram_filter"],
        },
      },
      filter: {
        arabic_stop: { type: "stop", stopwords: "_arabic_" },
        english_stop: { type: "stop", stopwords: "_english_" },
        edge_ngram_filter: { type: "edge_ngram", min_gram: 2, max_gram: 20 },
      },
    },
  },

  mappings: {
    properties: {
      // ── Identity ──────────────────────────────────────────
      requestId: { type: "keyword" },                          // exact match
      citizenId: { type: "keyword" },
      citizenName: { type: "keyword" },

      // ── Full-text search fields ───────────────────────────
      // These are the core Elasticsearch value-add:
      descriptionAr: {
        type: "text",
        analyzer: "arabic_english_analyzer",
        fields: {
          // Stored as keyword too for aggregations/sorting
          keyword: { type: "keyword", ignore_above: 512 },
        },
      },
      descriptionEn: {
        type: "text",
        analyzer: "arabic_english_analyzer",  // handles both languages
        fields: {
          keyword: { type: "keyword", ignore_above: 512 },
        },
      },
      addressTextEn: {
        type: "text",
        analyzer: "arabic_english_analyzer",
        fields: {
          // Autocomplete support for address search
          autocomplete: { type: "text", analyzer: "autocomplete_analyzer" },
        },
      },
      addressTextAr: {
        type: "text",
        analyzer: "arabic_english_analyzer",
      },

      // ── Faceted filtering fields ──────────────────────────
      // These are keyword so they can be used in aggregations/filters
      status: { type: "keyword" },
      category: { type: "keyword" },
      subcategory: { type: "keyword" },
      districtId: { type: "keyword" },
      districtName: { type: "keyword" },
      assignedDepartmentId: { type: "keyword" },
      priority: { type: "integer" },
      isDuplicate: { type: "boolean" },

      // ── Geospatial (Elasticsearch geo_point) ─────────────
      // NOTE: Mongo uses [lng, lat] but ES uses { lat, lng } object
      geoLocation: { type: "geo_point" },

      // ── Timestamps (for date-range filters) ──────────────
      createdAt: { type: "date" },
      updatedAt: { type: "date" },
      resolvedAt: { type: "date" },

      // ── Ratings ──────────────────────────────────────────
      citizenRating: { type: "integer" },

      // ── Denormalized for search display ──────────────────
      assignedDepartmentName: { type: "keyword" },
      assignedTechnicianName: { type: "keyword" },
    },
  },
};

// ─────────────────────────────────────────────────────────────
// SETUP FUNCTION
// ─────────────────────────────────────────────────────────────
async function setupElasticsearchIndex() {
  try {
    console.log("🔌 Connecting to Elasticsearch at", ES_NODE, "...");

    // Check connection
    const health = await client.cluster.health();
    console.log("✅ Elasticsearch cluster status:", health.status, "\n");

    // Delete existing index if it exists (clean setup)
    const exists = await client.indices.exists({ index: INDEX_NAME });
    if (exists) {
      await client.indices.delete({ index: INDEX_NAME });
      console.log(`🗑️  Deleted existing index: ${INDEX_NAME}`);
    }

    // Create the index
    await client.indices.create({ index: INDEX_NAME, body: indexConfig });
    console.log(`✅ Created index: ${INDEX_NAME}`);

    // Verify the mapping
    const mapping = await client.indices.getMapping({ index: INDEX_NAME });
    const fields = Object.keys(mapping[INDEX_NAME].mappings.properties);
    console.log(`📋 Mapped fields (${fields.length}):`, fields.join(", "));

    console.log("\n🎉 Elasticsearch index setup complete!");
    console.log("   Next step: run es-sync.js to populate from MongoDB");

  } catch (err) {
    if (err.message.includes("ECONNREFUSED")) {
      console.error("❌ Cannot connect to Elasticsearch at", ES_NODE);
      console.error("   Make sure Elasticsearch is running: docker run -p 9200:9200 elasticsearch:8.12.0");
    } else {
      console.error("❌ Setup failed:", err.message);
    }
  }
}

setupElasticsearchIndex();
