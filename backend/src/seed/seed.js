require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const Category = require("../models/Category");
const User = require("../models/User");
const Business = require("../models/Business");
const Location = require("../models/Location");

// Per the plan: launch narrow. Start with a handful of categories in one
// metro, not dozens sparsely populated. Car washes first.
const CATEGORIES = [
  { name: "Car Washes", slug: "car-washes" },
  { name: "Gyms", slug: "gyms" },
  { name: "Bars", slug: "bars" },
  { name: "Restaurants", slug: "restaurants" },
  { name: "Coffee Shops", slug: "coffee-shops" },
];

// Demo data around Carlsbad, CA so the frontend's "Try demo location"
// button has something real to show without needing a business created
// through the API first. Coordinates are approximate, not real businesses.
const DEMO_LOCATIONS = [
  {
    name: "Coast Highway Car Wash",
    categorySlug: "car-washes",
    address: "2740 Carlsbad Blvd, Carlsbad, CA",
    lat: 33.1489,
    lng: -117.3453,
    status: "live",
  },
  {
    name: "Village Fitness Club",
    categorySlug: "gyms",
    address: "300 Carlsbad Village Dr, Carlsbad, CA",
    lat: 33.1587,
    lng: -117.3494,
    status: "live",
  },
  {
    name: "Tamarack Ave Coffee Co.",
    categorySlug: "coffee-shops",
    address: "3200 Tamarack Ave, Carlsbad, CA",
    lat: 33.1621,
    lng: -117.3389,
    status: "paused",
  },
  {
    name: "Harborside Grill & Bar",
    categorySlug: "bars",
    address: "4620 Harbor Dr, Carlsbad, CA",
    lat: 33.1332,
    lng: -117.3223,
    status: "live",
  },
  {
    name: "La Costa Family Kitchen",
    categorySlug: "restaurants",
    address: "7020 Avenida Encinas, Carlsbad, CA",
    lat: 33.1206,
    lng: -117.3138,
    status: "live",
  },
];

async function seed() {
  await connectDB();

  const categoryDocs = {};
  for (const category of CATEGORIES) {
    const doc = await Category.findOneAndUpdate(
      { slug: category.slug },
      { $setOnInsert: category },
      { upsert: true, new: true }
    );
    categoryDocs[category.slug] = doc;
  }
  console.log(`Seeded ${CATEGORIES.length} categories.`);

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@keepalive.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "change-me-now-12345";

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await User.create({ email: adminEmail, passwordHash, role: "admin" });
    console.log(`Created admin user: ${adminEmail} (change the password immediately)`);
  } else {
    console.log("Admin user already exists, skipping.");
  }

  // Demo business + owner, so the frontend has something to show. Business
  // status is set directly to "active" here — bypassing the normal pending
  // review flow, since this is seed data, not a real signup.
  const demoOwnerEmail = "demo-owner@keepalive.local";
  let demoOwner = await User.findOne({ email: demoOwnerEmail });
  if (!demoOwner) {
    const passwordHash = await bcrypt.hash("demo-password-12345", 12);
    demoOwner = await User.create({
      email: demoOwnerEmail,
      passwordHash,
      role: "business_owner",
    });
  }

  let demoBusiness = await Business.findOne({ ownerId: demoOwner._id, name: "KeepALive Demo Business" });
  if (!demoBusiness) {
    demoBusiness = await Business.create({
      ownerId: demoOwner._id,
      name: "KeepALive Demo Business",
      status: "active",
    });
  }

  for (const loc of DEMO_LOCATIONS) {
    const exists = await Location.findOne({ name: loc.name, businessId: demoBusiness._id });
    if (exists) continue;

    await Location.create({
      businessId: demoBusiness._id,
      categoryId: categoryDocs[loc.categorySlug]._id,
      name: loc.name,
      address: loc.address,
      geo: { type: "Point", coordinates: [loc.lng, loc.lat] },
      timezone: "America/Los_Angeles",
      status: loc.status,
    });
  }
  console.log(`Seeded ${DEMO_LOCATIONS.length} demo locations around Carlsbad, CA.`);

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

