import { z } from "zod";
import { Languages, type Language } from "./i18n";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:5179";

export type ConfigResponse = {
  device: { deviceId: string; name: string; locationId: string; language: Language };
  styles: Array<{ styleId: string; name: Record<Language, string> }>;
  templates: Array<{
    templateId: string;
    styleId: string;
    locationId: string;
    name: Record<Language, string>;
    backgroundLabel: string;
  }>;
};

export type OrderCreateResponse = {
  orderId: string;
  status: "unpaid" | "paid";
  payUrl: string;
  qrPngUrl: string;
  downloadUrl: string;
};

const ConfigSchema = z.object({
  device: z.object({
    deviceId: z.string(),
    name: z.string(),
    locationId: z.string(),
    language: z.enum(Languages)
  }),
  styles: z.array(
    z.object({
      styleId: z.string(),
      name: z.record(z.enum(Languages), z.string())
    })
  ),
  templates: z.array(
    z.object({
      templateId: z.string(),
      styleId: z.string(),
      locationId: z.string(),
      name: z.record(z.enum(Languages), z.string()),
      backgroundLabel: z.string()
    })
  )
});

const JobCreateSchema = z.object({ jobId: z.string() });
const JobGetSchema = z.object({ jobId: z.string(), status: z.string(), outputUrl: z.string().nullable() });

const OrderCreateSchema = z.object({
  orderId: z.string(),
  status: z.enum(["unpaid", "paid"]),
  payUrl: z.string(),
  qrPngUrl: z.string(),
  downloadUrl: z.string()
});

const OrderGetSchema = z.object({
  orderId: z.string(),
  jobId: z.string(),
  status: z.string(),
  amountCents: z.number(),
  paidMs: z.number().nullable()
});

async function httpJson<T>(url: string, init?: RequestInit, schema?: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`http_${res.status}`);
  const json = (await res.json()) as unknown;
  return schema ? schema.parse(json) : (json as T);
}

export const api = {
  serverUrl: SERVER_URL,

  getConfig: async (deviceId: string): Promise<ConfigResponse> =>
    httpJson(`${SERVER_URL}/api/config?deviceId=${encodeURIComponent(deviceId)}`, undefined, ConfigSchema),

  heartbeat: async (deviceId: string): Promise<{ ok: true }> =>
    httpJson(`${SERVER_URL}/api/devices/${encodeURIComponent(deviceId)}/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ok" })
    }),

  createJob: async (body: {
    deviceId: string;
    gender: "male" | "female" | "group";
    styleId: string;
    templateId: string;
    photoBase64: string;
  }): Promise<{ jobId: string }> =>
    httpJson(`${SERVER_URL}/api/jobs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, JobCreateSchema),

  getJob: async (jobId: string): Promise<{ jobId: string; status: string; outputUrl: string | null }> =>
    httpJson(`${SERVER_URL}/api/jobs/${encodeURIComponent(jobId)}`, undefined, JobGetSchema),

  createOrder: async (body: { jobId: string; deviceId: string; amountCents: number }): Promise<OrderCreateResponse> =>
    httpJson(`${SERVER_URL}/api/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, OrderCreateSchema),

  getOrder: async (orderId: string): Promise<{ orderId: string; jobId: string; status: string; amountCents: number; paidMs: number | null }> =>
    httpJson(`${SERVER_URL}/api/orders/${encodeURIComponent(orderId)}`, undefined, OrderGetSchema)
};

