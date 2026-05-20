/**
 * indexes.js — Smart City Services Platform
 * Creates all MongoDB indexes for performance-critical queries.
 * Author: Haitham
 *
 * Run: node indexes/indexes.js
 *
 * Index strategy per collection:
 *   users           — email (unique), nationalId (unique), districtId
 *   service_requests — location (2dsphere), status, category, citizenId, districtId + createdAt, text
 *   departments     — responsibleCategories, districtCoverage
 *   geopoints       — location (2dsphere), type + districtId
 *   technicians     — departmentId, isActive
 */

const { MongoClient } = require("mongodb");

const MONGO_URI = "mongodb://localhost:27017";
const DB_NAME = "smartcity";

async function createIndexes() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log("✅ Connected to MongoDB\n");

    // ─────────────────────────────────────────────────────────
    // COLLECTION: users
    // ─────────────────────────────────────────────────────────
    console.log("📌 Creating indexes on [users]...");

    // Unique email — login lookups
    await db.collection("users").createIndex(
      { email: 1 },
      { unique: true, name: "idx_users_email_unique" }
    );

    // Unique nationalId — registration deduplication
    await db.collection("users").createIndex(
      { nationalId: 1 },
      { unique: true, name: "idx_users_nationalId_unique" }
    );

    // District lookup — "users in district X" (Neo4j node sync, analytics)
    await db.collection("users").createIndex(
      { districtId: 1 },
      { name: "idx_users_districtId" }
    );

    // Leaderboard / civic score sorting
    await db.collection("users").createIndex(
      { civicScore: -1 },
      { name: "idx_users_civicScore_desc" }
    );

    console.log("   ✓ users: email (unique), nationalId (unique), districtId, civicScore\n");

    // ─────────────────────────────────────────────────────────
    // COLLECTION: service_requests  (most critical)
    // ─────────────────────────────────────────────────────────
    console.log("📌 Creating indexes on [service_requests]...");

    // 2dsphere — powers $near, $geoWithin, $geoIntersects (UC-08)
    await db.collection("service_requests").createIndex(
      { location: "2dsphere" },
      { name: "idx_requests_location_2dsphere" }
    );

    // Status — filter open/in-progress requests (dashboard)
    await db.collection("service_requests").createIndex(
      { status: 1 },
      { name: "idx_requests_status" }
    );

    // Citizen requests — "my reports" page
    await db.collection("service_requests").createIndex(
      { citizenId: 1, createdAt: -1 },
      { name: "idx_requests_citizenId_createdAt" }
    );

    // Department dashboard — all open requests for a department
    await db.collection("service_requests").createIndex(
      { assignedDepartmentId: 1, status: 1 },
      { name: "idx_requests_dept_status" }
    );

    // Compound: district + status + date — analytics and hotspot reports
    await db.collection("service_requests").createIndex(
      { districtId: 1, status: 1, createdAt: -1 },
      { name: "idx_requests_district_status_date" }
    );

    // Category + date — trend analytics (UC-05 "top issues last 30 days")
    await db.collection("service_requests").createIndex(
      { category: 1, createdAt: -1 },
      { name: "idx_requests_category_date" }
    );

    // Technician assignment — technician performance queries
    await db.collection("service_requests").createIndex(
      { assignedTechnicianId: 1, status: 1 },
      { name: "idx_requests_technician_status" }
    );

    // Duplicate detection — flagged duplicates
    await db.collection("service_requests").createIndex(
      { isDuplicate: 1 },
      { name: "idx_requests_isDuplicate" },
      { partialFilterExpression: { isDuplicate: true } }  // partial index — only indexes true values
    );

    // Text index — basic text search on description fields
    // Note: Full-text search is handled by Elasticsearch;
    // this index serves as fallback for simple MongoDB text queries.
    await db.collection("service_requests").createIndex(
      { descriptionEn: "text", descriptionAr: "text", addressTextEn: "text" },
      { name: "idx_requests_text_search", default_language: "none" }  // "none" supports Arabic
    );

    console.log("   ✓ service_requests: 2dsphere, status, citizenId+date, dept+status,");
    console.log("     district+status+date, category+date, technician+status, isDuplicate (partial), text\n");

    // ─────────────────────────────────────────────────────────
    // COLLECTION: geopoints
    // ─────────────────────────────────────────────────────────
    console.log("📌 Creating indexes on [geopoints]...");

    // 2dsphere — "find lamp posts near this coordinate"
    await db.collection("geopoints").createIndex(
      { location: "2dsphere" },
      { name: "idx_geopoints_location_2dsphere" }
    );

    // Type + district — "show all waste bins in district 4"
    await db.collection("geopoints").createIndex(
      { type: 1, districtId: 1 },
      { name: "idx_geopoints_type_district" }
    );

    // Maintenance filter — "geopoints needing maintenance"
    await db.collection("geopoints").createIndex(
      { status: 1, lastMaintenance: 1 },
      { name: "idx_geopoints_status_maintenance" }
    );

    console.log("   ✓ geopoints: location (2dsphere), type+districtId, status+lastMaintenance\n");

    // ─────────────────────────────────────────────────────────
    // COLLECTION: departments
    // ─────────────────────────────────────────────────────────
    console.log("📌 Creating indexes on [departments]...");

    // Category routing — "which department handles street_lighting?" (UC-07)
    await db.collection("departments").createIndex(
      { responsibleCategories: 1 },
      { name: "idx_departments_categories" }
    );

    // District coverage routing
    await db.collection("departments").createIndex(
      { districtCoverage: 1 },
      { name: "idx_departments_districts" }
    );

    console.log("   ✓ departments: responsibleCategories, districtCoverage\n");

    // ─────────────────────────────────────────────────────────
    // COLLECTION: technicians
    // ─────────────────────────────────────────────────────────
    console.log("📌 Creating indexes on [technicians]...");

    // Department members lookup
    await db.collection("technicians").createIndex(
      { departmentId: 1, isActive: 1 },
      { name: "idx_technicians_dept_active" }
    );

    // Performance ranking — sorted by resolved count
    await db.collection("technicians").createIndex(
      { resolvedCount: -1 },
      { name: "idx_technicians_resolvedCount_desc" }
    );

    console.log("   ✓ technicians: departmentId+isActive, resolvedCount\n");

    // ─────────────────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────────────────
    console.log("═══════════════════════════════════════════════════════");
    console.log("✅ All indexes created successfully!");
    console.log("\n📊 Index summary:");
    for (const colName of ["users", "service_requests", "geopoints", "departments", "technicians"]) {
      const indexes = await db.collection(colName).listIndexes().toArray();
      console.log(`   ${colName}: ${indexes.length - 1} custom indexes`); // -1 for default _id
    }

  } catch (err) {
    console.error("❌ Index creation failed:", err.message);
    throw err;
  } finally {
    await client.close();
  }
}

createIndexes();
