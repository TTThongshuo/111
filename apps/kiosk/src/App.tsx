import { useEffect, useMemo, useRef, useState } from "react";
import "./kiosk.css";
import { type Language, t } from "./i18n";
import { api, type ConfigResponse, type OrderCreateResponse } from "./api";
import { CameraCapture } from "./components/CameraCapture";

type Step =
  | "boot"
  | "home"
  | "gender"
  | "style"
  | "template"
  | "photo"
  | "confirm"
  | "generating"
  | "payment"
  | "printing";

type Gender = "male" | "female" | "group";

function getQueryParam(name: string) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function getDeviceId(): string {
  const qp = getQueryParam("deviceId");
  if (qp) {
    localStorage.setItem("deviceId", qp);
    return qp;
  }
  return localStorage.getItem("deviceId") ?? "T-A01";
}

export default function App() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [step, setStep] = useState<Step>("boot");
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [language, setLanguage] = useState<Language>("zh-CN");

  const [gender, setGender] = useState<Gender | null>(null);
  const [styleId, setStyleId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const [order, setOrder] = useState<OrderCreateResponse | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  const heartbeatTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setStep("boot");
      const cfg = await api.getConfig(deviceId);
      if (cancelled) return;
      setConfig(cfg);
      setLanguage(cfg.device.language);
      setStep("home");
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  useEffect(() => {
    if (!config) return;
    if (heartbeatTimer.current) window.clearInterval(heartbeatTimer.current);
    heartbeatTimer.current = window.setInterval(() => {
      void api.heartbeat(config.device.deviceId).catch(() => {});
    }, 5000);
    return () => {
      if (heartbeatTimer.current) window.clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    };
  }, [config]);

  useEffect(() => {
    if (step !== "generating" || !jobId) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const j = await api.getJob(jobId);
        if (cancelled) return;
        setJobStatus(j.status);
        if (j.status === "done" && j.outputUrl) {
          setOutputUrl(j.outputUrl);
          window.clearInterval(timer);
          // 进入支付
          const created = await api.createOrder({
            jobId,
            deviceId,
            amountCents: 1990
          });
          if (cancelled) return;
          setOrder(created);
          setOrderStatus(created.status);
          setStep("payment");
        }
        if (j.status === "error") {
          window.clearInterval(timer);
          setStep("home");
        }
      } catch {
        // ignore
      }
    }, 900);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [step, jobId, deviceId]);

  useEffect(() => {
    if (step !== "payment" || !order?.orderId) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const s = await api.getOrder(order.orderId);
        if (cancelled) return;
        setOrderStatus(s.status);
        if (s.status === "paid") {
          window.clearInterval(timer);
          setStep("printing");
          // demo：模拟打印 4 秒
          window.setTimeout(() => {
            if (cancelled) return;
            resetToHome();
          }, 4000);
        }
      } catch {
        // ignore
      }
    }, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [step, order?.orderId]);

  function resetToHome() {
    setGender(null);
    setStyleId(null);
    setTemplateId(null);
    setPhotoDataUrl(null);
    setJobId(null);
    setJobStatus(null);
    setOutputUrl(null);
    setOrder(null);
    setOrderStatus(null);
    setStep("home");
  }

  const styles = config?.styles ?? [];
  const templates = config?.templates ?? [];
  const filteredTemplates = templateId
    ? templates.filter((t0) => t0.templateId === templateId)
    : styleId
      ? templates.filter((t0) => t0.styleId === styleId)
      : [];

  const selectedTemplate = useMemo(() => {
    if (!templateId) return null;
    return templates.find((x) => x.templateId === templateId) ?? null;
  }, [templates, templateId]);

  return (
    <div className="kiosk-root">
      <header className="kiosk-header">
        <div className="kiosk-title">{config?.device.name ?? t(language, "booting")}</div>
        <div className="kiosk-meta">
          <div className="kiosk-pill">{t(language, "deviceId")}: {deviceId}</div>
          <select
            className="kiosk-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            aria-label="language"
          >
            <option value="zh-CN">中国</option>
            <option value="zh-TW">台湾</option>
            <option value="ja-JP">日本語</option>
            <option value="ko-KR">한국어</option>
            <option value="en-US">English</option>
          </select>
        </div>
      </header>

      <main className="kiosk-main">
        {step === "boot" && (
          <div className="kiosk-card">
            <h2>{t(language, "booting")}</h2>
            <p className="kiosk-muted">{t(language, "bootHint")}</p>
          </div>
        )}

        {step === "home" && (
          <div className="kiosk-card">
            <h2>{t(language, "welcome")}</h2>
            <p className="kiosk-muted">
              {t(language, "locationOnly")}: {config?.device.locationId ?? "-"}
            </p>
            <div className="kiosk-actions">
              <button className="kiosk-btn primary" onClick={() => setStep("gender")}>
                {t(language, "startPhoto")}
              </button>
            </div>
          </div>
        )}

        {step === "gender" && (
          <div className="kiosk-card">
            <h2>{t(language, "chooseGender")}</h2>
            <div className="kiosk-grid">
              <button className="kiosk-btn" onClick={() => (setGender("male"), setStep("style"))}>
                {t(language, "male")}
              </button>
              <button className="kiosk-btn" onClick={() => (setGender("female"), setStep("style"))}>
                {t(language, "female")}
              </button>
              <button className="kiosk-btn" onClick={() => (setGender("group"), setStep("style"))}>
                {t(language, "group")}
              </button>
            </div>
            <div className="kiosk-actions">
              <button className="kiosk-btn ghost" onClick={resetToHome}>{t(language, "back")}</button>
            </div>
          </div>
        )}

        {step === "style" && (
          <div className="kiosk-card">
            <h2>{t(language, "chooseStyle")}</h2>
            <div className="kiosk-grid">
              {styles.map((s) => (
                <button
                  key={s.styleId}
                  className="kiosk-btn"
                  onClick={() => {
                    setStyleId(s.styleId);
                    setTemplateId(null);
                    setStep("template");
                  }}
                >
                  {s.name[language] ?? s.styleId}
                </button>
              ))}
            </div>
            <div className="kiosk-actions">
              <button className="kiosk-btn ghost" onClick={() => setStep("gender")}>{t(language, "back")}</button>
            </div>
          </div>
        )}

        {step === "template" && (
          <div className="kiosk-card">
            <h2>{t(language, "chooseTemplate")}</h2>
            <p className="kiosk-muted">{t(language, "templatesFilteredByLocation")}</p>
            <div className="kiosk-grid">
              {templates
                .filter((x) => (styleId ? x.styleId === styleId : true))
                .map((tp) => (
                  <button
                    key={tp.templateId}
                    className="kiosk-btn"
                    onClick={() => {
                      setTemplateId(tp.templateId);
                      setStep("photo");
                    }}
                  >
                    <div className="kiosk-btn-title">{tp.name[language] ?? tp.templateId}</div>
                    <div className="kiosk-muted">{tp.backgroundLabel}</div>
                  </button>
                ))}
            </div>
            <div className="kiosk-actions">
              <button className="kiosk-btn ghost" onClick={() => setStep("style")}>{t(language, "back")}</button>
            </div>
          </div>
        )}

        {step === "photo" && (
          <div className="kiosk-card wide">
            <h2>{t(language, "takePhoto")}</h2>
            <p className="kiosk-muted">
              {t(language, "selectedTemplate")}: {selectedTemplate?.name[language] ?? "-"}
            </p>
            <CameraCapture
              onCaptured={(dataUrl) => {
                setPhotoDataUrl(dataUrl);
                setStep("confirm");
              }}
            />
            <div className="kiosk-actions">
              <button className="kiosk-btn ghost" onClick={() => setStep("template")}>{t(language, "back")}</button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="kiosk-card wide">
            <h2>{t(language, "useThisPhoto")}</h2>
            {photoDataUrl ? <img className="kiosk-preview" src={photoDataUrl} alt="preview" /> : null}
            <div className="kiosk-actions">
              <button className="kiosk-btn" onClick={() => setStep("photo")}>{t(language, "no")}</button>
              <button
                className="kiosk-btn primary"
                onClick={async () => {
                  if (!photoDataUrl || !gender || !styleId || !templateId) return;
                  const created = await api.createJob({
                    deviceId,
                    gender,
                    styleId,
                    templateId,
                    photoBase64: photoDataUrl
                  });
                  setJobId(created.jobId);
                  setJobStatus("queued");
                  setStep("generating");
                }}
              >
                {t(language, "yesGenerate")}
              </button>
            </div>
          </div>
        )}

        {step === "generating" && (
          <div className="kiosk-card">
            <h2>{t(language, "generating")}</h2>
            <p className="kiosk-muted">
              {t(language, "jobStatus")}: {jobStatus ?? "-"}
            </p>
            <div className="kiosk-spinner" />
          </div>
        )}

        {step === "payment" && (
          <div className="kiosk-card wide">
            <h2>{t(language, "payTitle")}</h2>
            <div className="kiosk-two">
              <div className="kiosk-panel">
                <div className="kiosk-panel-title">{t(language, "payQr")}</div>
                {order?.qrPngUrl ? <img className="kiosk-qr" src={order.qrPngUrl} alt="pay qr" /> : null}
                <div className="kiosk-muted">{t(language, "payHint")}</div>
                <div className="kiosk-muted">
                  {t(language, "orderStatus")}: {orderStatus ?? "-"}
                </div>
              </div>
              <div className="kiosk-panel">
                <div className="kiosk-panel-title">{t(language, "resultPreview")}</div>
                {outputUrl ? <img className="kiosk-result" src={outputUrl} alt="result" /> : null}
                <div className="kiosk-muted">
                  {t(language, "saveHint")}{" "}
                  {order?.downloadUrl ? (
                    <a className="kiosk-link" href={order.downloadUrl} target="_blank" rel="noreferrer">
                      {t(language, "openDownload")}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "printing" && (
          <div className="kiosk-card">
            <h2>{t(language, "printing")}</h2>
            <p className="kiosk-muted">{t(language, "printingHint")}</p>
            <div className="kiosk-spinner" />
          </div>
        )}
      </main>
    </div>
  );
}

