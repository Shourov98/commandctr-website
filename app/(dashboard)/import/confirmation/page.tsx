"use client";

import { CircleHelp, Link2, ListChecks, Loader, PackagePlus, SkipForward, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type LogItem = {
  id: string;
  time: string;
  type: "success" | "warn" | "info";
  message: string;
};

const initialLogs: LogItem[] = [
  { id: "1", time: "10:42:05", type: "success", message: "Product #SKU-1024 created successfully." },
  { id: "2", time: "10:42:04", type: "success", message: "Product #SKU-1023 image gallery synced." },
  { id: "3", time: "10:42:03", type: "warn", message: "Product #SKU-1022 description truncated (max length exceeded)." },
  { id: "4", time: "10:42:06", type: "info", message: "Validating Product #SKU-1025 variants..." },
];

function LogIcon({ type }: { type: LogItem["type"] }) {
  if (type === "success") {
    return <span className="text-[#3fc786]">◉</span>;
  }

  if (type === "warn") {
    return <TriangleAlert className="h-3.5 w-3.5 text-[#f4a632]" />;
  }

  return <Loader className="h-3.5 w-3.5 animate-spin text-[#5aa0ff]" />;
}

export default function ImportConfirmationPage() {
  const total = 1240;
  const [processed, setProcessed] = useState(186);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>(initialLogs);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setProcessed((prev) => {
        if (prev >= total) {
          setIsRunning(false);
          return total;
        }

        const next = Math.min(total, prev + 22);
        return next;
      });

      setLogs((prev) => {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const ss = String(now.getSeconds()).padStart(2, "0");
        const sku = 1026 + Math.floor(Math.random() * 90);
        const nextLog: LogItem = {
          id: `${Date.now()}`,
          time: `${hh}:${mm}:${ss}`,
          type: Math.random() > 0.8 ? "warn" : "success",
          message:
            Math.random() > 0.8
              ? `Product #SKU-${sku} missing optional image alt text.`
              : `Product #SKU-${sku} synced successfully.`,
        };

        return [nextLog, ...prev].slice(0, 12);
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning]);

  const progress = useMemo(() => Math.round((processed / total) * 100), [processed, total]);

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="space-y-4">
        <header className="rounded-xl border border-[#2c3b61] bg-[#1b2748] px-5 py-5 text-white">
          <p className="text-sm font-semibold text-[#a9b8d6]">Import Products &nbsp;&gt;&nbsp; Resolve Conflicts &nbsp;&gt;&nbsp; Confirmation</p>
          <h1 className="mt-2 text-2xl font-semibold">Import Products</h1>
          <p className="mt-1 text-sm text-[#a9b8d6]">Review the summary of your selection and confirm the import operation.</p>
        </header>

        <article className="rounded-2xl border border-[#dbe2ee] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] md:p-5">
          <h2 className="text-lg font-semibold text-[#1f2c44]">Product Optimization</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-[#1a2748] p-4 text-white">
              <div className="mb-3 flex items-center justify-between">
                <ListChecks className="h-4 w-4 text-[#4aa6ff]" />
              </div>
              <p className="text-sm text-[#c0cce4]">Total Selected</p>
              <p className="mt-1 text-3xl font-semibold">1,240</p>
            </div>
            <div className="rounded-xl bg-[#1a2748] p-4 text-white">
              <div className="mb-3 flex items-center justify-between">
                <PackagePlus className="h-4 w-4 text-[#4be18a]" />
                <span className="rounded-full bg-[#113c60] px-2 py-0.5 text-[10px] text-[#53e1d6]">+850 to catalog</span>
              </div>
              <p className="text-sm text-[#c0cce4]">New Products</p>
              <p className="mt-1 text-3xl font-semibold">45</p>
            </div>
            <div className="rounded-xl bg-[#1a2748] p-4 text-white">
              <div className="mb-3 flex items-center justify-between">
                <Link2 className="h-4 w-4 text-[#7a6cff]" />
                <span className="rounded-full bg-[#113c60] px-2 py-0.5 text-[10px] text-[#53e1d6]">Update</span>
              </div>
              <p className="text-sm text-[#c0cce4]">Linked</p>
              <p className="mt-1 text-3xl font-semibold">850</p>
            </div>
            <div className="rounded-xl bg-[#1a2748] p-4 text-white">
              <div className="mb-3 flex items-center justify-between">
                <SkipForward className="h-4 w-4 text-[#f8a100]" />
                <span className="rounded-full bg-[#113c60] px-2 py-0.5 text-[10px] text-[#53e1d6]">Review</span>
              </div>
              <p className="text-sm text-[#c0cce4]">Skipped</p>
              <p className="mt-1 text-3xl font-semibold">350</p>
            </div>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-[#dbe2ee] bg-white shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
          <div className="border-b border-[#e5ebf5] px-4 py-4 md:px-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:max-w-[62%]">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#1f2c44]">Progress Status</h2>
                  <p className="text-sm font-semibold text-[#8ca0c2]">{isRunning ? "Processing" : "Ready to start"}</p>
                </div>
                <div className="h-2.5 rounded-full bg-[#e6ecf6]">
                  <div className="h-2.5 rounded-full bg-[#1b2748] transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[#9aaac6]">
                  <span>{progress}%</span>
                  <span>
                    {processed.toLocaleString()} / {total.toLocaleString()} processed
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="h-10 rounded-xl border border-[#d6ddea] bg-[#f7f9fd] px-6 text-sm font-semibold text-[#4f607c]"
                  onClick={() => setIsRunning(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#35d3ce] px-6 text-sm font-semibold text-white"
                  onClick={() => setIsRunning(true)}
                  type="button"
                >
                  ▷
                  Start Import
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-[#e5ebf5] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#55698d] md:px-5">
            <div className="flex items-center justify-between">
              <p>Live Activity Log</p>
              <button className="text-xs text-[#57cbc6]" type="button">
                Download full log
              </button>
            </div>
          </div>

          <div className="px-4 py-3 md:px-5">
            <div className="space-y-2">
              {logs.map((log, idx) => (
                <div
                  className={`grid grid-cols-[62px_18px_1fr] items-center gap-2 rounded-md px-2 py-1 text-sm ${
                    idx === 0 && log.type === "info" ? "bg-[#f1f7ff] text-[#4f8eea]" : "text-[#6f809f]"
                  }`}
                  key={log.id}
                >
                  <span className="text-xs text-[#9aabc6]">{log.time}</span>
                  <span>
                    <LogIcon type={log.type} />
                  </span>
                  <span className="font-semibold">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <div className="py-6 text-center text-sm text-[#9badc8]">
          <p className="inline-flex items-center gap-1">
            <CircleHelp className="h-4 w-4" /> Need help with skipped items?
            <button className="font-semibold text-[#57cbc6]" type="button">
              View Documentation
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
