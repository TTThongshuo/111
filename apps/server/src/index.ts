import cors from "cors";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { nanoid } from "nanoid";
import QRCode from "qrcode";
import sharp from "sharp";
import { z } from "zod";

const PORT = Number(process.env.PORT ?? 5179);
const HOST = process.env.HOST ?? "0.0.0.0";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? `http://localhost:${PORT}`;

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

const dataDir = path.resolve(process.cwd(), "data");
const outputDir = path.join(dataDir, "output");
fs.mkdirSync(outputDir, { recursive: true });

app.use("/static", express.static(outputDir));

type DeviceSeed = {
  deviceId: string;
  name: string;
  locationId: string;
  language: Language;
};

type LocationSeed = { locationId: string; name: string };
type StyleSeed = { styleId: string; name: Record<Language, string> };
type TemplateSeed = {
  templateId: string;
  styleId: string;
  locationId: string;
  name: Record<Language, string>;
  backgroundLabel: string;
};

const Languages = ["zh-CN", "zh-TW", "ja-JP", "ko-KR", "en-US"] as const;
type Language = (typeof Languages)[number];

const dbPath = path.resolve(process.cwd(), "data", "app.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS locations (
  location_id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location_id TEXT NOT NULL,
  language TEXT NOT NULL,
  last_seen_ms INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS styles (
  style_id TEXT PRIMARY KEY,
  name_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS templates (
  template_id TEXT PRIMARY KEY,
  style_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  name_json TEXT NOT NULL,
  background_label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  job_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  gender TEXT NOT NULL,
  style_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_ms INTEGER NOT NULL,
  done_ms INTEGER,
  output_path TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  order_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_ms INTEGER NOT NULL,
  paid_ms INTEGER
);
`);

const seeds: {
  locations: LocationSeed[];
  devices: DeviceSeed[];
  styles: StyleSeed[];
  templates: TemplateSeed[];
} = {
  locations: [
    { locationId: "tiananmen", name: "天安门" },
    { locationId: "zoo", name: "动物园" }
  ],
  devices: [
    { deviceId: "T-A01", name: "天安门·A01 冰箱贴机", locationId: "tiananmen", language: "zh-CN" },
    { deviceId: "Z-A01", name: "动物园·A01 冰箱贴机", locationId: "zoo", language: "zh-CN" }
  ],
  styles: [
    {
      styleId: "realistic",
      name: { "zh-CN": "写实类", "zh-TW": "寫實類", "ja-JP": "写実", "ko-KR": "리얼", "en-US": "Realistic" }
    },
    {
      styleId: "vintage",
      name: { "zh-CN": "复古类", "zh-TW": "復古類", "ja-JP": "レトロ", "ko-KR": "빈티지", "en-US": "Vintage" }
    },
    {
      styleId: "anime",
      name: { "zh-CN": "动漫类", "zh-TW": "動漫類", "ja-JP": "アニメ", "ko-KR": "애니", "en-US": "Anime" }
    },
    {
      styleId: "cartoon",
      name: { "zh-CN": "卡通类", "zh-TW": "卡通類", "ja-JP": "カートゥーン", "ko-KR": "카툰", "en-US": "Cartoon" }
    },
    {
      styleId: "guofeng",
      name: { "zh-CN": "古风类", "zh-TW": "古風類", "ja-JP": "中国風", "ko-KR": "중국풍", "en-US": "Guofeng" }
    },
    {
      styleId: "cyberpunk",
      name: { "zh-CN": "赛博朋克", "zh-TW": "賽博龐克", "ja-JP": "サイバーパンク", "ko-KR": "사이버펑크", "en-US": "Cyberpunk" }
    },
    {
      styleId: "oil",
      name: { "zh-CN": "油画风", "zh-TW": "油畫風", "ja-JP": "油絵", "ko-KR": "유화", "en-US": "Oil painting" }
    }
  ],
  templates: [
    {
      templateId: "tiananmen-real-1",
      styleId: "realistic",
      locationId: "tiananmen",
      backgroundLabel: "天安门·经典红",
      name: { "zh-CN": "天安门·写实1", "zh-TW": "天安門·寫實1", "ja-JP": "天安門・写実1", "ko-KR": "톈안먼·리얼1", "en-US": "Tiananmen Real 1" }
    },
    {
      templateId: "tiananmen-guo-1",
      styleId: "guofeng",
      locationId: "tiananmen",
      backgroundLabel: "天安门·国潮",
      name: { "zh-CN": "天安门·古风1", "zh-TW": "天安門·古風1", "ja-JP": "天安門・中国風1", "ko-KR": "톈안먼·중국풍1", "en-US": "Tiananmen Guofeng 1" }
    },
    {
      templateId: "zoo-cartoon-1",
      styleId: "cartoon",
      locationId: "zoo",
      backgroundLabel: "动物园·可爱动物",
      name: { "zh-CN": "动物园·卡通1", "zh-TW": "動物園·卡通1", "ja-JP": "動物園・カートゥーン1", "ko-KR": "동물원·카툰1", "en-US": "Zoo Cartoon 1" }
    },
    {
      templateId: "zoo-anime-1",
      styleId: "anime",
      locationId: "zoo",
      backgroundLabel: "动物园·动漫",
      name: { "zh-CN": "动物园·动漫1", "zh-TW": "動物園·動漫1", "ja-JP": "動物園・アニメ1", "ko-KR": "동물원·애니1", "en-US": "Zoo Anime 1" }
    }
  ]
};

function seedIfNeeded() {
  const locCount = db.prepare(`SELECT COUNT(*) as c FROM locations`).get() as { c: number };
  if (locCount.c > 0) return;

  const insertLoc = db.prepare(`INSERT INTO locations (location_id, name) VALUES (?, ?)`);
  const insertDevice = db.prepare(
    `INSERT INTO devices (device_id, name, location_id, language, last_seen_ms) VALUES (?, ?, ?, ?, ?)`
  );
  const insertStyle = db.prepare(`INSERT INTO styles (style_id, name_json) VALUES (?, ?)`);
  const insertTemplate = db.prepare(
    `INSERT INTO templates (template_id, style_id, location_id, name_json, background_label) VALUES (?, ?, ?, ?, ?)`
  );

  const now = Date.now();
  db.transaction(() => {
    for (const l of seeds.locations) insertLoc.run(l.locationId, l.name);
    for (const d of seeds.devices) insertDevice.run(d.deviceId, d.name, d.locationId, d.language, now);
    for (const s of seeds.styles) insertStyle.run(s.styleId, JSON.stringify(s.name));
    for (const t of seeds.templates)
      insertTemplate.run(t.templateId, t.styleId, t.locationId, JSON.stringify(t.name), t.backgroundLabel);
  })();
}

seedIfNeeded();

const DeviceHeartbeatBody = z.object({
  status: z.string().optional()
});

app.post("/api/devices/:deviceId/heartbeat", (req, res) => {
  const parsed = DeviceHeartbeatBody.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const { deviceId } = req.params;

  const found = db.prepare(`SELECT device_id FROM devices WHERE device_id = ?`).get(deviceId) as
    | { device_id: string }
    | undefined;
  if (!found) return res.status(404).json({ error: "device_not_found" });

  db.prepare(`UPDATE devices SET last_seen_ms = ? WHERE device_id = ?`).run(Date.now(), deviceId);
  return res.json({ ok: true });
});

app.get("/api/admin/devices", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT device_id, name, location_id, language, last_seen_ms
       FROM devices
       ORDER BY device_id`
    )
    .all() as Array<{ device_id: string; name: string; location_id: string; language: string; last_seen_ms: number }>;
  res.json({
    devices: rows.map((r) => ({
      deviceId: r.device_id,
      name: r.name,
      locationId: r.location_id,
      language: r.language,
      lastSeenMs: r.last_seen_ms
    }))
  });
});

const AdminUpdateDeviceBody = z.object({
  name: z.string().min(1).optional(),
  locationId: z.string().min(1).optional(),
  language: z.enum(Languages).optional()
});

app.post("/api/admin/devices/:deviceId", (req, res) => {
  const parsed = AdminUpdateDeviceBody.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const { deviceId } = req.params;
  const d = db.prepare(`SELECT device_id FROM devices WHERE device_id = ?`).get(deviceId) as
    | { device_id: string }
    | undefined;
  if (!d) return res.status(404).json({ error: "device_not_found" });

  const current = db
    .prepare(`SELECT name, location_id, language FROM devices WHERE device_id = ?`)
    .get(deviceId) as { name: string; location_id: string; language: Language };
  const next = {
    name: parsed.data.name ?? current.name,
    locationId: parsed.data.locationId ?? current.location_id,
    language: parsed.data.language ?? current.language
  };
  db.prepare(`UPDATE devices SET name = ?, location_id = ?, language = ? WHERE device_id = ?`).run(
    next.name,
    next.locationId,
    next.language,
    deviceId
  );
  res.json({ ok: true });
});

app.get("/api/admin/templates", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT template_id, style_id, location_id, name_json, background_label
       FROM templates
       ORDER BY location_id, style_id, template_id`
    )
    .all() as Array<{
    template_id: string;
    style_id: string;
    location_id: string;
    name_json: string;
    background_label: string;
  }>;
  res.json({
    templates: rows.map((r) => ({
      templateId: r.template_id,
      styleId: r.style_id,
      locationId: r.location_id,
      name: JSON.parse(r.name_json) as Record<Language, string>,
      backgroundLabel: r.background_label
    }))
  });
});

app.get("/api/config", (req, res) => {
  const deviceId = String(req.query.deviceId ?? "");
  if (!deviceId) return res.status(400).json({ error: "missing_deviceId" });

  const device = db
    .prepare(`SELECT device_id, name, location_id, language FROM devices WHERE device_id = ?`)
    .get(deviceId) as
    | { device_id: string; name: string; location_id: string; language: Language }
    | undefined;
  if (!device) return res.status(404).json({ error: "device_not_found" });

  const styles = db.prepare(`SELECT style_id, name_json FROM styles ORDER BY style_id`).all() as Array<{
    style_id: string;
    name_json: string;
  }>;

  const templates = db
    .prepare(
      `SELECT template_id, style_id, location_id, name_json, background_label
       FROM templates
       WHERE location_id = ?
       ORDER BY style_id, template_id`
    )
    .all(device.location_id) as Array<{
    template_id: string;
    style_id: string;
    location_id: string;
    name_json: string;
    background_label: string;
  }>;

  res.json({
    device: {
      deviceId: device.device_id,
      name: device.name,
      locationId: device.location_id,
      language: device.language
    },
    styles: styles.map((s) => ({
      styleId: s.style_id,
      name: JSON.parse(s.name_json) as Record<Language, string>
    })),
    templates: templates.map((t) => ({
      templateId: t.template_id,
      styleId: t.style_id,
      locationId: t.location_id,
      name: JSON.parse(t.name_json) as Record<Language, string>,
      backgroundLabel: t.background_label
    }))
  });
});

const CreateJobBody = z.object({
  deviceId: z.string().min(1),
  gender: z.enum(["male", "female", "group"]),
  styleId: z.string().min(1),
  templateId: z.string().min(1),
  photoBase64: z.string().min(1) // dataURL or raw base64
});

async function renderMagnetPng(params: {
  templateLabel: string;
  styleLabel: string;
  genderLabel: string;
  photoBase64: string;
}): Promise<Buffer> {
  const W = 1000;
  const H = 1400;
  const framePadding = 40;
  const photoW = W - framePadding * 2;
  const photoH = 1050;

  const bgSvg = `
  <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#111827"/>
        <stop offset="100%" stop-color="#7c3aed"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" rx="40" ry="40" fill="url(#g)"/>
    <rect x="${framePadding}" y="${framePadding}" width="${photoW}" height="${photoH}" rx="28" ry="28" fill="#0b1020" opacity="0.35"/>
    <text x="${W / 2}" y="${H - 210}" font-size="52" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif">${escapeXml(
      params.templateLabel
    )}</text>
    <text x="${W / 2}" y="${H - 150}" font-size="34" text-anchor="middle" fill="#e5e7eb" font-family="Arial, sans-serif">${escapeXml(
      `${params.styleLabel} · ${params.genderLabel}`
    )}</text>
    <text x="${W / 2}" y="${H - 80}" font-size="24" text-anchor="middle" fill="#c7d2fe" font-family="Arial, sans-serif">AI Photo Magnet · Demo</text>
  </svg>`;

  const bg = sharp(Buffer.from(bgSvg)).png();

  const photoBuf = decodeBase64Image(params.photoBase64);
  const photo = await sharp(photoBuf)
    .rotate()
    .resize(photoW, photoH, { fit: "cover" })
    .png()
    .toBuffer();

  const composite = await bg
    .composite([
      { input: photo, left: framePadding, top: framePadding },
      {
        input: Buffer.from(
          `<svg width="${photoW}" height="${photoH}" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="${photoW}" height="${photoH}" rx="28" ry="28" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="6"/>
          </svg>`
        ),
        left: framePadding,
        top: framePadding
      }
    ])
    .png()
    .toBuffer();

  return composite;
}

function escapeXml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function decodeBase64Image(input: string): Buffer {
  // accepts "data:image/jpeg;base64,..." or raw base64
  const m = input.match(/^data:.*?;base64,(.+)$/);
  const b64 = m ? m[1] : input;
  return Buffer.from(b64, "base64");
}

app.post("/api/jobs", async (req, res) => {
  const parsed = CreateJobBody.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const { deviceId, gender, styleId, templateId, photoBase64 } = parsed.data;

  const device = db
    .prepare(`SELECT device_id, location_id, language FROM devices WHERE device_id = ?`)
    .get(deviceId) as { device_id: string; location_id: string; language: Language } | undefined;
  if (!device) return res.status(404).json({ error: "device_not_found" });

  const template = db
    .prepare(`SELECT template_id, style_id, location_id, name_json, background_label FROM templates WHERE template_id = ?`)
    .get(templateId) as
    | { template_id: string; style_id: string; location_id: string; name_json: string; background_label: string }
    | undefined;
  if (!template) return res.status(404).json({ error: "template_not_found" });

  // 点位限定：模板必须属于设备所在 location
  if (template.location_id !== device.location_id) {
    return res.status(403).json({ error: "template_not_allowed_for_device_location" });
  }
  if (template.style_id !== styleId) {
    return res.status(400).json({ error: "template_style_mismatch" });
  }

  const jobId = nanoid();
  db.prepare(
    `INSERT INTO jobs (job_id, device_id, gender, style_id, template_id, status, created_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(jobId, deviceId, gender, styleId, templateId, "queued", Date.now());

  // 异步“AI 生成”（demo：用 Sharp 合成）
  setTimeout(async () => {
    try {
      db.prepare(`UPDATE jobs SET status = ? WHERE job_id = ?`).run("processing", jobId);

      const lang = device.language;
      const genderLabelByLang: Record<Language, Record<"male" | "female" | "group", string>> = {
        "zh-CN": { male: "男", female: "女", group: "合照" },
        "zh-TW": { male: "男", female: "女", group: "合照" },
        "ja-JP": { male: "男性", female: "女性", group: "集合" },
        "ko-KR": { male: "남", female: "여", group: "단체" },
        "en-US": { male: "Male", female: "Female", group: "Group" }
      };

      const style = db.prepare(`SELECT name_json FROM styles WHERE style_id = ?`).get(styleId) as
        | { name_json: string }
        | undefined;
      const styleName = style ? (JSON.parse(style.name_json) as Record<Language, string>)[lang] : styleId;

      const tplName = (JSON.parse(template.name_json) as Record<Language, string>)[lang] ?? templateId;

      const png = await renderMagnetPng({
        templateLabel: tplName,
        styleLabel: styleName,
        genderLabel: genderLabelByLang[lang][gender],
        photoBase64
      });

      const outPath = path.join(outputDir, `${jobId}.png`);
      await fs.promises.writeFile(outPath, png);

      db.prepare(`UPDATE jobs SET status = ?, done_ms = ?, output_path = ? WHERE job_id = ?`).run(
        "done",
        Date.now(),
        outPath,
        jobId
      );
    } catch {
      db.prepare(`UPDATE jobs SET status = ? WHERE job_id = ?`).run("error", jobId);
    }
  }, 1500);

  res.json({ jobId });
});

app.get("/api/jobs/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = db
    .prepare(`SELECT job_id, status, output_path, device_id, template_id, created_ms, done_ms FROM jobs WHERE job_id = ?`)
    .get(jobId) as
    | {
        job_id: string;
        status: string;
        output_path: string | null;
        device_id: string;
        template_id: string;
        created_ms: number;
        done_ms: number | null;
      }
    | undefined;
  if (!job) return res.status(404).json({ error: "job_not_found" });
  res.json({
    jobId: job.job_id,
    status: job.status,
    outputUrl: job.output_path ? `${PUBLIC_BASE_URL}/static/${job.job_id}.png` : null
  });
});

const CreateOrderBody = z.object({
  jobId: z.string().min(1),
  deviceId: z.string().min(1),
  amountCents: z.number().int().positive().default(1990)
});

app.post("/api/orders", async (req, res) => {
  const parsed = CreateOrderBody.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const { jobId, deviceId, amountCents } = parsed.data;

  const job = db.prepare(`SELECT status FROM jobs WHERE job_id = ?`).get(jobId) as { status: string } | undefined;
  if (!job) return res.status(404).json({ error: "job_not_found" });
  if (job.status !== "done") return res.status(409).json({ error: "job_not_done" });

  const orderId = nanoid();
  db.prepare(
    `INSERT INTO orders (order_id, job_id, device_id, amount_cents, status, created_ms)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(orderId, jobId, deviceId, amountCents, "unpaid", Date.now());

  const payUrl = `${PUBLIC_BASE_URL}/pay/mock/${orderId}`;
  const qrPng = await QRCode.toBuffer(payUrl, { type: "png", margin: 1, width: 360 });
  const qrPath = path.join(outputDir, `${orderId}.qr.png`);
  await fs.promises.writeFile(qrPath, qrPng);

  res.json({
    orderId,
    status: "unpaid",
    payUrl,
    qrPngUrl: `${PUBLIC_BASE_URL}/static/${orderId}.qr.png`,
    downloadUrl: `${PUBLIC_BASE_URL}/download/${orderId}`
  });
});

app.get("/api/orders/:orderId", (req, res) => {
  const { orderId } = req.params;
  const row = db
    .prepare(`SELECT order_id, job_id, status, amount_cents, paid_ms FROM orders WHERE order_id = ?`)
    .get(orderId) as
    | { order_id: string; job_id: string; status: string; amount_cents: number; paid_ms: number | null }
    | undefined;
  if (!row) return res.status(404).json({ error: "order_not_found" });
  res.json({
    orderId: row.order_id,
    jobId: row.job_id,
    status: row.status,
    amountCents: row.amount_cents,
    paidMs: row.paid_ms
  });
});

app.post("/api/orders/:orderId/pay", (req, res) => {
  const { orderId } = req.params;
  const row = db.prepare(`SELECT order_id FROM orders WHERE order_id = ?`).get(orderId) as { order_id: string } | undefined;
  if (!row) return res.status(404).json({ error: "order_not_found" });
  db.prepare(`UPDATE orders SET status = ?, paid_ms = ? WHERE order_id = ?`).run("paid", Date.now(), orderId);
  res.json({ ok: true });
});

app.get("/download/:orderId", (req, res) => {
  const { orderId } = req.params;
  const order = db.prepare(`SELECT job_id, status FROM orders WHERE order_id = ?`).get(orderId) as
    | { job_id: string; status: string }
    | undefined;
  if (!order) return res.status(404).send("order_not_found");
  if (order.status !== "paid") return res.status(402).send("payment_required");

  const job = db.prepare(`SELECT output_path FROM jobs WHERE job_id = ?`).get(order.job_id) as
    | { output_path: string | null }
    | undefined;
  if (!job?.output_path) return res.status(404).send("file_not_found");

  const fileUrl = `${PUBLIC_BASE_URL}/static/${order.job_id}.png`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>保存照片</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; padding:24px; background:#0b1020; color:#fff}
      .card{max-width:520px;margin:0 auto;background:#111827;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px}
      img{width:100%;border-radius:12px}
      a{display:inline-block;margin-top:12px;padding:12px 14px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:10px}
      p{color:#cbd5e1}
    </style>
  </head>
  <body>
    <div class="card">
      <h2>扫码付款成功</h2>
      <p>长按图片可保存到手机，或点下载按钮。</p>
      <img src="${fileUrl}" alt="result"/>
      <a href="${fileUrl}" download>下载图片</a>
    </div>
  </body>
</html>`);
});

app.get("/pay/mock/:orderId", (req, res) => {
  const { orderId } = req.params;
  const order = db.prepare(`SELECT status, amount_cents FROM orders WHERE order_id = ?`).get(orderId) as
    | { status: string; amount_cents: number }
    | undefined;
  if (!order) return res.status(404).send("order_not_found");

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>模拟支付</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; padding:24px; background:#0b1020; color:#fff}
      .card{max-width:520px;margin:0 auto;background:#111827;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px}
      button{width:100%;padding:12px 14px;background:#22c55e;color:#06210f;border:0;border-radius:10px;font-weight:700}
      .muted{color:#cbd5e1}
      a{color:#a78bfa}
    </style>
  </head>
  <body>
    <div class="card">
      <h2>模拟支付页</h2>
      <p class="muted">订单：${orderId}</p>
      <p class="muted">金额：￥${(order.amount_cents / 100).toFixed(2)}</p>
      <p class="muted">状态：${order.status}</p>
      <button id="pay">点我模拟支付成功</button>
      <p class="muted" style="margin-top:12px;">支付成功后可打开：<a href="${PUBLIC_BASE_URL}/download/${orderId}">保存到手机</a></p>
    </div>
    <script>
      document.getElementById('pay').addEventListener('click', async () => {
        await fetch('${PUBLIC_BASE_URL}/api/orders/${orderId}/pay', { method: 'POST' });
        alert('已模拟支付成功！你现在可以回到机器屏幕等待自动跳转。');
        location.reload();
      });
    </script>
  </body>
</html>`);
});

app.get("/api/admin/stats/by-device", (req, res) => {
  const sinceMs = Number(req.query.sinceMs ?? 0) || 0;
  const rows = db
    .prepare(
      `SELECT device_id,
              COUNT(*) as orders,
              SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_orders,
              SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END) as paid_amount_cents
       FROM orders
       WHERE created_ms >= ?
       GROUP BY device_id
       ORDER BY device_id`
    )
    .all(sinceMs) as Array<{ device_id: string; orders: number; paid_orders: number; paid_amount_cents: number }>;

  res.json({
    sinceMs,
    byDevice: rows.map((r) => ({
      deviceId: r.device_id,
      orders: r.orders,
      paidOrders: r.paid_orders,
      paidAmountCents: r.paid_amount_cents
    }))
  });
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`server listening: ${PUBLIC_BASE_URL}`);
});

