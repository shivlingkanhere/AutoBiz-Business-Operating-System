import { Router, type IRouter } from "express";
import healthRouter from "./health";
import autobizRouter from "./autobiz";
import archiveRouter from "./archive";

const router: IRouter = Router();

router.use(healthRouter);
router.use(autobizRouter);
router.use(archiveRouter);

export default router;
