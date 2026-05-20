# MongoDB Schema Design — Smart City Services Platform
**Author:** Haitham  
**Use Cases Covered:** UC-01, UC-02, UC-03, UC-05, UC-07, UC-08  
**Updated:** Replaced Cassandra with Elasticsearch (see Section 6)

---

## Design Philosophy

MongoDB was chosen as the **primary database** for this platform because:

1. **Flexible schema** — A "Broken Lamp Post" report needs different fields than a "Flooding" emergency. MongoDB handles this naturally; a relational DB would require nullable columns or one table per category.
2. **Embedded sub-documents** — The status history of a request belongs with the request itself. Embedding avoids expensive JOINs and delivers the full lifecycle in a single read.
3. **Geospatial indexing** — MongoDB's native `2dsphere` index supports `$near`, `$geoWithin`, and `$geoIntersects` queries, powering hotspot detection (UC-08) without an extra GIS layer.
4. **Aggregation Pipeline** — `$match`, `$group`, `$sort`, `$project` replace complex SQL `GROUP BY` chains for monthly analytics (UC-05).

---

## Collection 1: `users`

**Purpose:** Stores all registered citizen profiles. Each document is self-contained — no JOINs needed to load a full profile.

```json
{ 
  "_id": ObjectId("64a1f2b3c4d5e6f7a8b9c0d1"),
  "userId": "USR-2026-00001",
  "nameAr": "أحمد المصري",
  "nameEn": "Ahmed Al-Masri",
  "age": 28,
  "gender": "male",
  "nationalId": "9f86d081884c7d659a2feaa0",
  "email": "ahmed.masri@example.ps",
  "phone": "+970-59-123-4567",
  "homeAddress": {
    "textAr": "شارع الوحدة، رام الله",
    "textEn": "Al-Wihda Street, Ramallah",
    "coordinates": { "type": "Point", "coordinates": [35.2034, 31.9026] }
  },
  "districtId": "district_4",
  "districtName": "University Zone",
  "language": "ar",
  "notificationPrefs": {
    "pushEnabled": true,
    "emailEnabled": false,
    "categories": ["street_lighting", "waste", "roads"]
  },
  "civicScore": 145,
  "badges": ["first_report", "active_reporter", "neighborhood_volunteer"],
  "totalReports": 12,
  "resolvedReports": 9,
  "createdAt": ISODate("2026-01-15T10:30:00Z"),
  "lastLogin": ISODate("2026-05-10T08:15:00Z"),
  "isActive": true
}
```

| Field | Type | Reason |
|-------|------|--------|
| `nationalId` | hashed string | Security — never store raw national IDs |
| `homeAddress.coordinates` | GeoJSON Point | Enables geo-queries (which district?) |
| `notificationPrefs` | embedded object | Read together with profile; no separate lookup |
| `civicScore` / `badges` | inline | Gamification — updated frequently, read on every profile load |
| `totalReports` | number | Cached counter — avoids counting `service_requests` every time |

---

## Collection 2: `service_requests`

**The most important collection.** Stores every citizen report and embeds the full status history as an array inside the document.

### Why embed status history?

| Option | Pros | Cons |
|--------|------|------|
| **Separate collection** (one doc per status change) | Cleaner for very long histories | Requires `$lookup` every time you display a timeline; extra round-trip |
| **Embedded array** ✅ our choice | One read gives request + full history; atomic `$push` updates | Slight overhead if history grows very long (won't happen — max ~6 states) |

With at most 6 status changes (`OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED` + `REJECTED`), the embedded array never grows problematically large. This is the correct MongoDB pattern for this case.

```json
{
  "_id": ObjectId("64b2e3c4d5f6a7b8c9d0e1f2"),
  "requestId": "REQ-2026-048712",
  "citizenId": ObjectId("64a1f2b3c4d5e6f7a8b9c0d1"),
  "citizenName": "فاطمة خالد",
  "location": { "type": "Point", "coordinates": [35.2134, 31.9073] },
  "addressTextAr": "شارع البيرة الرئيسي، البيرة",
  "addressTextEn": "Al-Bireh Main Street, Al-Bireh",
  "districtId": "district_4",
  "category": "street_lighting",
  "subcategory": "broken_lamp_post",
  "priority": 2,
  "descriptionAr": "عمود الإنارة أمام المدرسة معطل منذ أسبوع",
  "descriptionEn": "The lamp post in front of the school has been broken for a week. The area is completely dark at night.",
  "photoUrls": ["https://storage.smartcity.ps/photos/REQ-2026-048712-1.jpg"],
  "status": "IN_PROGRESS",
  "assignedDepartmentId": "dept_street_lighting",
  "assignedDepartmentName": "إدارة الإنارة العامة",
  "assignedTechnicianId": ObjectId("64c3f4d5e6a7b8c9d0e1f2a3"),
  "assignedTechnicianName": "محمود العمر",
  "statusHistory": [
    { "status": "OPEN",        "timestamp": ISODate("2026-05-01T09:15:00Z"), "actor": "system",      "actorType": "auto",       "commentAr": "تم استلام البلاغ" },
    { "status": "ASSIGNED",    "timestamp": ISODate("2026-05-01T11:30:00Z"), "actor": "supervisor_1", "actorType": "supervisor", "commentAr": "تم التحويل لإدارة الإنارة" },
    { "status": "IN_PROGRESS", "timestamp": ISODate("2026-05-02T08:00:00Z"), "actor": "tech_mahmoud", "actorType": "technician", "commentAr": "الفني في الطريق" }
  ],
  "createdAt": ISODate("2026-05-01T09:15:00Z"),
  "updatedAt": ISODate("2026-05-02T08:00:00Z"),
  "resolvedAt": null,
  "citizenRating": null,
  "isDuplicate": false
}
```

### Status Lifecycle

```
OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
                                    ↓
                               REJECTED (duplicate / out of scope)
```

| Field | Type | Reason |
|-------|------|--------|
| `location` | GeoJSON Point | Required for `2dsphere` index and geospatial queries |
| `statusHistory` | embedded array | Full audit trail in one document read |
| `citizenName` | denormalized string | Avoids JOIN to `users` collection for display |
| `assignedDepartmentName` | denormalized string | Faster dashboard rendering |
| `priority` | 1/2/3 integer | Auto-calculated on insert based on category + frequency |
| `isDuplicate` | boolean | Flag for deduplication logic |

---

## Collection 3: `departments`

Small config collection (6 documents). Stores routing rules and geographic coverage. Cached in Redis for fast lookup on every new request submission (UC-06, UC-07).

```json
{
  "_id": "dept_street_lighting",
  "nameAr": "إدارة الإنارة العامة",
  "nameEn": "Street Lighting Department",
  "responsibleCategories": ["street_lighting"],
  "districtCoverage": ["district_1", "district_2", "district_3", "district_4", "district_5"],
  "coveragePolygon": { "type": "Polygon", "coordinates": [[...]] },
  "escalationRules": {
    "unacknowledgedAfterHours": 24,
    "escalateTo": "dept_emergency",
    "priority1AutoEscalate": true
  },
  "operatingHours": { "weekdays": "07:00-17:00", "friday": "closed", "saturday": "08:00-14:00" },
  "supervisors": [{ "nameAr": "خالد أبو عمر", "phone": "+970-59-999-0001" }]
}
```

---

## Collection 4: `technicians`

Separated from `departments` because each department has many technicians, and we want to track individual performance (average resolution time, resolved count).

```json
{
  "_id": ObjectId("..."),
  "technicianId": "TECH-001",
  "nameAr": "محمود العمر",
  "nameEn": "Mahmoud Al-Omar",
  "departmentId": "dept_street_lighting",
  "phone": "+970-59-200-0001",
  "resolvedCount": 87,
  "avgResolutionHours": 18.4,
  "activeRequests": { "REQ-2026-048712": "IN_PROGRESS" },
  "isActive": true
}
```

---

## Collection 5: `areas` (Districts)

8 geographic zones with boundary polygons used for routing and analytics.

```json
{
  "_id": "district_4",
  "nameAr": "منطقة الجامعة",
  "nameEn": "University Zone",
  "boundaryPolygon": { "type": "Polygon", "coordinates": [[...]] },
  "population": 22000
}
```

---

## Collection 6: `categories`

Full service category tree. Cached in Redis for 24 hours (UC-06).

```json
{
  "_id": "street_lighting",
  "nameAr": "الإنارة العامة",
  "nameEn": "Street Lighting",
  "responsibleDept": "dept_street_lighting",
  "defaultPriority": 2,
  "subcategories": [
    { "id": "broken_lamp_post", "nameEn": "Broken Lamp Post", "priority": 2 },
    { "id": "unlit_zone",       "nameEn": "Unlit Zone",       "priority": 1 },
    { "id": "flickering_light", "nameEn": "Flickering Light", "priority": 3 }
  ],
  "autoEscalate": false
}
```

---

## Collection 7: `geopoints`

~3,500 named infrastructure points (lamp posts, waste bins, traffic signals, drains, benches).

```json
{
  "_id": ObjectId("..."),
  "pointId": "GP-004721",
  "nameAr": "عمود إنارة - شارع البيرة",
  "type": "lamp_post",
  "location": { "type": "Point", "coordinates": [35.2134, 31.9073] },
  "districtId": "district_4",
  "status": "active",
  "lastMaintenance": ISODate("2024-11-20T00:00:00Z"),
  "metadata": { "manufacturer": "Philips", "wattage": 150 }
}
```

---

## Section 6: Elasticsearch — Replacing Cassandra

### Why we dropped Cassandra

Cassandra was originally proposed for time-series event logging (one row per status change, partitioned by date + district). However, at our platform's scale (500,000 requests/year), MongoDB's embedded `statusHistory` array handles this perfectly well. Cassandra's write-throughput advantage becomes relevant only at tens of millions of events.

More importantly, we identified a real unmet need: **full-text search on citizen descriptions**.

### The Problem Cassandra (and MongoDB) Cannot Solve

Citizens write free-text descriptions in Arabic, English, or a mix of both:

> *"هناك رائحة كريهة بالقرب من المدرسة في شارع البيرة، يبدو أنه تسرب في أنبوب الصرف الصحي"*
>
> *"There is a foul smell near the school on Al-Bireh Street, looks like a broken sewage pipe"*

A citizen later searches: **"water leaking from the ground near the central market"**

None of the other databases can match this intelligently:
- **MongoDB** basic text index: only exact word matches; no fuzzy matching; poor Arabic support
- **Redis**: key-value store — no search capability
- **Neo4j**: graph traversal — not designed for document search
- **Cassandra**: wide-column append-only store — no relevance ranking

### What Elasticsearch Adds

| Capability | Impact |
|------------|--------|
| **Full-text search** with relevance scoring | "sewage overflow" matches "water leaking" and "drainage issue" |
| **Fuzzy matching** (`fuzziness: AUTO`) | "سرب مياه" matches "تسرب مياه" (one character difference) |
| **Arabic analyzer** | Normalizes ألف/همزة variants; removes stop words; handles diacritics |
| **Bilingual search** | Mixed Arabic/English queries work on both description fields |
| **Duplicate detection** | `more_like_this` query finds semantically similar nearby reports |
| **Faceted filtering** | Instant aggregations by district, status, category, date range |

### Architecture: MongoDB + Elasticsearch Together

```
Citizen submits report
        ↓
   MongoDB (INSERT)          ← source of truth
        ↓ (async)
  Change Stream listener
        ↓
  Elasticsearch (INDEX)      ← search layer
        ↓
  Citizen searches "water leaking"
        ↓
  ES full-text query → returns ranked results
```

**Key principle:** MongoDB and Elasticsearch are not duplicates — they serve different purposes:
- MongoDB: CRUD, geospatial, status updates, aggregations, relationships
- Elasticsearch: full-text search, fuzzy matching, duplicate detection, faceted UI

### CAP Theorem Position

| System | CAP | Practical Impact |
|--------|-----|-----------------|
| MongoDB (Haitham) | **CP** | Consistent citizen data; brief unavailability acceptable |
| Neo4j (Saad) | **CP** | Relationship integrity critical |
| Redis (Ahmad) | **AP** | Cache may serve slightly stale data; availability preferred |
| Elasticsearch (Haitham) | **AP** | Search index may lag MongoDB by seconds; eventual consistency is fine |

Elasticsearch is **AP** by design — if a new request is indexed 2 seconds late, citizens won't notice. What matters is that MongoDB (the source of truth) is always consistent.

---

## Indexes Summary

```javascript
// service_requests
{ location: "2dsphere" }                          // geospatial queries
{ status: 1 }                                      // dashboard filters
{ citizenId: 1, createdAt: -1 }                   // "my requests" page
{ assignedDepartmentId: 1, status: 1 }            // department dashboard
{ districtId: 1, status: 1, createdAt: -1 }       // analytics
{ category: 1, createdAt: -1 }                    // trend reports
{ descriptionEn: "text", descriptionAr: "text" }  // fallback text search

// users
{ email: 1 }           // unique — login
{ nationalId: 1 }      // unique — registration dedup

// geopoints
{ location: "2dsphere" }    // find nearest infrastructure
{ type: 1, districtId: 1 } // "all lamp posts in district 4"
```
