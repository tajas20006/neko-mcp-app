import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

const RESOURCE_URI = "ui://neko-app/mcp-app.html";

const CatSchema = z.object({
  id: z.string(),
  url: z.string(),
  width: z.number(),
  height: z.number(),
  breedName: z.string().optional(),
  breedDescription: z.string().optional(),
  temperament: z.string().optional(),
});

type Cat = z.infer<typeof CatSchema>;

async function fetchRandomCat(): Promise<Cat> {
  const res = await fetch("https://api.thecatapi.com/v1/images/search?limit=1&has_breeds=1");
  if (!res.ok) {
    // Fallback without breed filter
    const res2 = await fetch("https://api.thecatapi.com/v1/images/search?limit=1");
    const data = await res2.json() as Array<{
      id: string; url: string; width: number; height: number;
      breeds?: Array<{ name: string; description: string; temperament: string }>;
    }>;
    const item = data[0];
    return { id: item.id, url: item.url, width: item.width, height: item.height };
  }
  const data = await res.json() as Array<{
    id: string; url: string; width: number; height: number;
    breeds?: Array<{ name: string; description: string; temperament: string }>;
  }>;
  const item = data[0];
  const breed = item.breeds?.[0];
  return {
    id: item.id,
    url: item.url,
    width: item.width,
    height: item.height,
    breedName: breed?.name,
    breedDescription: breed?.description,
    temperament: breed?.temperament,
  };
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Neko MCP App",
    version: "1.0.0",
  });

  registerAppTool(
    server,
    "get-random-cat",
    {
      title: "ランダムな猫を表示",
      description: "かわいい猫の画像をランダムに表示します。",
      inputSchema: {},
      outputSchema: CatSchema,
      _meta: { ui: { resourceUri: RESOURCE_URI } },
    },
    async (): Promise<CallToolResult> => {
      const cat = await fetchRandomCat();
      return {
        content: [{ type: "text", text: `猫の画像を表示しました！${cat.breedName ? `品種: ${cat.breedName}` : ""}` }],
        structuredContent: cat,
      };
    },
  );

  // App-only tool: fetch next cat without showing in model context
  registerAppTool(
    server,
    "next-cat",
    {
      title: "次の猫",
      description: "次のランダムな猫を取得します。",
      inputSchema: {},
      outputSchema: CatSchema,
      _meta: { ui: { resourceUri: RESOURCE_URI, visibility: ["app"] } },
    },
    async (): Promise<CallToolResult> => {
      const cat = await fetchRandomCat();
      return {
        content: [{ type: "text", text: `新しい猫！` }],
        structuredContent: cat,
      };
    },
  );

  registerAppResource(
    server,
    RESOURCE_URI,
    RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(DIST_DIR, "mcp-app.html"), "utf-8");
      return {
        contents: [
          {
            uri: RESOURCE_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: {
              ui: {
                csp: {
                  // Allow fetching cat images from various CDNs used by The Cat API
                  resourceDomains: [
                    "https://*.thecatapi.com",
                    "https://*.tumblr.com",
                    "https://*.cloudinary.com",
                    "https://*.imgur.com",
                    "https://i.imgur.com",
                  ],
                },
              },
            },
          },
        ],
      };
    },
  );

  return server;
}
