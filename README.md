# Smart City Services Platform — MongoDB + Elasticsearch
**Author:** Haitham | **Part of:** NoSQL Database Group Project  
**Database:** MongoDB 7.0 + Elasticsearch 8.12

---

## What This Repo Contains

This is **Haitham's part** of the Smart City Services Platform — a NoSQL database project built for a mid-sized city of 250,000 residents.

This repo covers the **MongoDB layer** (primary database) and the **Elasticsearch layer** (full-text search), including schema design, seed data, indexes, CRUD queries, analytics aggregations, and search queries.

---

## Overall Project Architecture

The full platform uses 4 databases, each owned by a different team member:

| Database | Owner | Role |
|----------|-------|------|
| **MongoDB** | Haitham (this repo) | Primary database — citizens, service requests, departments |
| **Redis** | Ahmad | Session management and caching |
| **Neo4j** | Saad | Urban relationship graph |
| **Elasticsearch** | Haitham (this repo) | Full-text search on citizen reports |

---

## Why Elasticsearch Instead of Cassandra

The original design included Cassandra for time-series event logging. After review, we replaced it with Elasticsearch for one key reason:

Citizens submit free-text reports in Arabic, English, or a mix of both:
> *"هناك رائحة كريهة بالقرب من المدرسة في شارع البيرة، يبدو أنه تسرب في أنبوب الصرف الصحي"*

No other database in our stack handles this well:
- MongoDB basic text index → no fuzzy matching, poor Arabic support
- Redis, Neo4j, Cassandra → not designed for full-text search at all

Elasticsearch gives us:
- **Full-text search** with relevance scoring across Arabic and English descriptions
- **Fuzzy matching** — catches typos like "سرب مياه" instead of "تسرب مياه"
- **Arabic analyzer** — normalizes ألف/همزة variants, removes stop words
- **Duplicate detection** — finds semantically similar nearby reports before submission
- **Faceted filtering** — instant aggregations by district, status, category, date

**Architecture pattern:** MongoDB is the source of truth. Requests are indexed asynchronously into Elasticsearch via MongoDB Change Streams.

```
Citizen submits report
        ↓
   MongoDB (INSERT)        ← source of truth
        ↓ async
  Change Stream listener
        ↓
  Elasticsearch (INDEX)    ← search layer
```

---

## Project Structure

```
smartcity-mongodb/
├── seed-data/
│   └── seed.js               # Populates all 7 collections with realistic data
├── indexes/
│   └── indexes.js            # Creates all MongoDB indexes (20 total)
├── queries/
│   └── queries.js            # CRUD queries covering UC-01, 02, 03, 07, 08
├── aggregations/
│   └── aggregations.js       # 7 analytics pipelines (UC-05)
├── elasticsearch/
│   ├── es-mapping.js         # Creates ES index with Arabic+English analyzer
│   ├── es-sync.js            # MongoDB → ES sync (bulk + live Change Stream)
│   └── es-queries.js         # Full-text search query examples
├── schema/
│   └── schema-design.md      # Full schema documentation with design decisions
└── package.json
```

---

## MongoDB Collections

| Collection | Documents | Description |
|------------|-----------|-------------|
| `users` | 8 | Registered citizens with civic scores and notification preferences |
| `service_requests` | 10 | Citizen reports with embedded status history array |
| `departments` | 6 | Public Works, Traffic, Sanitation, Lighting, Emergency, Planning |
| `technicians` | 5 | Field workers with performance tracking |
| `areas` | 8 | Geographic districts with boundary polygons |
| `categories` | 6 | Service categories with subcategories and routing rules |
| `geopoints` | 10 | Infrastructure points (lamp posts, waste bins, traffic signals) |

---

## How to Run

### Prerequisites
- Node.js 18+
- MongoDB 7.0 running on `localhost:27017`
- Elasticsearch 8.12 running on `localhost:9200`

Start Elasticsearch with Docker if needed:
```bash
docker run -p 9200:9200 -e "discovery.type=single-node" elasticsearch:8.12.0
```

Start MongoDB (WSL/Ubuntu):
```bash
sudo mongod --dbpath /var/lib/mongodb --logpath /var/log/mongodb/mongod.log --fork
```

### Install dependencies
```bash
npm install
```

### Run in order

```bash
# 1. Seed MongoDB with all collections
npm run seed

# 2. Create all indexes
npm run indexes

# 3. Run CRUD queries (UC-01, 02, 03, 07, 08)
npm run queries

# 4. Run analytics pipelines (UC-05)
npm run aggregations

# 5. Set up Elasticsearch index and mapping
npm run es:setup

# 6. Bulk sync MongoDB → Elasticsearch
npm run es:sync:initial

# 7. Run full-text search queries
npm run es:queries

# 8. (Optional) Start live sync via Change Streams
npm run es:sync:live
```

Or run everything at once:
```bash
npm run setup:all
```

---

## Key Design Decisions

**Embedded status history** — Each service request embeds its full status history as an array rather than a separate collection. Since a request goes through at most 5–6 states, this avoids a JOIN on every timeline load and keeps the full lifecycle in a single document read.

**Denormalized names** — `citizenName` and `assignedDepartmentName` are stored directly on service request documents to avoid lookups on every dashboard render.

**2dsphere indexes** — Both `service_requests` and `geopoints` have 2dsphere indexes, enabling `$near`, `$geoWithin`, and `$geoIntersects` queries for hotspot detection (UC-08).

**CAP theorem position** — MongoDB with replica sets is CP (Consistency + Partition Tolerance). Elasticsearch is AP — the search index may lag MongoDB by a few seconds, which is acceptable for search use cases.
