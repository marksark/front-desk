import cors from "cors";
import express from "express";
import handbookRoutes from "./routes/handbook";
import logsRoutes from "./routes/logs";

const app = express();
const port = 3001;

app.use(
  cors({
    origin: "http://localhost:3000"
  })
);

app.use(express.json());
app.use("/api/handbook", handbookRoutes);
app.use("/api/logs", logsRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
