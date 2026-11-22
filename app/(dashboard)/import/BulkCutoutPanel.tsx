"use client";

import { useEffect, useState } from "react";

type Item = {
  record_id: string; title: string; status: string; message: string;
  ready: boolean; finished: string | null;
};
export type CutoutJob = {
  id: string; status: string; created_at: string; total: number; processed: number;
  counts: Record<"queued"|"running"|"succeeded"|"failed"|"skipped"|"cancelled", number>;
  items: Item[];
};
const active = (job: CutoutJob | null) => Boolean(job && ["queued","running","cancelling"].includes(job.status));

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch("/api/product-ai/imports/cutout-jobs" + path, {
    cache:"no-store", ...init,
    headers:{"Content-Type":"application/json", ...init?.headers},
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof body?.detail === "string" ? body.detail : "Cutout job request failed.");
  return body as T;
}

export default function BulkCutoutPanel({selectedIds,totalImports,onFinished}: {
  selectedIds: string[]; totalImports: number; onFinished: () => Promise<void>;
}) {
  const [jobs,setJobs] = useState<CutoutJob[]>([]);
  const [job,setJob] = useState<CutoutJob|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  useEffect(() => {
    let mounted = true;
    void request<{jobs:CutoutJob[]}>("").then(result => {
      if (!mounted) return;
      setJobs(result.jobs);
      setJob(result.jobs.find(item => active(item)) || result.jobs[0] || null);
    }).catch(reason => {if(mounted)setError(reason instanceof Error ? reason.message : "Could not load cutout jobs.");});
    return () => {mounted=false;};
  },[]);

  useEffect(() => {
    if (!job || !active(job)) return;
    let mounted=true, pending=false;
    const refresh=async() => {
      if(pending)return;
      pending=true;
      try {
        const updated=await request<CutoutJob>("/"+job.id);
        if(!mounted)return;
        setJob(updated);
        setJobs(current=>current.map(item=>item.id===updated.id?updated:item));
        setError("");
        if(!active(updated))void onFinished();
      } catch(reason) {
        if(mounted)setError(reason instanceof Error?reason.message:"Could not refresh cutout progress.");
      } finally {pending=false;}
    };
    const interval=window.setInterval(()=>void refresh(),2000);
    return ()=>{mounted=false;window.clearInterval(interval);};
  },[job?.id,job?.status,onFinished]);

  async function start(all: boolean) {
    setBusy(true);setError("");
    try {
      const created=await request<CutoutJob>("",{method:"POST",
        body:JSON.stringify(all?{all_imports:true}:{record_ids:selectedIds})});
      setJob(created);setJobs(current=>[created,...current.filter(item=>item.id!==created.id)].slice(0,10));
    } catch(reason) {setError(reason instanceof Error?reason.message:"Could not start cutouts.");}
    finally {setBusy(false);}
  }
  async function action(kind:"cancel"|"retry") {
    if(!job)return;
    setBusy(true);setError("");
    try {
      const result=await request<CutoutJob>("/"+job.id+"/"+kind,{method:"POST"});
      setJob(result);
      setJobs(current=>[result,...current.filter(item=>item.id!==result.id)].slice(0,10));
    } catch(reason) {setError(reason instanceof Error?reason.message:"Cutout action failed.");}
    finally {setBusy(false);}
  }

  return <section aria-label="Bulk image cutouts" className="rounded-2xl border border-[#dbe2ee] bg-white p-5 space-y-4">
    <div>
      <h2 className="text-lg font-semibold text-[#172544]">Image cutouts only</h2>
      <p className="mt-1 text-sm text-[#667a99]">Create transparent backgrounds in a separate task while you keep working. Rows without an image and rows with an existing cutout are skipped. Product text, prices and marketplace images are kept.</p>
    </div>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy||selectedIds.length===0||selectedIds.length>500}
        onClick={()=>void start(false)} className="rounded-lg bg-[#172544] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        Create cutouts for selected ({selectedIds.length})
      </button>
      <button type="button" disabled={busy||totalImports===0}
        onClick={()=>void start(true)} className="rounded-lg border border-[#d5dcea] px-4 py-2 text-sm font-semibold text-[#31415e] disabled:opacity-50">
        Create missing cutouts for all
      </button>
    </div>
    <p className="text-xs text-[#667a99]">Up to 500 rows per job. A row already queued or running cannot be queued twice.</p>
    {error?<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}
    {jobs.length>1?<label className="block text-sm text-[#667a99]">Cutout job
      <select aria-label="Cutout job" className="ml-3 rounded-lg border p-2" value={job?.id||""}
        onChange={event=>setJob(jobs.find(item=>item.id===event.target.value)||null)}>
        {jobs.map(item=><option key={item.id} value={item.id}>{new Date(item.created_at).toLocaleString()} · {item.status} · {item.total} rows</option>)}
      </select>
    </label>:null}
    {job?<div className="space-y-3">
      <p role="status" className="text-sm font-semibold text-[#31415e]">
        {job.status.replaceAll("_"," ")} · {job.processed}/{job.total} processed · {job.counts.succeeded} saved · {job.counts.skipped} skipped · {job.counts.failed} failed
      </p>
      <progress aria-label="Cutout progress" className="h-3 w-full" max={job.total||1} value={job.processed}/>
      <div className="flex gap-3">
        {active(job)?<button type="button" disabled={busy||job.status==="cancelling"} onClick={()=>void action("cancel")}
          className="rounded-lg border px-3 py-2 text-sm">Cancel remaining rows</button>:null}
        {!active(job)&&(job.counts.failed+job.counts.cancelled)>0?<button type="button" disabled={busy} onClick={()=>void action("retry")}
          className="rounded-lg border px-3 py-2 text-sm">Retry failed / cancelled rows</button>:null}
      </div>
      {job.status==="cancelling"?<p className="text-xs text-[#667a99]">The current image will finish; queued rows are cancelled.</p>:null}
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-[#667a99]"><th className="p-2">Product</th><th className="p-2">Cutout</th><th className="p-2">Result</th></tr></thead>
          <tbody>{job.items.map(item=>{
            const preview="/api/product-ai/imports/products/"+item.record_id+"/image?kind=transparent_cutout&v="+encodeURIComponent(item.finished||"");
            return <tr key={item.record_id} className="border-b border-[#edf2fb]">
              <td className="p-2">{item.title}</td>
              <td className="p-2">{item.ready?<a href={preview} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} loading="lazy" alt={"Cutout for "+item.title} className="h-20 w-20 rounded-lg border object-contain"/>
              </a>:<span className="text-xs text-[#8ea0bf]">—</span>}</td>
              <td className="p-2"><span className={item.status==="failed"?"font-semibold text-red-700":"font-semibold text-[#31415e]"}>{item.status}</span>
                <p className="mt-1 text-xs text-[#667a99]">{item.message}</p></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>:null}
  </section>;
}
