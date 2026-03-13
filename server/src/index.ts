import cors from "cors";
import express from "express";
import chatRoutes from "./routes/chat";
import handbookRoutes from "./routes/handbook";
import logsRoutes from "./routes/logs";

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const app = express();

app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      /\.vercel\.app$/,
    ]
  })
);

app.use(express.json());
app.use("/api/chat", chatRoutes);
app.use("/api/handbook", handbookRoutes);
app.use("/api/logs", logsRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(3001, () => {
    console.log(`Server listening on http://localhost:3001`);
  });
}

export default app;