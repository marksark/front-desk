import cors from "cors";
import express from "express";

const app = express();
const port = 3001;

app.use(
  cors({
    origin: "http://localhost:3000"
  })
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
