type Connectable = { connect(): Promise<unknown> };

/** Label the failing endpoint without exposing credentials or provider messages. */
export async function connectProofDatabase(client: Connectable, role: "source" | "restore") {
  try {
    await client.connect();
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    const safeCode = /^[A-Z0-9_]{2,32}$/.test(code) ? code : "UNAVAILABLE";
    throw new Error(`Backup proof ${role} connection failed (${safeCode}); verification stopped before migration`);
  }
}
