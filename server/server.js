/**
 * server.js — Smart City Services Platform
 * Express API connecting React frontend to MongoDB + Elasticsearch.
 * Author: Haitham
 *
 * Run: node server/server.js
 * API base: http://localhost:3001/api
 */

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const { Client: ESClient } = require("@elastic/elasticsearch");

const app = express();
const PORT = 3001;
const MONGO_URI = "mongodb://localhost:27017";
const DB_NAME = "smartcity";
const ES_NODE = "http://localhost:9200";
const ES_INDEX = "service_requests";

app.use(cors());
app.use(express.json());

let db;
const esClient = new ESClient({ node: ES_NODE });

// ─────────────────────────────────────────────────────────────
// CONNECT TO MONGODB
// ─────────────────────────────────────────────────────────────
async function connectMongo() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log("✅ MongoDB connected:", DB_NAME);
}

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /api/stats  — dashboard counters
// ─────────────────────────────────────────────────────────────
app.get("/api/stats", async (req, res) => {
  try {
    const col = db.collection("service_requests");
    const [total, open, inProgress, resolved, users, depts] = await Promise.all([
      col.countDocuments(),
      col.countDocuments({ status: "OPEN" }),
      col.countDocuments({ status: { $in: ["ASSIGNED", "IN_PROGRESS"] } }),
      col.countDocuments({ status: { $in: ["RESOLVED", "CLOSED"] } }),
      db.collection("users").countDocuments(),
      db.collection("departments").countDocuments(),
    ]);
    res.json({ total, open, inProgress, resolved, users, depts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /api/requests  — list with optional filters
// Query params: status, category, district, limit (default 20)
// ─────────────────────────────────────────────────────────────
app.get("/api/requests", async (req, res) => {
  try {
    const { status, category, district, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== "ALL") filter.status = status;
    if (category && category !== "ALL") filter.category = category;
    if (district && district !== "ALL") filter.districtId = district;

    const requests = await db.collection("service_requests")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .project({
        requestId: 1, citizenName: 1, category: 1, subcategory: 1,
        status: 1, priority: 1, districtName: 1, districtId: 1,
        descriptionEn: 1, descriptionAr: 1, location: 1,
        assignedDepartmentName: 1, assignedTechnicianName: 1,
        createdAt: 1, updatedAt: 1, resolvedAt: 1, citizenRating: 1,
        isDuplicate: 1, statusHistory: 1,
      })
      .toArray();

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /api/requests/:id  — single request with full timeline
// ─────────────────────────────────────────────────────────────
app.get("/api/requests/:requestId", async (req, res) => {
  try {
    const request = await db.collection("service_requests").findOne(
      { requestId: req.params.requestId }
    );
    if (!request) return res.status(404).json({ error: "Not found" });
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /api/search  — Elasticsearch full-text search
// Query params: q (text), category, status, district
// ─────────────────────────────────────────────────────────────
app.get("/api/search", async (req, res) => {
  try {
    const { q, category, status, district } = req.query;

    if (!q || !q.trim()) {
      return res.json({ hits: [], total: 0 });
    }

    const must = [
      {
        multi_match: {
          query: q,
          fields: ["descriptionEn^3", "descriptionAr^3", "addressTextEn^2", "addressTextAr^2", "subcategory"],
          fuzziness: "AUTO",
          operator: "or",
        },
      },
    ];

    const filter = [];
    if (category && category !== "ALL") filter.push({ term: { category } });
    if (status && status !== "ALL") filter.push({ term: { status } });
    if (district && district !== "ALL") filter.push({ term: { districtId: district } });

    const result = await esClient.search({
      index: ES_INDEX,
      body: {
        query: { bool: { must, filter } },
        highlight: {
          fields: {
            descriptionEn: { pre_tags: ["__HL__"], post_tags: ["__/HL__"] },
            descriptionAr: { pre_tags: ["__HL__"], post_tags: ["__/HL__"] },
          },
        },
        size: 10,
      },
    });

    const hits = result.hits.hits.map((h) => ({
      ...h._source,
      _score: h._score,
      _highlight: h.highlight,
    }));

    res.json({ hits, total: result.hits.total.value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /api/map  — geo data for map view
// Returns all non-resolved requests with coordinates
// ─────────────────────────────────────────────────────────────
app.get("/api/map", async (req, res) => {
  try {
    const requests = await db.collection("service_requests")
      .find(
        { location: { $exists: true } },
        {
          projection: {
            requestId: 1, category: 1, subcategory: 1, status: 1,
            priority: 1, districtName: 1, location: 1,
            descriptionEn: 1, citizenName: 1, createdAt: 1,
          },
        }
      )
      .toArray();

    const geopoints = await db.collection("geopoints")
      .find({}, { projection: { pointId: 1, nameAr: 1, type: 1, location: 1, status: 1 } })
      .toArray();

    res.json({ requests, geopoints });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /api/analytics  — aggregation pipeline results
// ─────────────────────────────────────────────────────────────
app.get("/api/analytics", async (req, res) => {
  try {
    const col = db.collection("service_requests");

    const [categories, deptStats, heatmap, resolutionTime, hourlyStats] = await Promise.all([

      // Top categories last 30 days
      col.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, status: { $nin: ["REJECTED"] } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray(),

      // Department workload
      col.aggregate([
        { $match: { assignedDepartmentId: { $ne: null } } },
        {
          $group: {
            _id: { id: "$assignedDepartmentId", name: "$assignedDepartmentName" },
            open: { $sum: { $cond: [{ $in: ["$status", ["OPEN", "ASSIGNED", "IN_PROGRESS"]] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } },
          },
        },
        { $project: { _id: 0, dept: "$_id.name", open: 1, resolved: 1 } },
        { $sort: { open: -1 } },
      ]).toArray(),

      // Heatmap clusters
      col.aggregate([
        { $match: { status: { $nin: ["RESOLVED", "CLOSED", "REJECTED"] } } },
        {
          $project: {
            category: 1,
            districtName: 1,
            lat: { $round: [{ $arrayElemAt: ["$location.coordinates", 1] }, 3] },
            lng: { $round: [{ $arrayElemAt: ["$location.coordinates", 0] }, 3] },
          },
        },
        { $group: { _id: { lat: "$lat", lng: "$lng", district: "$districtName" }, count: { $sum: 1 }, categories: { $addToSet: "$category" } } },
        { $project: { _id: 0, lat: "$_id.lat", lng: "$_id.lng", district: "$_id.district", count: 1, categories: 1 } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]).toArray(),

      // Resolution time per dept
      col.aggregate([
        { $match: { status: { $in: ["RESOLVED", "CLOSED"] }, resolvedAt: { $ne: null }, assignedDepartmentId: { $ne: null } } },
        { $project: { assignedDepartmentName: 1, resolutionHours: { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 3600000] } } },
        { $group: { _id: "$assignedDepartmentName", avgHours: { $avg: "$resolutionHours" }, count: { $sum: 1 } } },
        { $project: { _id: 0, dept: "$_id", avgHours: { $round: ["$avgHours", 1] }, count: 1 } },
        { $sort: { avgHours: 1 } },
      ]).toArray(),

      // Submissions by hour
      col.aggregate([
        { $project: { hour: { $hour: "$createdAt" } } },
        { $group: { _id: "$hour", count: { $sum: 1 } } },
        { $project: { _id: 0, hour: "$_id", count: 1 } },
        { $sort: { hour: 1 } },
      ]).toArray(),
    ]);

    res.json({ categories, deptStats, heatmap, resolutionTime, hourlyStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE: GET /api/departments  — for filter dropdowns
// ─────────────────────────────────────────────────────────────
app.get("/api/departments", async (req, res) => {
  try {
    const depts = await db.collection("departments")
      .find({}, { projection: { _id: 1, nameEn: 1 } })
      .toArray();
    res.json(depts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────
connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 API server running at http://localhost:${PORT}`);
    console.log(`   Endpoints:`);
    console.log(`   GET /api/stats`);
    console.log(`   GET /api/requests`);
    console.log(`   GET /api/requests/:id`);
    console.log(`   GET /api/search?q=`);
    console.log(`   GET /api/map`);
    console.log(`   GET /api/analytics`);
  });
}).catch(err => {
  console.error("❌ Failed to start:", err.message);
  process.exit(1);
});
