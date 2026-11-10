import { readFileSync } from "node:fs";
import path from "node:path";
import Boot from "@/components/Boot";

export const dynamic = "force-static";

// The editorial shell is rendered at build time; crema.js fills the directory from the API.
const shell = readFileSync(path.join(process.cwd(), "app/shell.html"), "utf8");

export default function Home() {
  return (
    <>
      <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: shell }} />
      <Boot />
    </>
  );
}
