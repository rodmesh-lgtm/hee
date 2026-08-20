import "server-only";

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("request-body-too-large");
    this.name = "RequestBodyTooLargeError";
  }
}

async function readBoundedBytes(request: Request, maxBytes: number) {
  const limit = Math.max(1024, Math.min(1024 * 1024, Math.floor(maxBytes)));
  const declaredLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > limit) throw new RequestBodyTooLargeError();

  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel("request body limit exceeded").catch(() => undefined);
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function readBoundedText(request: Request, maxBytes: number) {
  const bytes = await readBoundedBytes(request, maxBytes);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  return JSON.parse(await readBoundedText(request, maxBytes));
}
