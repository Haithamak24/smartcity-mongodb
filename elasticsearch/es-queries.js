/**
 * es-queries.js — Smart City Services Platform
 * Demonstrates Elasticsearch full-text search queries.
 * Author: Haitham
 *
 * Query examples:
 *   1. Full-text search — citizen searches "water leaking near market"
 *   2. Fuzzy match — typo-tolerant search ("سرب مياه" instead of "تسرب مياه")
 *   3. Faceted search — filter by category + district + status
 *   4. Duplicate detection — find semantically similar nearby reports
 *   5. Multi-language — Arabic + English mixed query
 *   6. Geo + text combined — "broken lamp near University Zone"
 *   7. Autocomplete — search-as-you-type on addresses
 *
 * Run: node elasticsearch/es-queries.js
 */

const { Client } = require("@elastic/elasticsearch");

const ES_NODE = "http://localhost:9200";
const INDEX_NAME = "service_requests";

const client = new Client({ node: ES_NODE });

// ─────────────────────────────────────────────────────────────
// QUERY 1: Full-Text Search
// Citizen searches: "water leaking from the ground near the central market"
// ES finds related reports even with different wording:
// → "sewage overflow", "drainage issue", "water gushing"
// ─────────────────────────────────────────────────────────────
const queryFullTextSearch = {
  query: {
    multi_match: {
      query: "water leaking from the ground near the central market",
      fields: [
        "descriptionEn^3",  // boost English descriptions (^3 = 3x weight)
        "descriptionAr^3",
        "addressTextEn^2",
        "addressTextAr^2",
      ],
      fuzziness: "AUTO",      // auto-adjusts fuzzy matching based on word length
      operator: "or",         // match any of the words (broad recall)
      minimum_should_match: "30%", // at least 30% of terms must match
    },
  },
  // Highlight matching terms in the response
  highlight: {
    fields: {
      descriptionEn: {},
      descriptionAr: {},
    },
  },
  size: 5,
};

// ─────────────────────────────────────────────────────────────
// QUERY 2: Fuzzy Arabic Search
// Citizen types "سرب مياه" (missing the "ت") — typo for "تسرب مياه"
// Elasticsearch fuzzy matching catches this
// ─────────────────────────────────────────────────────────────
const queryFuzzyArabic = {
  query: {
    match: {
      descriptionAr: {
        query: "سرب مياه بالقرب من السوق",  // intentional typo: missing ت
        fuzziness: 1,   // allow 1 character edit distance
        operator: "or",
      },
    },
  },
  size: 5,
};

// ─────────────────────────────────────────────────────────────
// QUERY 3: Faceted Search
// City planner: "Show me all OPEN waste reports in District 4"
// Uses a bool query: text + filters (keyword fields)
// ─────────────────────────────────────────────────────────────
const queryFacetedSearch = {
  query: {
    bool: {
      must: [
        // Free-text on description
        { match: { descriptionEn: "overflowing" } },
      ],
      filter: [
        // Exact filters (keyword fields) — do NOT affect relevance score
        { term: { status: "OPEN" } },
        { term: { category: "waste" } },
        { term: { districtId: "district_4" } },
        // Date range — last 14 days
        {
          range: {
            createdAt: {
              gte: "now-14d/d",
              lte: "now/d",
            },
          },
        },
      ],
    },
  },
  // Aggregations for facet counts (side-panel filters in UI)
  aggs: {
    by_category: { terms: { field: "category", size: 10 } },
    by_status: { terms: { field: "status", size: 10 } },
    by_district: { terms: { field: "districtId", size: 10 } },
    by_priority: { terms: { field: "priority", size: 5 } },
  },
  size: 10,
};

// ─────────────────────────────────────────────────────────────
// QUERY 4: Duplicate Detection
// Before a citizen submits a new report, check if a similar report
// already exists nearby with similar text.
// Uses a more_like_this query to find semantically similar documents.
// ─────────────────────────────────────────────────────────────
const queryDuplicateDetection = {
  query: {
    bool: {
      must: [
        // Find reports with similar text
        {
          more_like_this: {
            fields: ["descriptionEn", "descriptionAr", "addressTextEn"],
            like: "Water leaking from the ground near the central market, gushing through the pavement",
            min_term_freq: 1,
            max_query_terms: 12,
            min_doc_freq: 1,
          },
        },
      ],
      filter: [
        // Only active (non-resolved) reports
        { terms: { status: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } },
        // Within same category
        { term: { category: "water" } },
        // Geographic filter — within 500m of the reported coordinates
        {
          geo_distance: {
            distance: "500m",
            geoLocation: { lat: 31.9010, lon: 35.2050 },
          },
        },
      ],
    },
  },
  // Show similarity score so we can set a threshold
  min_score: 0.5,
  size: 3,
};

// ─────────────────────────────────────────────────────────────
// QUERY 5: Multi-Language Mixed Query
// Citizen writes in a mix of Arabic and English:
// "there's رائحة كريهة near the school on البيرة street"
// ─────────────────────────────────────────────────────────────
const queryMixedLanguage = {
  query: {
    bool: {
      should: [
        // Arabic terms match Arabic fields
        {
          match: {
            descriptionAr: {
              query: "رائحة كريهة بالقرب من المدرسة",
              boost: 2,
            },
          },
        },
        // English terms match English fields
        {
          match: {
            descriptionEn: {
              query: "foul smell near school",
              boost: 2,
            },
          },
        },
        // Address search in both languages
        { match: { addressTextEn: { query: "bireh street school", boost: 1.5 } } },
        { match: { addressTextAr: { query: "شارع البيرة المدرسة", boost: 1.5 } } },
      ],
      minimum_should_match: 1,
    },
  },
  highlight: {
    fields: {
      descriptionAr: { pre_tags: ["<b>"], post_tags: ["</b>"] },
      descriptionEn: { pre_tags: ["<b>"], post_tags: ["</b>"] },
    },
  },
  size: 5,
};

// ─────────────────────────────────────────────────────────────
// QUERY 6: Geo + Full-Text Combined
// "Find unresolved broken lamp reports within 1km of University Street"
// ─────────────────────────────────────────────────────────────
const queryGeoAndText = {
  query: {
    bool: {
      must: [
        { match: { descriptionEn: { query: "broken lamp flickering light", operator: "or" } } },
      ],
      filter: [
        { terms: { status: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } },
        { term: { category: "street_lighting" } },
        {
          geo_distance: {
            distance: "1km",
            geoLocation: { lat: 31.9085, lon: 35.2160 }, // University Street coords
          },
        },
      ],
    },
  },
  size: 10,
};

// ─────────────────────────────────────────────────────────────
// QUERY 7: Search-As-You-Type (Autocomplete)
// User types "شارع ال" → ES suggests matching addresses
// Uses the edge_ngram autocomplete analyzer defined in the mapping
// ─────────────────────────────────────────────────────────────
const queryAutocomplete = {
  query: {
    match: {
      "addressTextEn.autocomplete": {
        query: "Al-Bireh Ma", // partial input — user still typing
        operator: "and",
      },
    },
  },
  // Only return fields needed for the dropdown
  _source: ["requestId", "addressTextEn", "addressTextAr", "category", "status"],
  size: 5,
};

// ─────────────────────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────────────────────
async function runSearchQueries() {
  try {
    console.log("🔌 Connecting to Elasticsearch at", ES_NODE);
    const health = await client.cluster.health();
    console.log("✅ Cluster status:", health.status, "\n");

    // Helper: run a query and print results
    async function runQuery(name, query) {
      console.log(`═══ ${name} ═══`);
      try {
        const result = await client.search({ index: INDEX_NAME, body: query });
        const hits = result.hits.hits;
        console.log(`   Found: ${result.hits.total.value} results`);
        hits.slice(0, 3).forEach(hit => {
          const src = hit._source;
          console.log(`   [score: ${hit._score?.toFixed(2)}] ${src.requestId} | ${src.category} | ${src.status}`);
          if (hit.highlight) {
            const hl = Object.values(hit.highlight).flat()[0];
            console.log(`     Highlight: ${hl?.replace(/<\/?b>/g, "*")}`);
          }
        });
        if (result.aggregations) {
          console.log("   Facets:");
          Object.entries(result.aggregations).forEach(([key, val]) => {
            const buckets = val.buckets?.slice(0, 3) || [];
            console.log(`     ${key}: ${buckets.map(b => `${b.key}(${b.doc_count})`).join(", ")}`);
          });
        }
      } catch (err) {
        console.log("   ⚠️  Query error:", err.message.split("\n")[0]);
      }
      console.log();
    }

    await runQuery("Q1: Full-Text — 'water leaking near central market'", queryFullTextSearch);
    await runQuery("Q2: Fuzzy Arabic — 'سرب مياه' (typo for تسرب)", queryFuzzyArabic);
    await runQuery("Q3: Faceted — OPEN waste reports in District 4", queryFacetedSearch);
    await runQuery("Q4: Duplicate Detection — similar water report nearby", queryDuplicateDetection);
    await runQuery("Q5: Mixed Arabic/English — 'رائحة كريهة near school'", queryMixedLanguage);
    await runQuery("Q6: Geo + Text — broken lamp within 1km of University St", queryGeoAndText);
    await runQuery("Q7: Autocomplete — 'Al-Bireh Ma...'", queryAutocomplete);

    console.log("🎉 All Elasticsearch queries executed!");
    console.log("\n💡 Why Elasticsearch matters for this platform:");
    console.log("   • Citizens write descriptions in Arabic, English, and mixed");
    console.log("   • Free-text reports contain varied vocabulary for the same problem");
    console.log("     ('sewage overflow' = 'blocked drain' = 'foul smell from ground')");
    console.log("   • Duplicate detection prevents duplicate requests from being filed");
    console.log("   • Faceted filtering lets city managers explore data interactively");
    console.log("   • MongoDB text index cannot handle fuzzy matching or Arabic normalization");

  } catch (err) {
    if (err.message.includes("ECONNREFUSED")) {
      console.error("❌ Cannot connect to Elasticsearch at", ES_NODE);
      console.error("   Run: docker run -p 9200:9200 -e 'discovery.type=single-node' elasticsearch:8.12.0");
    } else {
      console.error("❌ Error:", err.message);
    }
  }
}

runSearchQueries();
