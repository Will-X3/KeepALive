require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB = require("./src/config/db");
const { notFound, errorHandler } = require("./src/middleware/errorHandler");

const authRoutes = require("./src/routes/authRoutes");
const businessRoutes = require("./src/routes/businessRoutes");
const locationRoutes = require("./src/routes/locationRoutes");
const categoryRoutes = require("./src/routes/categoryRoutes");
const cameraRoutes = require("./src/routes/cameraRoutes");
const ingestRoutes = require("./src/routes/ingestRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");

connectDB();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api", cameraRoutes); // mounts /api/locations/:locationId/cameras and /api/cameras/:id
app.use("/api", reviewRoutes); // mounts /api/locations/:locationId/reviews...
app.use("/api/ingest", ingestRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`KeepALive API listening on http://localhost:${PORT}`);
});
