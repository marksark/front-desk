import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body).toEqual({ ok: true });
  });
});
