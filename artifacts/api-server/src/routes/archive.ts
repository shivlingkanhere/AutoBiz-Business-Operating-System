import { Router, type IRouter, type Request } from "express";
import { getAuth } from "@clerk/express";
import { getDatabaseStorageUsage } from "../services/archive/storage-monitor";

const router: IRouter = Router();

router.get("/archive/storage", async (req: Request, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    const usage = await getDatabaseStorageUsage();

    return res.json({
      success: true,
      ...usage,
    });
  } catch (error) {
    console.error("Failed to read database storage usage:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to read database storage usage",
    });
  }
});

export default router;
