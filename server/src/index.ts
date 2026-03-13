// only load .env file in local dev
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
import cors from "cors";
import express from "express";
import chatRoutes from "./routes/chat";
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
app.use("/api/chat", chatRoutes);
app.use("/api/handbook", handbookRoutes);
app.use("/api/logs", logsRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

export default app;
