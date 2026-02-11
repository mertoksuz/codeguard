import { Router } from "express";

export const reviewsRouter = Router();

reviewsRouter.get("/", async (_req, res) => {
  // TODO: Fetch from DB
  res.json({ success: true, data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } });
});

reviewsRouter.get("/:id", async (req, res) => {
  res.json({ success: true, data: null });
});

reviewsRouter.post("/analyze", async (req, res) => {
  const { repositoryFullName, prNumber } = req.body;
  // TODO: Queue analysis job
  res.json({ success: true, data: { message: `Analysis queued for ${repositoryFullName}#${prNumber}` } });
});

reviewsRouter.post("/:id/fix", async (req, res) => {
  // TODO: Queue fix generation job
  res.json({ success: true, data: { message: "Fix generation queued" } });
});
