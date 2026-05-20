/**
 * seed.js — Smart City Services Platform
 * Populates MongoDB with realistic sample data for all collections.
 * Author: Haitham
 *
 * Collections seeded:
 *   users, departments, areas, categories, technicians, service_requests, geopoints
 *
 * Run: node seed-data/seed.js
 */

const { MongoClient, ObjectId } = require("mongodb");

const MONGO_URI = "mongodb://localhost:27017";
const DB_NAME = "smartcity";

// ─────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────
function isoDate(str) {
  return new Date(str);
}

// ─────────────────────────────────────────────────────────────
// 1. DEPARTMENTS  (6 documents — matches project spec)
// ─────────────────────────────────────────────────────────────
const departments = [
  {
    _id: "dept_public_works",
    nameAr: "أشغال العامةدائرة ال",
    nameEn: "Public Works Department",
    contactEmail: "publicworks@smartcity.ps",
    contactPhone: "+970-2-240-1000",
    responsibleCategories: ["roads", "infrastructure", "water"],
    districtCoverage: ["district_1", "district_2", "district_3", "district_4", "district_5", "district_6", "district_7", "district_8"],
    coveragePolygon: {
      type: "Polygon",
      coordinates: [[[35.15, 31.85], [35.28, 31.85], [35.28, 31.98], [35.15, 31.98], [35.15, 31.85]]],
    },
    escalationRules: { unacknowledgedAfterHours: 48, escalateTo: "dept_emergency", priority1AutoEscalate: true },
    operatingHours: { weekdays: "07:00-17:00", friday: "closed", saturday: "08:00-14:00" },
    supervisors: [{ nameAr: "مهندس رامي حسن", phone: "+970-59-100-1001" }],
  },
  {
    _id: "dept_traffic",
    nameAr: "هيئة المرور والطرق",
    nameEn: "Traffic Authority",
    contactEmail: "traffic@smartcity.ps",
    contactPhone: "+970-2-240-1100",
    responsibleCategories: ["traffic"],
    districtCoverage: ["district_1", "district_2", "district_3", "district_4", "district_5"],
    coveragePolygon: {
      type: "Polygon",
      coordinates: [[[35.17, 31.87], [35.26, 31.87], [35.26, 31.96], [35.17, 31.96], [35.17, 31.87]]],
    },
    escalationRules: { unacknowledgedAfterHours: 24, escalateTo: "dept_emergency", priority1AutoEscalate: true },
    operatingHours: { weekdays: "06:00-22:00", friday: "08:00-14:00", saturday: "06:00-22:00" },
    supervisors: [{ nameAr: "المهندس خالد العمر", phone: "+970-59-100-1002" }],
  },
  {
    _id: "dept_sanitation",
    nameAr: "دائرة الصحة والنظافة",
    nameEn: "Sanitation Department",
    contactEmail: "sanitation@smartcity.ps",
    contactPhone: "+970-2-240-1200",
    responsibleCategories: ["waste"],
    districtCoverage: ["district_1", "district_2", "district_3", "district_4", "district_5", "district_6", "district_7", "district_8"],
    coveragePolygon: {
      type: "Polygon",
      coordinates: [[[35.15, 31.85], [35.28, 31.85], [35.28, 31.98], [35.15, 31.98], [35.15, 31.85]]],
    },
    escalationRules: { unacknowledgedAfterHours: 24, escalateTo: "dept_public_works", priority1AutoEscalate: false },
    operatingHours: { weekdays: "06:00-16:00", friday: "closed", saturday: "06:00-14:00" },
    supervisors: [{ nameAr: "أبو أحمد ناصر", phone: "+970-59-100-1003" }],
  },
  {
    _id: "dept_street_lighting",
    nameAr: "إدارة الإنارة العامة",
    nameEn: "Street Lighting Department",
    contactEmail: "lighting@smartcity.ps",
    contactPhone: "+970-2-240-1300",
    responsibleCategories: ["street_lighting"],
    districtCoverage: ["district_1", "district_2", "district_3", "district_4", "district_5"],
    coveragePolygon: {
      type: "Polygon",
      coordinates: [[[35.19, 31.89], [35.23, 31.89], [35.23, 31.93], [35.19, 31.93], [35.19, 31.89]]],
    },
    escalationRules: { unacknowledgedAfterHours: 24, escalateTo: "dept_emergency", priority1AutoEscalate: true },
    operatingHours: { weekdays: "07:00-17:00", friday: "closed", saturday: "08:00-14:00" },
    supervisors: [{ nameAr: "خالد أبو عمر", phone: "+970-59-999-0001" }],
  },
  {
    _id: "dept_emergency",
    nameAr: "دائرة الطوارئ والأزمات",
    nameEn: "Emergency Services",
    contactEmail: "emergency@smartcity.ps",
    contactPhone: "+970-2-240-9999",
    responsibleCategories: ["emergency"],
    districtCoverage: ["district_1", "district_2", "district_3", "district_4", "district_5", "district_6", "district_7", "district_8"],
    coveragePolygon: {
      type: "Polygon",
      coordinates: [[[35.15, 31.85], [35.28, 31.85], [35.28, 31.98], [35.15, 31.98], [35.15, 31.85]]],
    },
    escalationRules: { unacknowledgedAfterHours: 1, escalateTo: null, priority1AutoEscalate: true },
    operatingHours: { weekdays: "00:00-24:00", friday: "00:00-24:00", saturday: "00:00-24:00" },
    supervisors: [{ nameAr: "اللواء سعيد مصطفى", phone: "+970-59-999-0002" }],
  },
  {
    _id: "dept_planning",
    nameAr: "دائرة التخطيط العمراني",
    nameEn: "City Planning Department",
    contactEmail: "planning@smartcity.ps",
    contactPhone: "+970-2-240-1500",
    responsibleCategories: ["infrastructure"],
    districtCoverage: ["district_1", "district_2", "district_3", "district_4", "district_5", "district_6", "district_7", "district_8"],
    coveragePolygon: {
      type: "Polygon",
      coordinates: [[[35.15, 31.85], [35.28, 31.85], [35.28, 31.98], [35.15, 31.98], [35.15, 31.85]]],
    },
    escalationRules: { unacknowledgedAfterHours: 72, escalateTo: "dept_public_works", priority1AutoEscalate: false },
    operatingHours: { weekdays: "08:00-15:00", friday: "closed", saturday: "closed" },
    supervisors: [{ nameAr: "م. سارة القاسم", phone: "+970-59-100-1006" }],
  },
];

// ─────────────────────────────────────────────────────────────
// 2. AREAS / DISTRICTS  (8 geographic zones)
// ─────────────────────────────────────────────────────────────
const areas = [
  { _id: "district_1", nameAr: "المنطقة التجارية المركزية", nameEn: "Central Business District", boundaryPolygon: { type: "Polygon", coordinates: [[[35.20, 31.90], [35.22, 31.90], [35.22, 31.92], [35.20, 31.92], [35.20, 31.90]]] }, population: 28000 },
  { _id: "district_2", nameAr: "المنطقة السكنية الشمالية", nameEn: "Northern Residential", boundaryPolygon: { type: "Polygon", coordinates: [[[35.19, 31.92], [35.23, 31.92], [35.23, 31.96], [35.19, 31.96], [35.19, 31.92]]] }, population: 35000 },
  { _id: "district_3", nameAr: "المنطقة الصناعية", nameEn: "Industrial Zone", boundaryPolygon: { type: "Polygon", coordinates: [[[35.15, 31.88], [35.19, 31.88], [35.19, 31.92], [35.15, 31.92], [35.15, 31.88]]] }, population: 12000 },
  { _id: "district_4", nameAr: "منطقة الجامعة", nameEn: "University Zone", boundaryPolygon: { type: "Polygon", coordinates: [[[35.20, 31.88], [35.24, 31.88], [35.24, 31.91], [35.20, 31.91], [35.20, 31.88]]] }, population: 22000 },
  { _id: "district_5", nameAr: "المدينة القديمة", nameEn: "Old City", boundaryPolygon: { type: "Polygon", coordinates: [[[35.21, 31.89], [35.22, 31.89], [35.22, 31.91], [35.21, 31.91], [35.21, 31.89]]] }, population: 18000 },
  { _id: "district_6", nameAr: "الضاحية الغربية", nameEn: "Western Suburb", boundaryPolygon: { type: "Polygon", coordinates: [[[35.15, 31.90], [35.19, 31.90], [35.19, 31.94], [35.15, 31.94], [35.15, 31.90]]] }, population: 31000 },
  { _id: "district_7", nameAr: "الضاحية الجنوبية", nameEn: "Southern Suburb", boundaryPolygon: { type: "Polygon", coordinates: [[[35.19, 31.85], [35.24, 31.85], [35.24, 31.88], [35.19, 31.88], [35.19, 31.85]]] }, population: 27000 },
  { _id: "district_8", nameAr: "الضاحية الشرقية", nameEn: "Eastern Suburb", boundaryPolygon: { type: "Polygon", coordinates: [[[35.24, 31.88], [35.28, 31.88], [35.28, 31.93], [35.24, 31.93], [35.24, 31.88]]] }, population: 25000 },
];

// ─────────────────────────────────────────────────────────────
// 3. SERVICE CATEGORIES  (6 top-level + subcategories)
// ─────────────────────────────────────────────────────────────
const categories = [
  {
    _id: "street_lighting",
    nameAr: "الإنارة العامة",
    nameEn: "Street Lighting",
    icon: "lightbulb",
    responsibleDept: "dept_street_lighting",
    defaultPriority: 2,
    subcategories: [
      { id: "broken_lamp_post", nameAr: "عمود إنارة معطل", nameEn: "Broken Lamp Post", priority: 2 },
      { id: "unlit_zone", nameAr: "منطقة مظلمة", nameEn: "Unlit Zone", priority: 1 },
      { id: "flickering_light", nameAr: "إنارة متقطعة", nameEn: "Flickering Light", priority: 3 },
    ],
    autoEscalate: false,
  },
  {
    _id: "waste",
    nameAr: "النفايات والصرف الصحي",
    nameEn: "Waste & Sanitation",
    icon: "trash",
    responsibleDept: "dept_sanitation",
    defaultPriority: 2,
    subcategories: [
      { id: "overflowing_bin", nameAr: "حاوية ممتلئة", nameEn: "Overflowing Bin", priority: 2 },
      { id: "illegal_dumping", nameAr: "رمي مخلفات غير قانوني", nameEn: "Illegal Dumping", priority: 1 },
      { id: "blocked_drainage", nameAr: "انسداد بالوعة", nameEn: "Blocked Drainage", priority: 1 },
    ],
    autoEscalate: false,
  },
  {
    _id: "traffic",
    nameAr: "المرور والطرق",
    nameEn: "Traffic & Roads",
    icon: "road",
    responsibleDept: "dept_traffic",
    defaultPriority: 2,
    subcategories: [
      { id: "pothole", nameAr: "حفرة في الطريق", nameEn: "Pothole", priority: 2 },
      { id: "road_closure", nameAr: "إغلاق طريق", nameEn: "Road Closure", priority: 1 },
      { id: "signal_failure", nameAr: "عطل إشارة ضوئية", nameEn: "Traffic Signal Failure", priority: 1 },
      { id: "congestion_hotspot", nameAr: "اختناق مروري", nameEn: "Congestion Hotspot", priority: 3 },
    ],
    autoEscalate: true,
  },
  {
    _id: "infrastructure",
    nameAr: "البنية التحتية العامة",
    nameEn: "Public Infrastructure",
    icon: "building",
    responsibleDept: "dept_public_works",
    defaultPriority: 3,
    subcategories: [
      { id: "broken_bench", nameAr: "مقعد مكسور", nameEn: "Broken Bench", priority: 3 },
      { id: "damaged_sidewalk", nameAr: "رصيف تالف", nameEn: "Damaged Sidewalk", priority: 2 },
      { id: "graffiti", nameAr: "낙서", nameEn: "Graffiti", priority: 3 },
    ],
    autoEscalate: false,
  },
  {
    _id: "water",
    nameAr: "المياه والمرافق",
    nameEn: "Water & Utilities",
    icon: "droplet",
    responsibleDept: "dept_public_works",
    defaultPriority: 1,
    subcategories: [
      { id: "water_leak", nameAr: "تسرب مياه", nameEn: "Water Leak", priority: 1 },
      { id: "sewage_issue", nameAr: "مشكلة صرف صحي", nameEn: "Sewage Issue", priority: 1 },
    ],
    autoEscalate: true,
  },
  {
    _id: "emergency",
    nameAr: "تنبيهات الطوارئ",
    nameEn: "Emergency Alerts",
    icon: "alert",
    responsibleDept: "dept_emergency",
    defaultPriority: 1,
    subcategories: [
      { id: "flooding", nameAr: "فيضان", nameEn: "Flooding", priority: 1 },
      { id: "fire", nameAr: "حريق", nameEn: "Fire", priority: 1 },
      { id: "public_hazard", nameAr: "خطر عام", nameEn: "Public Hazard", priority: 1 },
    ],
    autoEscalate: true,
  },
];

// ─────────────────────────────────────────────────────────────
// 4. TECHNICIANS  (one per department)
// ─────────────────────────────────────────────────────────────
const techIds = {
  lighting: new ObjectId(),
  sanitation: new ObjectId(),
  traffic: new ObjectId(),
  publicWorks: new ObjectId(),
  emergency: new ObjectId(),
};

const technicians = [
  {
    _id: techIds.lighting,
    technicianId: "TECH-001",
    nameAr: "محمود العمر",
    nameEn: "Mahmoud Al-Omar",
    departmentId: "dept_street_lighting",
    phone: "+970-59-200-0001",
    resolvedCount: 87,
    avgResolutionHours: 18.4,
    activeRequests: { "REQ-2026-048712": "IN_PROGRESS" },
    joinedAt: isoDate("2022-03-15"),
    isActive: true,
  },
  {
    _id: techIds.sanitation,
    technicianId: "TECH-002",
    nameAr: "يوسف الرفاعي",
    nameEn: "Youssef Al-Rifa'i",
    departmentId: "dept_sanitation",
    phone: "+970-59-200-0002",
    resolvedCount: 124,
    avgResolutionHours: 9.2,
    activeRequests: {},
    joinedAt: isoDate("2021-07-01"),
    isActive: true,
  },
  {
    _id: techIds.traffic,
    technicianId: "TECH-003",
    nameAr: "سامي البرغوثي",
    nameEn: "Sami Al-Barghouthi",
    departmentId: "dept_traffic",
    phone: "+970-59-200-0003",
    resolvedCount: 63,
    avgResolutionHours: 22.1,
    activeRequests: {},
    joinedAt: isoDate("2023-01-20"),
    isActive: true,
  },
  {
    _id: techIds.publicWorks,
    technicianId: "TECH-004",
    nameAr: "نضال أبو صالح",
    nameEn: "Nidal Abu Saleh",
    departmentId: "dept_public_works",
    phone: "+970-59-200-0004",
    resolvedCount: 201,
    avgResolutionHours: 31.7,
    activeRequests: {},
    joinedAt: isoDate("2020-09-10"),
    isActive: true,
  },
  {
    _id: techIds.emergency,
    technicianId: "TECH-005",
    nameAr: "حسام الشريف",
    nameEn: "Husam Al-Sharif",
    departmentId: "dept_emergency",
    phone: "+970-59-200-0005",
    resolvedCount: 45,
    avgResolutionHours: 4.8,
    activeRequests: {},
    joinedAt: isoDate("2023-06-01"),
    isActive: true,
  },
];

// ─────────────────────────────────────────────────────────────
// 5. USERS  (8 registered citizens)
// ─────────────────────────────────────────────────────────────
const userIds = {
  ahmed: new ObjectId(),
  fatima: new ObjectId(),
  omar: new ObjectId(),
  sara: new ObjectId(),
  khalid: new ObjectId(),
  rania: new ObjectId(),
  tariq: new ObjectId(),
  maya: new ObjectId(),
};

const users = [
  {
    _id: userIds.ahmed,
    userId: "USR-2026-00001",
    nameAr: "أحمد المصري",
    nameEn: "Ahmed Al-Masri",
    age: 28,
    gender: "male",
    nationalId: "9f86d081884c7d659a2feaa0c55ad015da2f6",
    email: "ahmed.masri@example.ps",
    phone: "+970-59-123-4567",
    homeAddress: {
      textAr: "شارع الوحدة، رام الله",
      textEn: "Al-Wihda Street, Ramallah",
      coordinates: { type: "Point", coordinates: [35.2034, 31.9026] },
    },
    districtId: "district_4",
    districtName: "University Zone",
    language: "ar",
    notificationPrefs: { pushEnabled: true, emailEnabled: false, categories: ["street_lighting", "waste", "roads"] },
    civicScore: 145,
    badges: ["first_report", "active_reporter", "neighborhood_volunteer"],
    totalReports: 12,
    resolvedReports: 9,
    createdAt: isoDate("2026-01-15T10:30:00Z"),
    lastLogin: isoDate("2026-05-10T08:15:00Z"),
    isActive: true,
  },
  {
    _id: userIds.fatima,
    userId: "USR-2026-00002",
    nameAr: "فاطمة خالد",
    nameEn: "Fatima Khalid",
    age: 34,
    gender: "female",
    nationalId: "a4c2e8f1b3d5e7a9c0f2d4b6e8a1c3d5e7",
    email: "fatima.khalid@example.ps",
    phone: "+970-59-234-5678",
    homeAddress: {
      textAr: "شارع البيرة الرئيسي، البيرة",
      textEn: "Al-Bireh Main Street, Al-Bireh",
      coordinates: { type: "Point", coordinates: [35.2134, 31.9073] },
    },
    districtId: "district_4",
    districtName: "University Zone",
    language: "ar",
    notificationPrefs: { pushEnabled: true, emailEnabled: true, categories: ["water", "waste"] },
    civicScore: 220,
    badges: ["first_report", "active_reporter", "top_citizen"],
    totalReports: 18,
    resolvedReports: 15,
    createdAt: isoDate("2025-11-20T09:00:00Z"),
    lastLogin: isoDate("2026-05-15T07:30:00Z"),
    isActive: true,
  },
  {
    _id: userIds.omar,
    userId: "USR-2026-00003",
    nameAr: "عمر النبالسي",
    nameEn: "Omar Al-Nabulsi",
    age: 45,
    gender: "male",
    nationalId: "b5d3e9f0a2c4d6e8b0c2d4f6a8b0c2d4e6",
    email: "omar.nabulsi@example.ps",
    phone: "+970-59-345-6789",
    homeAddress: {
      textAr: "حي الماصيون، رام الله",
      textEn: "Masyoun Quarter, Ramallah",
      coordinates: { type: "Point", coordinates: [35.1980, 31.9100] },
    },
    districtId: "district_1",
    districtName: "Central Business District",
    language: "ar",
    notificationPrefs: { pushEnabled: false, emailEnabled: true, categories: ["traffic", "infrastructure"] },
    civicScore: 75,
    badges: ["first_report"],
    totalReports: 4,
    resolvedReports: 3,
    createdAt: isoDate("2026-02-10T14:00:00Z"),
    lastLogin: isoDate("2026-05-08T11:00:00Z"),
    isActive: true,
  },
  {
    _id: userIds.sara,
    userId: "USR-2026-00004",
    nameAr: "سارة أبو رمان",
    nameEn: "Sara Abu Rumman",
    age: 26,
    gender: "female",
    nationalId: "c6e4f0a1b3c5d7e9f1a3b5d7e9f1a3b5c7",
    email: "sara.aburumman@example.ps",
    phone: "+970-59-456-7890",
    homeAddress: {
      textAr: "شارع الإرسال، رام الله",
      textEn: "Al-Irsal Street, Ramallah",
      coordinates: { type: "Point", coordinates: [35.2010, 31.9050] },
    },
    districtId: "district_1",
    districtName: "Central Business District",
    language: "en",
    notificationPrefs: { pushEnabled: true, emailEnabled: true, categories: ["street_lighting", "infrastructure", "water"] },
    civicScore: 310,
    badges: ["first_report", "active_reporter", "top_citizen", "neighborhood_volunteer"],
    totalReports: 27,
    resolvedReports: 22,
    createdAt: isoDate("2025-09-05T08:00:00Z"),
    lastLogin: isoDate("2026-05-18T06:45:00Z"),
    isActive: true,
  },
  {
    _id: userIds.khalid,
    userId: "USR-2026-00005",
    nameAr: "خالد الجعبري",
    nameEn: "Khalid Al-Ja'bari",
    age: 52,
    gender: "male",
    nationalId: "d7f5a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8",
    email: "khalid.jaabari@example.ps",
    phone: "+970-59-567-8901",
    homeAddress: {
      textAr: "حي الطيرة، رام الله",
      textEn: "Al-Tira Quarter, Ramallah",
      coordinates: { type: "Point", coordinates: [35.1920, 31.9140] },
    },
    districtId: "district_2",
    districtName: "Northern Residential",
    language: "ar",
    notificationPrefs: { pushEnabled: true, emailEnabled: false, categories: ["waste", "water"] },
    civicScore: 55,
    badges: ["first_report"],
    totalReports: 3,
    resolvedReports: 2,
    createdAt: isoDate("2026-03-22T12:30:00Z"),
    lastLogin: isoDate("2026-05-01T09:00:00Z"),
    isActive: true,
  },
  {
    _id: userIds.rania,
    userId: "USR-2026-00006",
    nameAr: "رانية الشيخ",
    nameEn: "Rania Al-Sheikh",
    age: 31,
    gender: "female",
    nationalId: "e8a6b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9",
    email: "rania.sheikh@example.ps",
    phone: "+970-59-678-9012",
    homeAddress: {
      textAr: "شارع الجامعة، البيرة",
      textEn: "University Street, Al-Bireh",
      coordinates: { type: "Point", coordinates: [35.2160, 31.9090] },
    },
    districtId: "district_4",
    districtName: "University Zone",
    language: "ar",
    notificationPrefs: { pushEnabled: true, emailEnabled: true, categories: ["street_lighting", "traffic"] },
    civicScore: 185,
    badges: ["first_report", "active_reporter"],
    totalReports: 14,
    resolvedReports: 11,
    createdAt: isoDate("2026-01-08T10:00:00Z"),
    lastLogin: isoDate("2026-05-17T14:00:00Z"),
    isActive: true,
  },
  {
    _id: userIds.tariq,
    userId: "USR-2026-00007",
    nameAr: "طارق موسى",
    nameEn: "Tariq Musa",
    age: 38,
    gender: "male",
    nationalId: "f9b7c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0",
    email: "tariq.musa@example.ps",
    phone: "+970-59-789-0123",
    homeAddress: {
      textAr: "المنطقة الصناعية، رام الله",
      textEn: "Industrial Zone, Ramallah",
      coordinates: { type: "Point", coordinates: [35.1750, 31.8980] },
    },
    districtId: "district_3",
    districtName: "Industrial Zone",
    language: "ar",
    notificationPrefs: { pushEnabled: false, emailEnabled: false, categories: ["traffic", "waste"] },
    civicScore: 40,
    badges: ["first_report"],
    totalReports: 2,
    resolvedReports: 2,
    createdAt: isoDate("2026-04-01T16:00:00Z"),
    lastLogin: isoDate("2026-04-20T10:00:00Z"),
    isActive: true,
  },
  {
    _id: userIds.maya,
    userId: "USR-2026-00008",
    nameAr: "مايا حداد",
    nameEn: "Maya Haddad",
    age: 24,
    gender: "female",
    nationalId: "a0c8d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1",
    email: "maya.haddad@example.ps",
    phone: "+970-59-890-1234",
    homeAddress: {
      textAr: "حي البالوع، البيرة",
      textEn: "Al-Balu Quarter, Al-Bireh",
      coordinates: { type: "Point", coordinates: [35.2200, 31.8990] },
    },
    districtId: "district_7",
    districtName: "Southern Suburb",
    language: "en",
    notificationPrefs: { pushEnabled: true, emailEnabled: true, categories: ["water", "waste", "infrastructure"] },
    civicScore: 95,
    badges: ["first_report", "active_reporter"],
    totalReports: 7,
    resolvedReports: 5,
    createdAt: isoDate("2026-02-28T11:00:00Z"),
    lastLogin: isoDate("2026-05-16T09:30:00Z"),
    isActive: true,
  },
];

// ─────────────────────────────────────────────────────────────
// 6. SERVICE REQUESTS  (10 diverse requests across lifecycle)
// ─────────────────────────────────────────────────────────────
const serviceRequests = [
  // REQ-1: IN_PROGRESS — broken lamp post (the main scenario from use case)
  {
    _id: new ObjectId(),
    requestId: "REQ-2026-048712",
    citizenId: userIds.fatima,
    citizenName: "فاطمة خالد",
    location: { type: "Point", coordinates: [35.2134, 31.9073] },
    addressTextAr: "شارع البيرة الرئيسي، البيرة",
    addressTextEn: "Al-Bireh Main Street, Al-Bireh",
    districtId: "district_4",
    districtName: "University Zone",
    category: "street_lighting",
    subcategory: "broken_lamp_post",
    priority: 2,
    descriptionAr: "عمود الإنارة أمام المدرسة معطل منذ أسبوع، المنطقة مظلمة تماماً في الليل",
    descriptionEn: "The lamp post in front of the school has been broken for a week. The area is completely dark at night and it is dangerous for students and pedestrians.",
    photoUrls: ["https://storage.smartcity.ps/photos/REQ-2026-048712-1.jpg"],
    status: "IN_PROGRESS",
    assignedDepartmentId: "dept_street_lighting",
    assignedDepartmentName: "إدارة الإنارة العامة",
    assignedTechnicianId: techIds.lighting,
    assignedTechnicianName: "محمود العمر",
    statusHistory: [
      { status: "OPEN", timestamp: isoDate("2026-05-01T09:15:00Z"), actor: "system", actorType: "auto", commentAr: "تم استلام البلاغ تلقائياً" },
      { status: "ASSIGNED", timestamp: isoDate("2026-05-01T11:30:00Z"), actor: "supervisor_1", actorType: "supervisor", commentAr: "تم التحويل إلى إدارة الإنارة العامة" },
      { status: "IN_PROGRESS", timestamp: isoDate("2026-05-02T08:00:00Z"), actor: "tech_mahmoud", actorType: "technician", commentAr: "الفني في الطريق إلى الموقع" },
    ],
    createdAt: isoDate("2026-05-01T09:15:00Z"),
    updatedAt: isoDate("2026-05-02T08:00:00Z"),
    estimatedCompletion: isoDate("2026-05-20T17:00:00Z"),
    resolvedAt: null,
    resolutionNote: null,
    citizenRating: null,
    isDuplicate: false,
    duplicateOfId: null,
  },

  // REQ-2: RESOLVED — overflowing waste bin
  {
    _id: new ObjectId(),
    requestId: "REQ-2026-047001",
    citizenId: userIds.ahmed,
    citizenName: "أحمد المصري",
    location: { type: "Point", coordinates: [35.2050, 31.9010] },
    addressTextAr: "قرب السوق المركزي، رام الله",
    addressTextEn: "Near the Central Market, Ramallah",
    districtId: "district_1",
    districtName: "Central Business District",
    category: "waste",
    subcategory: "overflowing_bin",
    priority: 2,
    descriptionAr: "حاوية النفايات أمام السوق المركزي ممتلئة منذ يومين وتسبب رائحة كريهة",
    descriptionEn: "The waste bin in front of the central market has been overflowing for two days causing bad smell and attracting insects.",
    photoUrls: ["https://storage.smartcity.ps/photos/REQ-2026-047001-1.jpg", "https://storage.smartcity.ps/photos/REQ-2026-047001-2.jpg"],
    status: "RESOLVED",
    assignedDepartmentId: "dept_sanitation",
    assignedDepartmentName: "دائرة الصحة والنظافة",
    assignedTechnicianId: techIds.sanitation,
    assignedTechnicianName: "يوسف الرفاعي",
    statusHistory: [
      { status: "OPEN", timestamp: isoDate("2026-04-28T10:00:00Z"), actor: "system", actorType: "auto", commentAr: "تم استلام البلاغ" },
      { status: "ASSIGNED", timestamp: isoDate("2026-04-28T11:00:00Z"), actor: "supervisor_2", actorType: "supervisor", commentAr: "تم التحويل لدائرة الصحة" },
      { status: "IN_PROGRESS", timestamp: isoDate("2026-04-29T07:30:00Z"), actor: "tech_youssef", actorType: "technician", commentAr: "الفريق في الطريق" },
      { status: "RESOLVED", timestamp: isoDate("2026-04-29T09:15:00Z"), actor: "tech_youssef", actorType: "technician", commentAr: "تم تفريغ الحاوية وتنظيف المنطقة المحيطة" },
    ],
    createdAt: isoDate("2026-04-28T10:00:00Z"),
    updatedAt: isoDate("2026-04-29T09:15:00Z"),
    estimatedCompletion: isoDate("2026-04-30T17:00:00Z"),
    resolvedAt: isoDate("2026-04-29T09:15:00Z"),
    resolutionNote: "Bin emptied and surrounding area cleaned. Scheduled for daily pickup.",
    citizenRating: 5,
    isDuplicate: false,
    duplicateOfId: null,
  },

  // REQ-3: OPEN — pothole
  {
    _id: new ObjectId(),
    requestId: "REQ-2026-049100",
    citizenId: userIds.omar,
    citizenName: "عمر النبالسي",
    location: { type: "Point", coordinates: [35.2015, 31.9055] },
    addressTextAr: "شارع الإرسال، بالقرب من الدوار الرئيسي",
    addressTextEn: "Al-Irsal Street, near the main roundabout",
    districtId: "district_1",
    districtName: "Central Business District",
    category: "traffic",
    subcategory: "pothole",
    priority: 2,
    descriptionAr: "حفرة كبيرة في منتصف الطريق تسبب أضراراً للسيارات وخطراً على المركبات الصغيرة",
    descriptionEn: "A large pothole in the middle of the road is causing damage to vehicles and is dangerous especially for motorcycles and cyclists.",
    photoUrls: ["https://storage.smartcity.ps/photos/REQ-2026-049100-1.jpg"],
    status: "OPEN",
    assignedDepartmentId: null,
    assignedDepartmentName: null,
    assignedTechnicianId: null,
    assignedTechnicianName: null,
    statusHistory: [
      { status: "OPEN", timestamp: isoDate("2026-05-15T08:30:00Z"), actor: "system", actorType: "auto", commentAr: "تم استلام البلاغ" },
    ],
    createdAt: isoDate("2026-05-15T08:30:00Z"),
    updatedAt: isoDate("2026-05-15T08:30:00Z"),
    estimatedCompletion: null,
    resolvedAt: null,
    resolutionNote: null,
    citizenRating: null,
    isDuplicate: false,
    duplicateOfId: null,
  },

  // REQ-4: ASSIGNED — sewage issue (water leak / foul smell scenario)
  {
    _id: new ObjectId(),
    requestId: "REQ-2026-049200",
    citizenId: userIds.sara,
    citizenName: "سارة أبو رمان",
    location: { type: "Point", coordinates: [35.2090, 31.9060] },
    addressTextAr: "بالقرب من مدرسة البيرة، شارع البيرة",
    addressTextEn: "Near Al-Bireh school, Al-Bireh Street",
    districtId: "district_4",
    districtName: "University Zone",
    category: "water",
    subcategory: "sewage_issue",
    priority: 1,
    descriptionAr: "هناك رائحة كريهة بالقرب من المدرسة في شارع البيرة، يبدو أنه تسرب في أنبوب الصرف الصحي تحت الأرض",
    descriptionEn: "There is a foul smell near the school on Al-Bireh Street. It looks like a broken sewage pipe underground. Water is seeping through cracks in the pavement and the smell is getting worse.",
    photoUrls: ["https://storage.smartcity.ps/photos/REQ-2026-049200-1.jpg", "https://storage.smartcity.ps/photos/REQ-2026-049200-2.jpg"],
    status: "ASSIGNED",
    assignedDepartmentId: "dept_public_works",
    assignedDepartmentName: "دائرة الأشغال العامة",
    assignedTechnicianId: null,
    assignedTechnicianName: null,
    statusHistory: [
      { status: "OPEN", timestamp: isoDate("2026-05-17T07:00:00Z"), actor: "system", actorType: "auto", commentAr: "تم استلام البلاغ" },
      { status: "ASSIGNED", timestamp: isoDate("2026-05-17T08:30:00Z"), actor: "supervisor_pw", actorType: "supervisor", commentAr: "تم التحويل لدائرة الأشغال - أولوية عالية" },
    ],
    createdAt: isoDate("2026-05-17T07:00:00Z"),
    updatedAt: isoDate("2026-05-17T08:30:00Z"),
    estimatedCompletion: null,
    resolvedAt: null,
    resolutionNote: null,
    citizenRating: null,
    isDuplicate: false,
    duplicateOfId: null,
  },

  // REQ-5: CLOSED (with rating) — flickering light
  {
    _id: new ObjectId(),
    requestId: "REQ-2026-046500",
    citizenId: userIds.rania,
    citizenName: "رانية الشيخ",
    location: { type: "Point", coordinates: [35.2160, 31.9080] },
    addressTextAr: "شارع الجامعة، البيرة",
    addressTextEn: "University Street, Al-Bireh",
    districtId: "district_4",
    districtName: "University Zone",
    category: "street_lighting",
    subcategory: "flickering_light",
    priority: 3,
    descriptionAr: "مصباح الشارع أمام البيت يومض طوال الليل ويزعج السكان ويمنع النوم",
    descriptionEn: "The street lamp in front of our building flickers continuously throughout the night, disturbing residents and preventing sleep.",
    photoUrls: [],
    status: "CLOSED",
    assignedDepartmentId: "dept_street_lighting",
    assignedDepartmentName: "إدارة الإنارة العامة",
    assignedTechnicianId: techIds.lighting,
    assignedTechnicianName: "محمود العمر",
    statusHistory: [
      { status: "OPEN", timestamp: isoDate("2026-04-20T22:00:00Z"), actor: "system", actorType: "auto", commentAr: "تم استلام البلاغ" },
      { status: "ASSIGNED", timestamp: isoDate("2026-04-21T09:00:00Z"), actor: "supervisor_1", actorType: "supervisor", commentAr: "تحويل للإنارة" },
      { status: "IN_PROGRESS", timestamp: isoDate("2026-04-22T08:00:00Z"), actor: "tech_mahmoud", actorType: "technician", commentAr: "الفني توجه للموقع" },
      { status: "RESOLVED", timestamp: isoDate("2026-04-22T10:30:00Z"), actor: "tech_mahmoud", actorType: "technician", commentAr: "تم استبدال الوحدة المعيبة" },
      { status: "CLOSED", timestamp: isoDate("2026-04-25T09:00:00Z"), actor: "system", actorType: "auto", commentAr: "تم إغلاق البلاغ بعد تقييم المواطن" },
    ],
    createdAt: isoDate("2026-04-20T22:00:00Z"),
    updatedAt: isoDate("2026-04-25T09:00:00Z"),
    estimatedCompletion: isoDate("2026-04-23T17:00:00Z"),
    resolvedAt: isoDate("2026-04-22T10:30:00Z"),
    resolutionNote: "Faulty ballast unit replaced. Light functioning correctly.",
    citizenRating: 4,
    isDuplicate: false,
    duplicateOfId: null,
  },

  // REQ-6: OPEN — water leak near central market (for hotspot detection demo)
  {
    _id: new ObjectId(),
    requestId: "REQ-2026-049300",
    citizenId: userIds.khalid,
    citizenName: "خالد الجعبري",
    location: { type: "Point", coordinates: [35.2055, 31.9015] },
    addressTextAr: "بالقرب من السوق المركزي، رام الله",
    addressTextEn: "Near the central market, Ramallah",
    districtId: "district_1",
    districtName: "Central Business District",
    category: "water",
    subcategory: "water_leak",
    priority: 1,
    descriptionAr: "تسرب مياه من الأرض بالقرب من السوق المركزي، يتدفق الماء بقوة",
    descriptionEn: "Water leaking from the ground near the central market. Water is gushing through a crack in the pavement and wasting a lot of water.",
    photoUrls: ["https://storage.smartcity.ps/photos/REQ-2026-049300-1.jpg"],
    status: "OPEN",
    assignedDepartmentId: null,
    assignedDepartmentName: null,
    assignedTechnicianId: null,
    assignedTechnicianName: null,
    statusHistory: [
      { status: "OPEN", timestamp: isoDate("2026-05-18T06:45:00Z"), actor: "system", actorType: "auto", commentAr: "تم استلام البلاغ" },
    ],
    createdAt: isoDate("2026-05-18T06:45:00Z"),
    updatedAt: isoDate("2026-05-18T06:45:00Z"),
    estimatedCompletion: null,
    resolvedAt: null,
    resolutionNote: null,
    citizenRating: null,
    isDuplicate: false,
    duplicateOfId: null,
  },

  // REQ-7: OPEN — drainage issue near central market (hotspot cluster)
  {
    _id: new ObjectId(),
    requestId: "REQ-2026-049310",
    citizenId: userIds.maya,
    citizenName: "مايا حداد",
    location: { type: "Point", coordinates: [35.2048, 31.9008] },
    addressTextAr: "السوق المركزي، رام الله - الجانب الشرقي",
    addressTextEn: "Central Market, Ramallah - East side",
    districtId: "district_1",
    districtName: "Central Business District",
    category: "waste",
    subcategory: "blocked_drainage",
    priority: 1,
    descriptionAr: "انسداد في قناة الصرف الصحي على الجانب الشرقي من السوق المركزي يسبب تجمع المياه",
    descriptionEn: "Blocked drainage channel on the east side of the central market causing water to pool on the ground. The drainage overflow smells like sewage and is affecting nearby shops.",
    photoUrls: ["https://storage.smartcity.ps/photos/REQ-2026-049310-1.jpg"],
    status: "OPEN",
    assignedDepartmentId: null,
    assignedDepartmentName: null,
    assignedTechnicianId: null,
    assignedTechnicianName: null,
    statusHistory: [
      { status: "OPEN", timestamp: isoDate("2026-05-18T11:00:00Z"), actor: "system", actorType: "auto", commentAr: "تم استلام البلاغ" },
    ],
    createdAt: isoDate("2026-05-18T11:00:00Z"),
    updatedAt: isoDate("2026-05-18T11:00:00Z"),
    estimatedCompletion: null,
    resolvedAt: null,
    resolutionNote: null,
    citizenRating: null,
    isDuplicate: false,
    duplicateOfId: null,
  },

  // REQ-8: REJECTED — duplicate
  {
    _id: new ObjectId(),
    requestId: "REQ-2026-049320",
    citizenId: userIds.tariq,
    citizenName: "طارق موسى",
    location: { type: "Point", coordinates: [35.2050, 31.9012] },
    addressTextAr: "السوق المركزي، رام الله",
    addressTextEn: "Central Market, Ramallah",
    districtId: "district_1",
    districtName: "Central Business District",
    category: "water",
    subcategory: "water_leak",
    priority: 1,
    descriptionAr: "مياه تتسرب من الأرض في السوق",
    descriptionEn: "Water leaking from the ground in the market area.",
    photoUrls: [],
    status: "REJECTED",
    assignedDepartmentId: null,
    assignedDepartmentName: null,
    assignedTechnicianId: null,
    assignedTechnicianName: null,
    statusHistory: [
      { status: "OPEN", timestamp: isoDate("2026-05-18T12:00:00Z"), actor: "system", actorType: "auto", commentAr: "تم استلام البلاغ" },
      { status: "REJECTED", timestamp: isoDate("2026-05-18T12:05:00Z"), actor: "system", actorType: "auto", commentAr: "بلاغ مكرر - تم دمجه مع REQ-2026-049300" },
    ],
    createdAt: isoDate("2026-05-18T12:00:00Z"),
    updatedAt: isoDate("2026-05-18T12:05:00Z"),
    estimatedCompletion: null,
    resolvedAt: null,
    resolutionNote: "Duplicate of REQ-2026-049300",
    citizenRating: null,
    isDuplicate: true,
    duplicateOfId: "REQ-2026-049300",
  },

  // REQ-9: IN_PROGRESS — damaged sidewalk (infrastructure)
  {
    _id: new ObjectId(),
    requestId: "REQ-2026-048900",
    citizenId: userIds.sara,
    citizenName: "سارة أبو رمان",
    location: { type: "Point", coordinates: [35.1990, 31.9040] },
    addressTextAr: "شارع الجامعة عند مدخل البنك، رام الله",
    addressTextEn: "University Street at the bank entrance, Ramallah",
    districtId: "district_1",
    districtName: "Central Business District",
    category: "infrastructure",
    subcategory: "damaged_sidewalk",
    priority: 2,
    descriptionAr: "الرصيف أمام البنك مكسور ويشكل خطراً على المشاة خاصة كبار السن",
    descriptionEn: "The sidewalk in front of the bank is broken and cracked, forming a serious hazard especially for elderly people and those with disabilities.",
    photoUrls: ["https://storage.smartcity.ps/photos/REQ-2026-048900-1.jpg"],
    status: "IN_PROGRESS",
    assignedDepartmentId: "dept_public_works",
    assignedDepartmentName: "دائرة الأشغال العامة",
    assignedTechnicianId: techIds.publicWorks,
    assignedTechnicianName: "نضال أبو صالح",
    statusHistory: [
      { status: "OPEN", timestamp: isoDate("2026-05-05T09:00:00Z"), actor: "system", actorType: "auto", commentAr: "تم استلام البلاغ" },
      { status: "ASSIGNED", timestamp: isoDate("2026-05-05T11:00:00Z"), actor: "supervisor_pw", actorType: "supervisor", commentAr: "تحويل للأشغال العامة" },
      { status: "IN_PROGRESS", timestamp: isoDate("2026-05-10T08:00:00Z"), actor: "tech_nidal", actorType: "technician", commentAr: "تم تجهيز الفريق والمواد اللازمة" },
    ],
    createdAt: isoDate("2026-05-05T09:00:00Z"),
    updatedAt: isoDate("2026-05-10T08:00:00Z"),
    estimatedCompletion: isoDate("2026-05-22T17:00:00Z"),
    resolvedAt: null,
    resolutionNote: null,
    citizenRating: null,
    isDuplicate: false,
    duplicateOfId: null,
  },

  // REQ-10: RESOLVED — illegal dumping
  {
    _id: new ObjectId(),
    requestId: "REQ-2026-047800",
    citizenId: userIds.ahmed,
    citizenName: "أحمد المصري",
    location: { type: "Point", coordinates: [35.1760, 31.8990] },
    addressTextAr: "المنطقة الصناعية، خلف المصنع الكبير",
    addressTextEn: "Industrial Zone, behind the large factory",
    districtId: "district_3",
    districtName: "Industrial Zone",
    category: "waste",
    subcategory: "illegal_dumping",
    priority: 1,
    descriptionAr: "مكب نفايات غير قانوني خلف المصنع الكبير في المنطقة الصناعية، روائح كريهة وحشرات",
    descriptionEn: "Illegal waste dump site found behind the large factory in the industrial zone. Hazardous materials appear to be among the waste. Strong odors and insects are spreading.",
    photoUrls: ["https://storage.smartcity.ps/photos/REQ-2026-047800-1.jpg", "https://storage.smartcity.ps/photos/REQ-2026-047800-2.jpg"],
    status: "RESOLVED",
    assignedDepartmentId: "dept_sanitation",
    assignedDepartmentName: "دائرة الصحة والنظافة",
    assignedTechnicianId: techIds.sanitation,
    assignedTechnicianName: "يوسف الرفاعي",
    statusHistory: [
      { status: "OPEN", timestamp: isoDate("2026-05-10T07:00:00Z"), actor: "system", actorType: "auto", commentAr: "تم استلام البلاغ" },
      { status: "ASSIGNED", timestamp: isoDate("2026-05-10T08:00:00Z"), actor: "supervisor_2", actorType: "supervisor", commentAr: "أولوية قصوى - إحالة لدائرة الصحة" },
      { status: "IN_PROGRESS", timestamp: isoDate("2026-05-11T06:30:00Z"), actor: "tech_youssef", actorType: "technician", commentAr: "تم إرسال شاحنة متخصصة" },
      { status: "RESOLVED", timestamp: isoDate("2026-05-12T14:00:00Z"), actor: "tech_youssef", actorType: "technician", commentAr: "تم تنظيف المنطقة بالكامل وتحرير مخالفة للمسؤول" },
    ],
    createdAt: isoDate("2026-05-10T07:00:00Z"),
    updatedAt: isoDate("2026-05-12T14:00:00Z"),
    estimatedCompletion: isoDate("2026-05-13T17:00:00Z"),
    resolvedAt: isoDate("2026-05-12T14:00:00Z"),
    resolutionNote: "Area fully cleaned. Violation issued to responsible party. Site marked for monitoring.",
    citizenRating: 5,
    isDuplicate: false,
    duplicateOfId: null,
  },
];

// ─────────────────────────────────────────────────────────────
// 7. GEO POINTS  (10 sample infrastructure points)
// ─────────────────────────────────────────────────────────────
const geopoints = [
  { _id: new ObjectId(), pointId: "GP-001001", nameAr: "عمود إنارة - شارع البيرة", type: "lamp_post", location: { type: "Point", coordinates: [35.2134, 31.9073] }, districtId: "district_4", installDate: isoDate("2019-03-10"), lastMaintenance: isoDate("2024-11-20"), status: "active", metadata: { manufacturer: "Philips", wattage: 150 } },
  { _id: new ObjectId(), pointId: "GP-001002", nameAr: "حاوية نفايات - السوق المركزي", type: "waste_bin", location: { type: "Point", coordinates: [35.2050, 31.9010] }, districtId: "district_1", installDate: isoDate("2020-06-01"), lastMaintenance: isoDate("2025-01-15"), status: "active", metadata: { capacity_liters: 1100, material: "steel" } },
  { _id: new ObjectId(), pointId: "GP-001003", nameAr: "إشارة ضوئية - دوار المنارة", type: "traffic_signal", location: { type: "Point", coordinates: [35.2010, 31.9040] }, districtId: "district_1", installDate: isoDate("2018-09-15"), lastMaintenance: isoDate("2024-08-10"), status: "active", metadata: { controller: "Siemens", cycles_per_min: 3 } },
  { _id: new ObjectId(), pointId: "GP-001004", nameAr: "عمود إنارة - شارع الجامعة", type: "lamp_post", location: { type: "Point", coordinates: [35.2160, 31.9085] }, districtId: "district_4", installDate: isoDate("2021-02-20"), lastMaintenance: isoDate("2025-03-01"), status: "active", metadata: { manufacturer: "GE", wattage: 200 } },
  { _id: new ObjectId(), pointId: "GP-001005", nameAr: "حاوية نفايات - حي الطيرة", type: "waste_bin", location: { type: "Point", coordinates: [35.1930, 31.9145] }, districtId: "district_2", installDate: isoDate("2022-04-10"), lastMaintenance: isoDate("2024-12-10"), status: "active", metadata: { capacity_liters: 660, material: "plastic" } },
  { _id: new ObjectId(), pointId: "GP-001006", nameAr: "بالوعة صرف - شارع الوحدة", type: "drain", location: { type: "Point", coordinates: [35.2040, 31.9030] }, districtId: "district_1", installDate: isoDate("2010-01-01"), lastMaintenance: isoDate("2023-07-20"), status: "needs_maintenance", metadata: { diameter_cm: 60 } },
  { _id: new ObjectId(), pointId: "GP-001007", nameAr: "مقعد عام - حديقة رام الله", type: "bench", location: { type: "Point", coordinates: [35.2020, 31.9070] }, districtId: "district_1", installDate: isoDate("2023-05-15"), lastMaintenance: isoDate("2025-02-01"), status: "active", metadata: { material: "wood_metal", seats: 2 } },
  { _id: new ObjectId(), pointId: "GP-001008", nameAr: "عمود إنارة - المنطقة الصناعية", type: "lamp_post", location: { type: "Point", coordinates: [35.1770, 31.8985] }, districtId: "district_3", installDate: isoDate("2017-11-05"), lastMaintenance: isoDate("2023-09-10"), status: "active", metadata: { manufacturer: "Osram", wattage: 250 } },
  { _id: new ObjectId(), pointId: "GP-001009", nameAr: "حاوية نفايات - منطقة الجامعة", type: "waste_bin", location: { type: "Point", coordinates: [35.2155, 31.9065] }, districtId: "district_4", installDate: isoDate("2021-08-20"), lastMaintenance: isoDate("2025-01-30"), status: "active", metadata: { capacity_liters: 660, material: "steel" } },
  { _id: new ObjectId(), pointId: "GP-001010", nameAr: "إشارة ضوئية - تقاطع البيرة", type: "traffic_signal", location: { type: "Point", coordinates: [35.2140, 31.9078] }, districtId: "district_4", installDate: isoDate("2019-12-01"), lastMaintenance: isoDate("2024-06-15"), status: "active", metadata: { controller: "Siemens", cycles_per_min: 4 } },
];

// ─────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────────────────────
async function seed() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB at", MONGO_URI);
    const db = client.db(DB_NAME);

    // Drop existing collections for clean re-seed
    const collectionsToDrop = ["users", "departments", "areas", "categories", "technicians", "service_requests", "geopoints"];
    for (const col of collectionsToDrop) {
      await db.collection(col).drop().catch(() => {}); // ignore if doesn't exist
    }
    console.log("🗑️  Dropped existing collections");

    // Insert all data
    await db.collection("departments").insertMany(departments);
    console.log(`📦 Inserted ${departments.length} departments`);

    await db.collection("areas").insertMany(areas);
    console.log(`📦 Inserted ${areas.length} areas`);

    await db.collection("categories").insertMany(categories);
    console.log(`📦 Inserted ${categories.length} categories`);

    await db.collection("technicians").insertMany(technicians);
    console.log(`📦 Inserted ${technicians.length} technicians`);

    await db.collection("users").insertMany(users);
    console.log(`📦 Inserted ${users.length} users`);

    await db.collection("service_requests").insertMany(serviceRequests);
    console.log(`📦 Inserted ${serviceRequests.length} service requests`);

    await db.collection("geopoints").insertMany(geopoints);
    console.log(`📦 Inserted ${geopoints.length} geopoints`);

    console.log("\n🎉 Seed complete! Database:", DB_NAME);
    console.log("   Collections: users, departments, areas, categories, technicians, service_requests, geopoints");
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    throw err;
  } finally {
    await client.close();
  }
}

seed();
