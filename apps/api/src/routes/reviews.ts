import { Router } from "express";
import { queuePRAnalysis } from "../services/review.service";

export const reviewsRouter: Router = Router();

reviewsRouter.get("/", async (_req, res) => {
  res.json({ success: true, data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } });
});

reviewsRouter.get("/:id", async (req, res) => {
  res.json({ success: true, data: null });
});

reviewsRouter.post("/analyze", async (req, res) => {
  try {
    const { repositoryFullName, prNumber, slackChannel, slackThreadTs } = req.body;

    if (!repositoryFullName || !prNumber) {
      res.status(400).json({ success: false, error: "repositoryFullName and prNumber are required" });
      return;
    }

    await queuePRAnalysis({
      repositoryFullName,
      prNumber: Number(prNumber),
      slackChannel,
      slackThreadTs,
    });

    res.json({ success: true, data: { message: `Analysis queued for ${repositoryFullName}#${prNumber}` } });
  } catch (err) {
    console.error("Failed to queue analysis:", err);
    res.status(500).json({ success: false, error: "Failed to queue analysis" });
  }
});

reviewsRouter.post("/:id/fix", async (req, res) => {
  res.json({ success: true, data: { message: "Fix generation queued" } });
});
