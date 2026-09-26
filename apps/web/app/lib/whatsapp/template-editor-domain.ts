import { publicMediaUrl } from "./campaign-composition";
export function buildTemplateSubmission(input: { name: string; language: string; category: string; body: string; footer: string; header: string; mediaHandle?: string; examples: string; buttonText: string; buttonUrl: string }) {
  if (!/^[a-z][a-z0-9_]{0,99}$/.test(input.name) || !["ar", "en", "en_US", "en_GB"].includes(input.language) || !["MARKETING", "UTILITY"].includes(input.category) || !input.body.trim() || input.body.length > 1024 || input.footer.length > 60 || !["NONE", "IMAGE", "VIDEO", "DOCUMENT"].includes(input.header)) throw new Error("TEMPLATE_INPUT_INVALID");
  const variables = [...new Set([...input.body.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1]))].sort((a,b) => Number(a)-Number(b));
  if (variables.some((v, i) => v !== String(i + 1)) || variables.length > 20) throw new Error("TEMPLATE_VARIABLES_INVALID");
  const examples = input.examples.split("|").map((s) => s.trim());
  if (variables.length && (examples.length !== variables.length || examples.some((s) => !s || s.length > 512))) throw new Error("TEMPLATE_EXAMPLES_REQUIRED");
  const components: Array<Record<string, unknown>> = [];
  if (input.header !== "NONE") {
    if (!input.mediaHandle) throw new Error("TEMPLATE_SAMPLE_REQUIRED");
    components.push({ type: "HEADER", format: input.header, example: { header_handle: [input.mediaHandle] } });
  }
  components.push({ type: "BODY", text: input.body.trim(), ...(variables.length ? { example: { body_text: [examples] } } : {}) });
  if (input.footer.trim()) components.push({ type: "FOOTER", text: input.footer.trim() });
  if (input.buttonText || input.buttonUrl) {
    if (!input.buttonText.trim() || input.buttonText.length > 25 || !publicMediaUrl(input.buttonUrl)) throw new Error("TEMPLATE_BUTTON_INVALID");
    if (input.buttonUrl.includes("{{") && input.buttonUrl !== "https://ir.sa/api/whatsapp/campaign-link/{{1}}") throw new Error("TEMPLATE_BUTTON_INVALID");
    components.push({ type: "BUTTONS", buttons: [{ type: "URL", text: input.buttonText.trim(), url: input.buttonUrl, ...(input.buttonUrl === "https://ir.sa/api/whatsapp/campaign-link/{{1}}" ? { example: ["https://ir.sa/api/whatsapp/campaign-link/00000000-0000-4000-8000-000000000000"] } : {}) }] });
  }
  return { name: input.name, language: input.language, category: input.category, components };
}
