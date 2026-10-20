import { NextResponse } from "next/server";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

type ProductCopyRequest = {
  title?: string;
  description?: string;
  keywords?: string[];
  mode?: "generate_title" | "rewrite_description";
};

function extractJson(text: string) {
  const normalized = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(normalized) as { title?: string; description?: string };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY. Add it to your local environment before using AI actions." },
      { status: 500 },
    );
  }

  let body: ProductCopyRequest;

  try {
    body = (await request.json()) as ProductCopyRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = body.title?.trim() ?? "";
  const description = body.description?.trim() ?? "";
  const keywords = body.keywords?.filter(Boolean) ?? [];
  const mode = body.mode;

  if (!mode || (mode !== "generate_title" && mode !== "rewrite_description")) {
    return NextResponse.json({ error: "Invalid AI action requested." }, { status: 400 });
  }

  const keywordText = keywords.length > 0 ? keywords.join(", ") : "none provided";

  const instruction =
    mode === "generate_title"
      ? [
          "You write concise ecommerce product titles.",
          "Return strict JSON with one field: title.",
          "Do not include markdown or extra keys.",
          "Keep the title under 80 characters when possible.",
          `Current title: ${title || "none"}`,
          `Current description: ${description || "none"}`,
          `Target keywords: ${keywordText}.`,
        ].join("\n")
      : [
          "You rewrite ecommerce product descriptions for clarity and conversion.",
          "Return strict JSON with one field: description.",
          "Do not include markdown fences or extra keys.",
          "Preserve factual accuracy and avoid invented specs.",
          "Use plain text paragraphs only.",
          `Current title: ${title || "none"}`,
          `Current description: ${description || "none"}`,
          `Target keywords: ${keywordText}.`,
        ].join("\n");

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: instruction,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `OpenAI request failed: ${response.status} ${response.statusText}`, details: errorText },
      { status: 502 },
    );
  }

  const data = (await response.json()) as { output_text?: string };
  const outputText = data.output_text?.trim();

  if (!outputText) {
    return NextResponse.json({ error: "OpenAI returned an empty response." }, { status: 502 });
  }

  try {
    const parsed = extractJson(outputText);

    if (mode === "generate_title" && parsed.title) {
      return NextResponse.json({ title: parsed.title });
    }

    if (mode === "rewrite_description" && parsed.description) {
      return NextResponse.json({ description: parsed.description });
    }

    return NextResponse.json({ error: "OpenAI response did not contain the expected field." }, { status: 502 });
  } catch {
    return NextResponse.json({ error: "OpenAI response was not valid JSON.", raw: outputText }, { status: 502 });
  }
}
