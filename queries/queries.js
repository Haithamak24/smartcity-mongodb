/**
 * queries.js — Smart City Services Platform
 * Core CRUD and lookup queries for all MongoDB collections.
 * Author: Haitham
 *
 * Use cases covered: UC-01, UC-02, UC-03, UC-06, UC-07, UC-08
 *
 * Run: node queries/queries.js
 */

const { MongoClient, ObjectId } = require("mongodb");

const MONGO_URI = "mongodb://localhost:27017";
const DB_NAME = "smartcity";

async function runQueries() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log("✅ Connected to MongoDB\n");

    // ─────────────────────────────────────────────────────────
    // UC-01: CITIZEN ACCOUNT MANAGEMENT
    // ─────────────────────────────────────────────────────────
    console.log("═══ UC-01: Citizen Account Management ═══\n");

    // Q1: Fetch a citizen profile by email (login)
    console.log("Q1: Fetch citizen profile by email (login lookup)");
    const userByEmail = await db.collection("users").findOne(
      { email: "ahmed.masri@example.ps" },
      { projection: { nationalId: 0 } } // never return hashed national ID
    );
    console.log("   Result:", userByEmail ? `Found user: ${userByEmail.nameEn}` : "Not found");

    // Q2: Update last login timestamp (called on every successful auth)
    console.log("\nQ2: Update lastLogin on successful authentication");
    const loginUpdate = await db.collection("users").updateOne(
      { email: "ahmed.masri@example.ps" },
      { $set: { lastLogin: new Date() } }
    );
    console.log("   Updated:", loginUpdate.modifiedCount, "document(s)");

    // Q3: Increment civic score and add a badge
    console.log("\nQ3: Award a badge and increment civic score");
    const badgeUpdate = await db.collection("users").updateOne(
      { email: "ahmed.masri@example.ps" },
      {
        $inc: { civicScore: 10, totalReports: 1 },
        $addToSet: { badges: "active_reporter" }, // addToSet prevents duplicates
      }
    );
    console.log("   Updated:", badgeUpdate.modifiedCount, "document(s)");

    // Q4: Leaderboard — top 5 citizens by civic score in a district
    console.log("\nQ4: Top 5 citizens by civic score in District 4 (leaderboard)");
    const leaderboard = await db.collection("users")
      .find({ districtId: "district_4" })
      .sort({ civicScore: -1 })
      .limit(5)
      .project({ nameAr: 1, nameEn: 1, civicScore: 1, badges: 1, totalReports: 1 })
      .toArray();
    leaderboard.forEach((u, i) => console.log(`   ${i + 1}. ${u.nameEn} — score: ${u.civicScore}`));

    // ─────────────────────────────────────────────────────────
    // UC-02: SERVICE REQUEST SUBMISSION
    // ─────────────────────────────────────────────────────────
    console.log("\n═══ UC-02: Service Request Submission ═══\n");

    // Q5: Submit a new service request
    console.log("Q5: Submit a new service request");
    const newRequest = {
      requestId: "REQ-2026-050000",
      citizenId: new ObjectId(), // would come from auth token
      citizenName: "طارق موسى",
      location: { type: "Point", coordinates: [35.2080, 31.9050] },
      addressTextAr: "شارع النهضة، رام الله",
      addressTextEn: "Al-Nahda Street, Ramallah",
      districtId: "district_1",
      districtName: "Central Business District",
      category: "traffic",
      subcategory: "pothole",
      priority: 2,
      descriptionAr: "حفرة كبيرة في منتصف الشارع",
      descriptionEn: "Large pothole in the middle of the road causing danger to drivers.",
      photoUrls: [],
      status: "OPEN",
      assignedDepartmentId: null,
      assignedDepartmentName: null,
      assignedTechnicianId: null,
      assignedTechnicianName: null,
      statusHistory: [
        { status: "OPEN", timestamp: new Date(), actor: "system", actorType: "auto", commentAr: "تم استلام البلاغ" },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedCompletion: null,
      resolvedAt: null,
      resolutionNote: null,
      citizenRating: null,
      isDuplicate: false,
      duplicateOfId: null,
    };
    const insertResult = await db.collection("service_requests").insertOne(newRequest);
    console.log("   Inserted request ID:", insertResult.insertedId);

    // Q6: Check for potential duplicates — nearby OPEN requests of same category
    console.log("\nQ6: Check for duplicate — nearby OPEN waste reports within 200m");
    const duplicateCheck = await db.collection("service_requests").find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [35.2050, 31.9010] },
          $maxDistance: 200,
        },
      },
      category: "waste",
      status: { $in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
    }).toArray();
    console.log("   Potential duplicates found:", duplicateCheck.length);
    duplicateCheck.forEach(r => console.log(`   → ${r.requestId} (${r.subcategory})`));

    // ─────────────────────────────────────────────────────────
    // UC-03: REAL-TIME STATUS TRACKING
    // ─────────────────────────────────────────────────────────
    console.log("\n═══ UC-03: Real-Time Status Tracking ═══\n");

    // Q7: Fetch request status and full timeline by requestId
    console.log("Q7: Fetch status timeline for REQ-2026-048712");
    const requestTimeline = await db.collection("service_requests").findOne(
      { requestId: "REQ-2026-048712" },
      { projection: { requestId: 1, status: 1, statusHistory: 1, estimatedCompletion: 1 } }
    );
    if (requestTimeline) {
      console.log("   Current status:", requestTimeline.status);
      requestTimeline.statusHistory.forEach(s =>
        console.log(`   → ${s.status} at ${s.timestamp.toISOString()} by ${s.actor}`)
      );
    }

    // Q8: Update request status — push to statusHistory array atomically
    console.log("\nQ8: Transition a request to RESOLVED (append to statusHistory)");
    const statusUpdate = await db.collection("service_requests").updateOne(
      { requestId: "REQ-2026-049100" }, // the OPEN pothole request
      {
        $set: {
          status: "IN_PROGRESS",
          assignedDepartmentId: "dept_traffic",
          assignedDepartmentName: "هيئة المرور والطرق",
          updatedAt: new Date(),
        },
        $push: {
          statusHistory: {
            status: "IN_PROGRESS",
            timestamp: new Date(),
            actor: "supervisor_traffic",
            actorType: "supervisor",
            commentAr: "تم التحويل لهيئة المرور",
          },
        },
      }
    );
    console.log("   Updated:", statusUpdate.modifiedCount, "document(s)");

    // Q9: My requests — citizen's recent reports
    console.log("\nQ9: Citizen's own reports (most recent first)");
    const myRequests = await db.collection("service_requests").find(
      { citizenName: "أحمد المصري" }, // in production: use citizenId from session
      { projection: { requestId: 1, category: 1, status: 1, createdAt: 1, districtName: 1 } }
    ).sort({ createdAt: -1 }).toArray();
    myRequests.forEach(r =>
      console.log(`   ${r.requestId} — ${r.category} — ${r.status}`)
    );

    // ─────────────────────────────────────────────────────────
    // UC-07: DEPARTMENT ASSIGNMENT & ROUTING
    // ─────────────────────────────────────────────────────────
    console.log("\n═══ UC-07: Department Routing ═══\n");

    // Q10: Route a request — find the correct department by category
    console.log("Q10: Route by category — which department handles 'street_lighting'?");
    const routingDept = await db.collection("departments").findOne(
      { responsibleCategories: "street_lighting" },
      { projection: { _id: 1, nameEn: 1, nameAr: 1, escalationRules: 1 } }
    );
    console.log("   Department:", routingDept?.nameEn, "(ID:", routingDept?._id + ")");

    // Q11: Department dashboard — all open/in-progress requests for a department
    console.log("\nQ11: Department dashboard — open requests for Street Lighting");
    const deptDashboard = await db.collection("service_requests").find(
      { assignedDepartmentId: "dept_street_lighting", status: { $in: ["ASSIGNED", "IN_PROGRESS"] } },
      { projection: { requestId: 1, status: 1, priority: 1, districtName: 1, createdAt: 1 } }
    ).sort({ priority: 1, createdAt: 1 }).toArray();
    console.log("   Active requests:", deptDashboard.length);
    deptDashboard.forEach(r =>
      console.log(`   → ${r.requestId} [P${r.priority}] ${r.status} — ${r.districtName}`)
    );

    // ─────────────────────────────────────────────────────────
    // UC-08: GEOSPATIAL HOTSPOT DETECTION
    // ─────────────────────────────────────────────────────────
    console.log("\n═══ UC-08: Geospatial Queries ═══\n");

    // Q12: Find all unresolved waste/water reports within 500m of central market
    console.log("Q12: Unresolved waste & water reports within 500m of central market");
    const nearbyHotspot = await db.collection("service_requests").find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [35.2050, 31.9010] },
          $maxDistance: 500,
        },
      },
      category: { $in: ["waste", "water"] },
      status: { $nin: ["RESOLVED", "CLOSED", "REJECTED"] },
    }).toArray();
    console.log("   Reports found:", nearbyHotspot.length);
    nearbyHotspot.forEach(r =>
      console.log(`   → ${r.requestId} | ${r.category}/${r.subcategory} | ${r.status}`)
    );

    // Q13: Find all requests within a district polygon (geoWithin)
    console.log("\nQ13: All OPEN requests within District 1 boundary (geoWithin)");
    const district1Polygon = {
      type: "Polygon",
      coordinates: [[[35.20, 31.90], [35.22, 31.90], [35.22, 31.92], [35.20, 31.92], [35.20, 31.90]]],
    };
    const withinDistrict = await db.collection("service_requests").find({
      location: { $geoWithin: { $geometry: district1Polygon } },
      status: "OPEN",
    }).toArray();
    console.log("   Open requests in District 1 polygon:", withinDistrict.length);

    // Q14: Find nearest infrastructure point (lamp post) to a given coordinate
    console.log("\nQ14: Find nearest lamp post to a given GPS coordinate");
    const nearestLampPost = await db.collection("geopoints").findOne({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [35.2130, 31.9070] },
          $maxDistance: 300,
        },
      },
      type: "lamp_post",
    });
    console.log("   Nearest lamp post:", nearestLampPost?.pointId, "-", nearestLampPost?.nameAr);

    // ─────────────────────────────────────────────────────────
    // CITIZEN SATISFACTION RATING
    // ─────────────────────────────────────────────────────────
    console.log("\n═══ Post-Resolution: Citizen Rating ═══\n");

    // Q15: Submit satisfaction rating for a resolved request
    console.log("Q15: Citizen submits rating (1-5) for resolved request");
    const ratingUpdate = await db.collection("service_requests").updateOne(
      { requestId: "REQ-2026-047001", status: { $in: ["RESOLVED", "CLOSED"] } },
      {
        $set: { citizenRating: 5, status: "CLOSED", updatedAt: new Date() },
        $push: {
          statusHistory: {
            status: "CLOSED",
            timestamp: new Date(),
            actor: "citizen",
            actorType: "citizen",
            commentAr: "أغلق المواطن البلاغ بتقييم 5 نجوم",
          },
        },
      }
    );
    console.log("   Rating submitted:", ratingUpdate.modifiedCount, "document(s) updated");

    console.log("\n🎉 All queries executed successfully!");
  } catch (err) {
    console.error("❌ Query failed:", err.message);
    throw err;
  } finally {
    await client.close();
  }
}

runQueries();
