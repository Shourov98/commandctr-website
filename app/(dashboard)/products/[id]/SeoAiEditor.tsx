"use client";

import { useState, useTransition } from "react";
import { Bolt, CircleCheck, Link2, List } from "lucide-react";

const initialKeywords = ["noise cancelling", "sony headphones", "wireless audio"];
const initialTitle = "Sony WH-1000XM5 Wireless Noise Canceling Headphones";
const initialDescription =
  "Experience industry-leading noise cancellation with the\nSony WH-1000XM5 headphones. Featuring two\nprocessors controlling eight microphones, Auto NC\nOptimizer for automatically optimizing noise canceling\nbased on your wearing conditions and environment, and a\nspecially designed driver unit.";

type AiResponse = {
  title?: string;
  description?: string;
  error?: string;
};

async function callProductAi(payload: {
  title: string;
  description: string;
  keywords: string[];
  mode: "generate_title" | "rewrite_description";
}) {
  const response = await fetch("/api/ai/product-copy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as AiResponse;

  if (!response.ok) {
    throw new Error(result.error ?? "AI request failed.");
  }

  return result;
}

export default function SeoAiEditor() {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [keywords, setKeywords] = useState(initialKeywords);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const addKeyword = () => {
    const normalized = keywordDraft.trim();

    if (!normalized || keywords.includes(normalized)) {
      setKeywordDraft("");
      return;
    }

    setKeywords((prev) => [...prev, normalized]);
    setKeywordDraft("");
  };

  const generateTitle = () => {
    setError("");

    startTransition(async () => {
      try {
        const result = await callProductAi({
          mode: "generate_title",
          title,
          description,
          keywords,
        });

        if (result.title) {
          setTitle(result.title);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not generate a title.");
      }
    });
  };

  const rewriteDescription = () => {
    setError("");

    startTransition(async () => {
      try {
        const result = await callProductAi({
          mode: "rewrite_description",
          title,
          description,
          keywords,
        });

        if (result.description) {
          setDescription(result.description);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not rewrite the description.");
      }
    });
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label className="text-sm font-medium text-[#3a4964]">Product Title</label>
        <button
          className="inline-flex h-8 items-center gap-1 rounded-md bg-[#1c2b4c] px-3 text-[11px] font-semibold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          onClick={generateTitle}
          type="button"
        >
          <Bolt className="h-3 w-3" />
          {isPending ? "Working..." : "Generate"}
        </button>
      </div>
      <div className="mt-2 rounded-lg border border-[#d5dcea] bg-[#f7f9fd] px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <input
            className="w-full bg-transparent text-sm font-semibold text-[#2f3f5f] outline-none"
            onChange={(event) => setTitle(event.target.value)}
            type="text"
            value={title}
          />
          <span className="rounded bg-[#e1f7f2] px-2 py-0.5 text-xs font-semibold text-[#73b7a4]">{title.length}/80 chars</span>
        </div>
      </div>
      <p className="mt-3 inline-flex rounded-md bg-[#edfdf7] px-2 py-1 text-xs font-semibold text-[#43be9b]">
        <CircleCheck className="mr-1 h-3.5 w-3.5" /> Great length for Amazon search results.
      </p>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-[#3a4964]">Product Description</label>
          <button
            className="text-xs font-semibold text-[#6f7f9d] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={rewriteDescription}
            type="button"
          >
            {isPending ? "Working..." : "Rewrite with AI"}
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-[#d5dcea] bg-white">
          <div className="flex h-9 items-center gap-4 bg-[#1c2b4c] px-3 text-[#d8e4fb]">
            <button type="button">
              <strong>B</strong>
            </button>
            <button className="italic" type="button">
              I
            </button>
            <button type="button">
              <List className="h-4 w-4" />
            </button>
            <button type="button">
              <Link2 className="h-4 w-4" />
            </button>
          </div>
          <textarea
            className="h-[130px] w-full resize-none bg-[#f8fafe] px-3 py-3 text-sm leading-7 text-[#5e6e88] outline-none"
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-medium text-[#3a4964]">Target Keywords</label>
        <div className="rounded-xl border border-[#d5dcea] bg-[#f7f9fd] p-3">
          <div className="flex flex-wrap items-center gap-2">
            {keywords.map((keyword) => (
              <button
                className="inline-flex items-center rounded-full border border-[#cfd8e7] bg-white px-3 py-1 text-xs font-semibold text-[#6d7f9f]"
                key={keyword}
                onClick={() => setKeywords((prev) => prev.filter((item) => item !== keyword))}
                type="button"
              >
                {keyword} ×
              </button>
            ))}
            <input
              className="h-7 min-w-[140px] bg-transparent text-xs text-[#6d7f9f] outline-none"
              onBlur={addKeyword}
              onChange={(event) => setKeywordDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addKeyword();
                }
              }}
              placeholder="Add keyword..."
              type="text"
              value={keywordDraft}
            />
          </div>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-[#d14b5a]">{error}</p> : null}
    </div>
  );
}
