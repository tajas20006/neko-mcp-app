import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import "./global.css";
import "./mcp-app.css";

interface Cat {
  id: string;
  url: string;
  width: number;
  height: number;
  breedName?: string;
  breedDescription?: string;
  temperament?: string;
}

function extractCat(result: CallToolResult): Cat | null {
  const data = result.structuredContent as Cat | undefined;
  if (!data?.url) return null;
  return data;
}

const mainEl = document.querySelector(".main") as HTMLElement;
const loadingEl = document.getElementById("loading")!;
const catContentEl = document.getElementById("cat-content")!;
const errorEl = document.getElementById("error-state")!;
const catImageEl = document.getElementById("cat-image") as HTMLImageElement;
const breedInfoEl = document.getElementById("breed-info")!;
const breedNameEl = document.getElementById("breed-name")!;
const breedDescriptionEl = document.getElementById("breed-description")!;
const temperamentTagsEl = document.getElementById("temperament-tags")!;
const nextBtn = document.getElementById("next-btn") as HTMLButtonElement;

function showLoading() {
  loadingEl.classList.remove("hidden");
  catContentEl.classList.add("hidden");
  catContentEl.classList.remove("visible");
  errorEl.classList.add("hidden");
  nextBtn.disabled = true;
}

function showError() {
  loadingEl.classList.add("hidden");
  catContentEl.classList.add("hidden");
  errorEl.classList.remove("hidden");
  nextBtn.disabled = false;
}

function displayCat(cat: Cat) {
  catImageEl.classList.add("loading-img");
  catImageEl.onload = () => {
    catImageEl.classList.remove("loading-img");
    loadingEl.classList.add("hidden");
    catContentEl.classList.remove("hidden");
    catContentEl.classList.add("visible");
    errorEl.classList.add("hidden");
    nextBtn.disabled = false;
  };
  catImageEl.onerror = () => {
    showError();
  };
  catImageEl.src = cat.url;
  catImageEl.alt = cat.breedName ? `${cat.breedName}の猫` : "かわいい猫";

  if (cat.breedName) {
    breedNameEl.textContent = cat.breedName;
    breedDescriptionEl.textContent = cat.breedDescription ?? "";
    temperamentTagsEl.innerHTML = "";
    if (cat.temperament) {
      for (const trait of cat.temperament.split(",")) {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = trait.trim();
        temperamentTagsEl.appendChild(tag);
      }
    }
    breedInfoEl.classList.remove("hidden");
  } else {
    breedInfoEl.classList.add("hidden");
  }
}

function handleHostContextChanged(ctx: McpUiHostContext) {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.safeAreaInsets) {
    mainEl.style.paddingTop = `${ctx.safeAreaInsets.top}px`;
    mainEl.style.paddingRight = `${ctx.safeAreaInsets.right}px`;
    mainEl.style.paddingBottom = `${ctx.safeAreaInsets.bottom}px`;
    mainEl.style.paddingLeft = `${ctx.safeAreaInsets.left}px`;
  }
}

const app = new App({ name: "Neko App", version: "1.0.0" });

app.onteardown = async () => {
  return {};
};

app.ontoolinput = (_params) => {
  showLoading();
};

app.ontoolresult = (result) => {
  const cat = extractCat(result);
  if (cat) {
    displayCat(cat);
  } else {
    showError();
  }
};

app.ontoolcancelled = () => {
  showError();
};

app.onerror = console.error;
app.onhostcontextchanged = handleHostContextChanged;

nextBtn.addEventListener("click", async () => {
  showLoading();
  try {
    const result = await app.callServerTool({ name: "next-cat", arguments: {} });
    const cat = extractCat(result);
    if (cat) {
      displayCat(cat);
    } else {
      showError();
    }
  } catch (e) {
    console.error(e);
    showError();
  }
});

app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) handleHostContextChanged(ctx);
});
