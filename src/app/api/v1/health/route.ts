import { ok } from "@/lib/api/http";

export async function GET() {
  return ok({
    service: "coretextil-api",
    version: "v1",
    time: new Date().toISOString(),
  });
}
