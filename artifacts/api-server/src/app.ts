import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";
import { getExtractsOutputBase } from "./agent/fullExtract.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve extracted static pages — each job gets its own folder
// Route: /api/extract-static/:jobId/index.html (and sub-assets)
app.use("/api/extract-static", (req, res, next) => {
  const base = getExtractsOutputBase();
  express.static(base, {
    index: "index.html",
    dotfiles: "deny",
    setHeaders(res) {
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      res.setHeader("Cache-Control", "no-cache");
    },
  })(req, res, next);
});

app.use("/api", router);

export default app;
