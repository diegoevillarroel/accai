import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cuentaRouter from "./cuenta";
import reelsRouter from "./reels";
import competitorsRouter from "./competitors";
import accaiSessionsRouter from "./accai-sessions";
import accaiStreamRouter from "./accai-stream";
import planRouter from "./plan";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cuentaRouter);
router.use(reelsRouter);
router.use(competitorsRouter);
router.use(accaiSessionsRouter);
router.use(accaiStreamRouter);
router.use(planRouter);

export default router;
