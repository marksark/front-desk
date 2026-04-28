import cors from "cors";
import express from "express";
import path from "path";
import { config as loadEnv } from "dotenv";
import chatRoutes from "./routes/chat";
import formTemplateRoutes from "./routes/formTemplate";
import formSubmissionsRoutes from "./routes/formSubmissions";
import handbookRoutes from "./routes/handbook";
import logsRoutes from "./routes/logs";
import tenantsRoutes from "./routes/tenants";

if (process.env.NODE_ENV !== "production") {
  // Resolve .env from this package, not process.cwd() (reliable in npm workspaces)
  loadEnv({ path: path.join(__dirname, "../.env") });
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

if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`[api] ${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });
}

app.use("/api/chat", chatRoutes);
app.use("/api/form-template", formTemplateRoutes);
app.use("/api/form-submissions", formSubmissionsRoutes);
app.use("/api/handbook", handbookRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/tenants", tenantsRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// serve static client files
app.use(express.static(path.join(__dirname, '../../client/dist')))

// catch-all for React Router
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'))
})

if (process.env.NODE_ENV !== 'production') {
  app.listen(3001, () => {
    console.log(`Server listening on http://localhost:3001`);
  });
}

export default app;