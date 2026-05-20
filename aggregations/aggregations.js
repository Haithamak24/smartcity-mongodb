/**
 * aggregations.js — Smart City Services Platform
 * Analytics aggregation pipelines for UC-05 (reporting and dashboards).
 * Author: Haitham
 *
 * Pipelines:
 *   1. Top reported issue types last 30 days, by district
 *   2. Average / min / max resolution time per department
 *   3. Open vs. closed ratio per department
 *   4. GPS heatmap — cluster unresolved requests by zone
 *   5. Citizen satisfaction score vs. resolution time correlation
 *   6. Busiest days/hours for new submissions (time-series)
 *   7. Technician performance (avg time: assignment → resolution)
 *
 * Run: node aggregations/aggregations.js
 */

const { MongoClient } = require("mongodb");

const MONGO_URI = "mongodb://localhost:27017";
const DB_NAME = "smartcity";

// ─────────────────────────────────────────────────────────────
// PIPELINE 1: Top 5 most reported issue types (last 30 days)
//             broken down by district
// Use case: Director of Public Works monthly report
// ─────────────────────────────────────────────────────────────
const pipelineTopIssuesByDistrict = [
  {
    // Step 1: Only last 30 days
    $match: {
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      status: { $nin: ["REJECTED"] },
    },
  },
  {
    // Step 2: Group by district + category
    $group: {
      _id: { district: "$districtName", category: "$category" },
      count: { $sum: 1 },
    },
  },
  {
    // Step 3: Sort by count descending within each district
    $sort: { count: -1 },
  },
  {
    // Step 4: Group by district to collect top categories
    $group: {
      _id: "$_id.district",
      topCategories: { $push: { category: "$_id.category", count: "$count" } },
      totalReports: { $sum: "$count" },
    },
  },
  {
    // Step 5: Slice to top 5 per district
    $project: {
      district: "$_id",
      topCategories: { $slice: ["$topCategories", 5] },
      totalReports: 1,
    },
  },
  { $sort: { totalReports: -1 } },
];

// ─────────────────────────────────────────────────────────────
// PIPELINE 2: Average, min, max resolution time per department
//             (only for RESOLVED or CLOSED requests)
// ─────────────────────────────────────────────────────────────
const pipelineResolutionTimeByDept = [
  {
    // Step 1: Only resolved requests with both timestamps
    $match: {
      status: { $in: ["RESOLVED", "CLOSED"] },
      resolvedAt: { $ne: null },
      assignedDepartmentId: { $ne: null },
    },
  },
  {
    // Step 2: Compute resolution time in hours
    $project: {
      assignedDepartmentId: 1,
      assignedDepartmentName: 1,
      resolutionHours: {
        $divide: [
          { $subtract: ["$resolvedAt", "$createdAt"] },
          1000 * 60 * 60, // ms → hours
        ],
      },
    },
  },
  {
    // Step 3: Group by department
    $group: {
      _id: { deptId: "$assignedDepartmentId", deptName: "$assignedDepartmentName" },
      avgResolutionHours: { $avg: "$resolutionHours" },
      minResolutionHours: { $min: "$resolutionHours" },
      maxResolutionHours: { $max: "$resolutionHours" },
      totalResolved: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      department: "$_id.deptName",
      avgHours: { $round: ["$avgResolutionHours", 1] },
      minHours: { $round: ["$minResolutionHours", 1] },
      maxHours: { $round: ["$maxResolutionHours", 1] },
      totalResolved: 1,
    },
  },
  { $sort: { avgHours: 1 } }, // fastest departments first
];

// ─────────────────────────────────────────────────────────────
// PIPELINE 3: Open vs. closed request ratio per department
//             Used to identify overloaded departments
// ─────────────────────────────────────────────────────────────
const pipelineOpenClosedRatioByDept = [
  {
    $match: { assignedDepartmentId: { $ne: null } },
  },
  {
    $group: {
      _id: { deptId: "$assignedDepartmentId", deptName: "$assignedDepartmentName" },
      openCount: {
        $sum: { $cond: [{ $in: ["$status", ["OPEN", "ASSIGNED", "IN_PROGRESS"]] }, 1, 0] },
      },
      closedCount: {
        $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] },
      },
      rejectedCount: {
        $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] },
      },
    },
  },
  {
    $project: {
      _id: 0,
      department: "$_id.deptName",
      openCount: 1,
      closedCount: 1,
      rejectedCount: 1,
      total: { $add: ["$openCount", "$closedCount", "$rejectedCount"] },
      openRatio: {
        $round: [
          { $multiply: [{ $divide: ["$openCount", { $add: ["$openCount", "$closedCount", "$rejectedCount"] }] }, 100] },
          1,
        ],
      },
    },
  },
  { $sort: { openRatio: -1 } }, // most overloaded first
];

// ─────────────────────────────────────────────────────────────
// PIPELINE 4: Heatmap — cluster unresolved requests by location
//             Groups into ~100m grid cells for map visualization
// ─────────────────────────────────────────────────────────────
const pipelineHeatmapUnresolved = [
  {
    $match: {
      status: { $nin: ["RESOLVED", "CLOSED", "REJECTED"] },
    },
  },
  {
    // Round coordinates to 3 decimal places ≈ 100m grid cells
    $project: {
      category: 1,
      districtId: 1,
      lat: { $round: [{ $arrayElemAt: ["$location.coordinates", 1] }, 3] },
      lng: { $round: [{ $arrayElemAt: ["$location.coordinates", 0] }, 3] },
    },
  },
  {
    $group: {
      _id: { lat: "$lat", lng: "$lng", district: "$districtId" },
      count: { $sum: 1 },
      categories: { $addToSet: "$category" },
    },
  },
  {
    $project: {
      _id: 0,
      latitude: "$_id.lat",
      longitude: "$_id.lng",
      district: "$_id.district",
      count: 1,
      categories: 1,
    },
  },
  { $sort: { count: -1 } },
  { $limit: 100 }, // top 100 hotspot cells
];

// ─────────────────────────────────────────────────────────────
// PIPELINE 5: Citizen satisfaction vs. resolution time
//             Explores correlation: faster resolution = higher rating?
// ─────────────────────────────────────────────────────────────
const pipelineSatisfactionVsResolutionTime = [
  {
    $match: {
      citizenRating: { $ne: null },
      resolvedAt: { $ne: null },
    },
  },
  {
    $project: {
      citizenRating: 1,
      category: 1,
      resolutionHours: {
        $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 1000 * 60 * 60],
      },
    },
  },
  {
    // Bucket ratings into satisfaction groups
    $bucket: {
      groupBy: "$citizenRating",
      boundaries: [1, 2, 3, 4, 5, 6], // 1-5 stars
      default: "Other",
      output: {
        count: { $sum: 1 },
        avgResolutionHours: { $avg: "$resolutionHours" },
      },
    },
  },
  {
    $project: {
      rating: "$_id",
      count: 1,
      avgResolutionHours: { $round: ["$avgResolutionHours", 1] },
    },
  },
];

// ─────────────────────────────────────────────────────────────
// PIPELINE 6: Busiest submission hours (time-series)
//             "When do citizens report the most?"
// ─────────────────────────────────────────────────────────────
const pipelineSubmissionsByHour = [
  {
    $project: {
      hour: { $hour: "$createdAt" },
      dayOfWeek: { $dayOfWeek: "$createdAt" }, // 1=Sun ... 7=Sat
    },
  },
  {
    $group: {
      _id: { hour: "$hour", dayOfWeek: "$dayOfWeek" },
      count: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      hour: "$_id.hour",
      dayOfWeek: "$_id.dayOfWeek",
      count: 1,
    },
  },
  { $sort: { count: -1 } },
  { $limit: 20 },
];

// ─────────────────────────────────────────────────────────────
// PIPELINE 7: Technician performance
//             Avg time from assignment → resolution per technician
// ─────────────────────────────────────────────────────────────
const pipelineTechnicianPerformance = [
  {
    $match: {
      status: { $in: ["RESOLVED", "CLOSED"] },
      assignedTechnicianId: { $ne: null },
      resolvedAt: { $ne: null },
    },
  },
  {
    $project: {
      assignedTechnicianId: 1,
      assignedTechnicianName: 1,
      assignedDepartmentId: 1,
      category: 1,
      // Find the ASSIGNED status entry in the history array
      assignedAt: {
        $let: {
          vars: {
            assignEntry: {
              $arrayElemAt: [
                { $filter: { input: "$statusHistory", as: "s", cond: { $eq: ["$$s.status", "ASSIGNED"] } } },
                0,
              ],
            },
          },
          in: "$$assignEntry.timestamp",
        },
      },
      resolvedAt: 1,
    },
  },
  {
    $project: {
      assignedTechnicianName: 1,
      assignedDepartmentId: 1,
      category: 1,
      timeToResolveHours: {
        $cond: {
          if: { $and: [{ $ne: ["$assignedAt", null] }, { $ne: ["$resolvedAt", null] }] },
          then: { $divide: [{ $subtract: ["$resolvedAt", "$assignedAt"] }, 1000 * 60 * 60] },
          else: null,
        },
      },
    },
  },
  {
    $group: {
      _id: { techId: "$assignedTechnicianId", techName: "$assignedTechnicianName", deptId: "$assignedDepartmentId" },
      avgTimeToResolveHours: { $avg: "$timeToResolveHours" },
      totalResolved: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      technician: "$_id.techName",
      department: "$_id.deptId",
      avgTimeToResolveHours: { $round: ["$avgTimeToResolveHours", 1] },
      totalResolved: 1,
    },
  },
  { $sort: { avgTimeToResolveHours: 1 } }, // fastest resolvers first
];

// ─────────────────────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────────────────────
async function runAggregations() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection("service_requests");
    console.log("✅ Connected to MongoDB\n");

    // Pipeline 1
    console.log("═══ Pipeline 1: Top Issues by District (last 30 days) ═══");
    const p1 = await col.aggregate(pipelineTopIssuesByDistrict).toArray();
    p1.forEach(d => {
      console.log(`\n   District: ${d.district || d._id} — ${d.totalReports} reports`);
      (d.topCategories || []).forEach(c => console.log(`     • ${c.category}: ${c.count}`));
    });

    // Pipeline 2
    console.log("\n═══ Pipeline 2: Resolution Time per Department ═══");
    const p2 = await col.aggregate(pipelineResolutionTimeByDept).toArray();
    if (p2.length === 0) console.log("   No resolved requests yet (need resolved data)");
    p2.forEach(d => console.log(`   ${d.department}: avg ${d.avgHours}h | min ${d.minHours}h | max ${d.maxHours}h`));

    // Pipeline 3
    console.log("\n═══ Pipeline 3: Open vs. Closed Ratio per Department ═══");
    const p3 = await col.aggregate(pipelineOpenClosedRatioByDept).toArray();
    p3.forEach(d => console.log(`   ${d.department}: ${d.openCount} open / ${d.closedCount} closed (${d.openRatio}% open)`));

    // Pipeline 4
    console.log("\n═══ Pipeline 4: Heatmap — Unresolved Request Clusters ═══");
    const p4 = await col.aggregate(pipelineHeatmapUnresolved).toArray();
    console.log("   Top hotspot cells:");
    p4.slice(0, 5).forEach(h =>
      console.log(`   [${h.latitude}, ${h.longitude}] — ${h.count} reports | categories: ${h.categories.join(", ")}`)
    );

    // Pipeline 5
    console.log("\n═══ Pipeline 5: Satisfaction Rating vs. Resolution Time ═══");
    const p5 = await col.aggregate(pipelineSatisfactionVsResolutionTime).toArray();
    if (p5.length === 0) console.log("   Not enough rated requests yet");
    p5.forEach(r => console.log(`   ⭐${r.rating} stars — ${r.count} requests — avg ${r.avgResolutionHours}h to resolve`));

    // Pipeline 6
    console.log("\n═══ Pipeline 6: Busiest Submission Hours ═══");
    const p6 = await col.aggregate(pipelineSubmissionsByHour).toArray();
    console.log("   Top 5 busiest (hour, day, count):");
    p6.slice(0, 5).forEach(h =>
      console.log(`   Hour ${String(h.hour).padStart(2, "0")}:00 | Day ${h.dayOfWeek} | ${h.count} submissions`)
    );

    // Pipeline 7
    console.log("\n═══ Pipeline 7: Technician Performance ═══");
    const p7 = await col.aggregate(pipelineTechnicianPerformance).toArray();
    if (p7.length === 0) console.log("   No resolved requests with assigned technicians yet");
    p7.forEach(t =>
      console.log(`   ${t.technician} — avg ${t.avgTimeToResolveHours}h — ${t.totalResolved} resolved`)
    );

    console.log("\n🎉 All aggregation pipelines executed successfully!");
  } catch (err) {
    console.error("❌ Aggregation failed:", err.message);
    throw err;
  } finally {
    await client.close();
  }
}

runAggregations();
