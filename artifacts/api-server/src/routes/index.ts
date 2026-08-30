import { Router, type IRouter } from "express";
import healthRouter from "./health";
import autobizRouter from "./autobiz";

const router: IRouter = Router();

router.use(healthRouter);
router.use(autobizRouter);

export default router;
