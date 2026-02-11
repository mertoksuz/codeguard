import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { healthRouter } from "./routes/health";
import { reviewsRouter } from "./routes/reviews";
import { rulesRouter } from "./routes/rules";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || process.env.API_PORT || 4000;

const allowedOrigins = [
  process.env.NEXTAUTH_URL || "http://localhost:3000",
  "https://codeguard-ai.vercel.app",
  /\.vercel\.app$/,
];

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(morgan("short"));
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/health", healthRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/rules", rulesRouter);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 CodeGuard API running on port ${PORT}`);
});

export default app;
