const baseUrl = new URL(process.env.SMOKE_BASE_URL ?? "https://dawraw.vercel.app");

async function expectStatus(path, expectedStatus) {
  const response = await fetch(new URL(path, baseUrl), { redirect: "manual" });
  if (response.status !== expectedStatus) throw new Error(`${path} returned ${response.status}; expected ${expectedStatus}`);
  return response;
}

const health = await expectStatus("/api/health", 200);
const payload = await health.json();
if (payload?.status !== "ok") throw new Error("Health endpoint did not return an ok status.");
if (!health.headers.get("content-security-policy")) throw new Error("Health endpoint is missing Content-Security-Policy.");

await expectStatus("/api/export", 401);
await expectStatus("/api/health-integrations", 401);

console.log(`Public smoke checks passed for ${baseUrl.origin}`);
