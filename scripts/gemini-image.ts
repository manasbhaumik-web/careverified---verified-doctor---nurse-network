/**
 * Generates or edits an image with Google's Gemini image model and saves it to disk.
 *
 *   npm run image -- "a bright hospital reception desk, soft daylight, wide shot"
 *   npm run image -- "make the walls pale blue" --image public/assets/lobby.jpg
 *   npm run image -- "..." --out public/assets/hero.png --aspect 16:9
 *
 * Needs GEMINI_API_KEY in .env (create a key at https://aistudio.google.com/apikey).
 * Google's image models have no free-tier quota, so the key's project must have billing turned on, or you get a 429 error.
 * GEMINI_IMAGE_MODEL picks the model (default gemini-2.5-flash-image).
 * Generated images are Google's output, so check the licence terms and add alt text before you ship one.
 * Without --out, files go to ./generated-images/ (ignored by git).
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
// The project's .env wins over a GEMINI_API_KEY that happens to be set in the machine's environment.
dotenv.config({ override: true, quiet: true });

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const ASPECTS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];
const MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
const EXT: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };

/** A problem the person can fix: shown plainly, no stack trace. Thrown (not process.exit) so open sockets close cleanly on Windows. */
class Failure extends Error {}
function fail(message: string): never {
  throw new Failure(message);
}

function parseArgs(argv: string[]) {
  const prompt: string[] = [];
  const opts: { out?: string; image?: string; aspect?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") opts.out = argv[++i];
    else if (a === "--image") opts.image = argv[++i];
    else if (a === "--aspect") opts.aspect = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log('Usage: npm run image -- "<what to draw>" [--image <file to edit>] [--out <file>] [--aspect 16:9]\nNeeds GEMINI_API_KEY in .env. Default output: ./generated-images/');
      process.exit(0);
    }
    else prompt.push(a);
  }
  return { prompt: prompt.join(" ").trim(), ...opts };
}

async function main() {
  const { prompt, out, image, aspect } = parseArgs(process.argv.slice(2));
  const key = process.env.GEMINI_API_KEY;
  if (!key) fail("GEMINI_API_KEY is not set. Add it to .env (key from https://aistudio.google.com/apikey), then run again.");
  if (/\s/.test(key)) fail("GEMINI_API_KEY contains spaces or line breaks, so it is not a single key. Check .env and your system environment variables. (The value is not shown here on purpose.)");
  if (!prompt) fail('Say what to draw, for example: npm run image -- "a calm clinic waiting room"');
  if (aspect && !ASPECTS.includes(aspect)) fail(`--aspect must be one of: ${ASPECTS.join(", ")}`);

  const parts: Record<string, unknown>[] = [{ text: prompt }];
  if (image) {
    if (!fs.existsSync(image)) fail(`Cannot find the image to edit: ${image}`);
    const mime = MIME[path.extname(image).toLowerCase()];
    if (!mime) fail("--image must be a .png, .jpg or .webp file.");
    parts.push({ inlineData: { mimeType: mime, data: fs.readFileSync(image).toString("base64") } });
  }

  const body: Record<string, unknown> = { contents: [{ parts }] };
  if (aspect) body.generationConfig = { imageConfig: { aspectRatio: aspect } };

  console.log(`Asking ${MODEL}${image ? " to edit an image" : " for an image"}…`);
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const why = data?.error?.message || res.statusText;
    fail(`Gemini returned ${res.status}: ${why}${res.status === 404 ? `\nThe model "${MODEL}" may not exist for your key. Set GEMINI_IMAGE_MODEL in .env.` : ""}`);
  }

  const cand = data?.candidates?.[0];
  const outParts: any[] = cand?.content?.parts ?? [];
  const img = outParts.find(p => p.inlineData?.data);
  if (!img) {
    const said = outParts.map(p => p.text).filter(Boolean).join(" ") || data?.promptFeedback?.blockReason || cand?.finishReason || "no image in the reply";
    fail(`No image came back: ${said}`);
  }

  const mime: string = img.inlineData.mimeType || "image/png";
  const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
  const file = out ?? path.join("generated-images", `${slug}-${Date.now()}${EXT[mime] ?? ".png"}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(img.inlineData.data, "base64"));
  const note = outParts.map(p => p.text).filter(Boolean).join(" ").trim();
  if (note) console.log(`Model note: ${note}`);
  console.log(`Saved ${file} (${Math.round(fs.statSync(file).size / 1024)} KB)`);
}

main().catch(e => {
  // Never print an unexpected error's text: it can contain request headers, and the API key is one.
  console.error(`\n${e instanceof Failure ? e.message : `Request failed (${e?.name || "error"}). Check your connection and GEMINI_API_KEY.`}\n`);
  process.exitCode = 1;
});
