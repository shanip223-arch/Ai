import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agentRouter from "./agent.js";
import extractRouter from "./extract.js";
import imageRouter from "./image.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/agent", agentRouter);
router.use("/agent", extractRouter);
router.use("/agent", imageRouter);

export default router;
