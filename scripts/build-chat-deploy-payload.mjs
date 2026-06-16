import { readFileSync, writeFileSync } from "node:fs";

const content = readFileSync("supabase/functions/chat-completion/index.ts", "utf8");
const payload = {
  project_id: "hrzsdiduafuqtxitpgoy",
  name: "chat-completion",
  entrypoint_path: "index.ts",
  verify_jwt: true,
  files: [{ name: "index.ts", content }],
};
writeFileSync("scripts/chat-deploy-payload.json", JSON.stringify(payload));
