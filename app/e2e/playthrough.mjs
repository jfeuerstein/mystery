// End-to-end playthrough of the sample case at iPhone size, in a real browser.
// Builds nothing: run `npm run build` first. Usage:
//   node app/e2e/playthrough.mjs [screenshot-dir]
// Uses the system Chromium (CHROMIUM_PATH, or Playwright's browser cache).
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const shots = resolve(process.argv[2] ?? `${here}/screenshots`);
mkdirSync(shots, { recursive: true });
const PORT = 4179;

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  cwd: resolve(here, ".."),
  stdio: "pipe",
});
const stop = () => server.kill();
process.on("exit", stop);

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("preview server did not start");
}

async function launch() {
  const executablePath = process.env.CHROMIUM_PATH;
  try {
    return await chromium.launch(executablePath ? { executablePath } : {});
  } catch {
    return await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  }
}

let shotIndex = 0;
async function shot(page, name) {
  shotIndex++;
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${shots}/${String(shotIndex).padStart(2, "0")}-${name}.png` });
}

async function hold(page, locator) {
  const box = await locator.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(450);
}

const byText = (page, text) => page.locator("button", { hasText: text }).first();

/** Waits until the save in IndexedDB (idb-keyval's default store) matches. */
async function waitForSave(page, predicate) {
  await page.waitForFunction(
    async (source) => {
      const raw = await new Promise((resolve) => {
        const open = indexedDB.open("keyval-store");
        open.onsuccess = () => {
          const req = open.result.transaction("keyval").objectStore("keyval").get("afoot-save");
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(undefined);
        };
        open.onerror = () => resolve(undefined);
      });
      return typeof raw === "string" && new Function("save", `return (${source})(save)`)(JSON.parse(raw));
    },
    predicate.toString(),
    { timeout: 10000 },
  );
}

async function readNarration(page) {
  while (await page.getByTestId("narration").count()) {
    await page.getByTestId("continue").click();
    await page.waitForTimeout(40);
  }
}

async function enterPalace(page, name) {
  await page.getByTestId("enter-palace").click();
  await page.getByTestId("palace").waitFor();
  await page.waitForTimeout(650);
  if (name) await shot(page, name);
}

async function holmesSpeaks(page, name) {
  await page.getByTestId("holmes-speaks").waitFor();
  if (name) await shot(page, name);
  await page.getByTestId("continue").click();
}

async function main() {
  await waitForServer();
  const browser = await launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(`http://localhost:${PORT}/`);
  await page.getByTestId("begin").waitFor();
  await shot(page, "title");
  await page.getByTestId("begin").click();
  await shot(page, "casebook");
  await page.getByTestId("case-stopped-clock").click();

  // Chapter I
  await shot(page, "narration");
  await readNarration(page);
  for (const id of ["o-ticket", "o-ink", "o-calluses"]) {
    await page.getByTestId(`detail-${id}`).click();
    if (id === "o-ticket") await shot(page, "observe-detail");
    await page.getByTestId("close-detail").click();
  }
  await shot(page, "observe");
  await page.getByTestId("continue").click();

  await enterPalace(page, "palace-observation");
  for (const [o, i] of [
    ["first-class ticket", "travelled up from Surrey"],
    ["violet ink stain", "wrote a letter in haste"],
    ["Hard calluses", "plays the violin"],
  ]) {
    await byText(page, o).click();
    await byText(page, i).click();
  }
  await hold(page, page.getByTestId("declare"));
  await holmesSpeaks(page, "holmes-speaks");
  await readNarration(page);

  // A deliberate wrong Declare: Patience falls, nothing else is revealed.
  await enterPalace(page);
  await byText(page, "Miss Darrow herself tells us").click();
  await byText(page, "On the Gate and the Key").click();
  await hold(page, page.getByTestId("declare"));
  const lit = await page.locator(".palace .patience .pip.lit").count();
  if (lit !== 2) throw new Error(`expected 2 of 3 Patience after a wrong Declare, got ${lit}`);
  await shot(page, "palace-wrong");
  await byText(page, "It follows that Miss Darrow").click();
  await shot(page, "palace-flaw");
  await page.getByTestId("palace").getByRole("button", { name: "Notebook" }).click();
  await page.locator(".notebook").waitFor();
  await shot(page, "notebook");
  await page.locator(".sheet-close, [aria-label='Close']").first().click();
  await hold(page, page.getByTestId("declare"));
  await holmesSpeaks(page);

  // Reload mid-case: progress must survive (IndexedDB). Wait for the save
  // to land first; writes are asynchronous.
  await waitForSave(page, (save) => save.state.progress["stopped-clock"].stage.phase?.kind === "narration");
  await page.reload();
  await page.getByTestId("resume").click();
  await page.getByTestId("narration").waitFor({ timeout: 10000 });

  // Chapter II
  await readNarration(page);
  for (const id of ["e-clock", "e-teacup", "e-library-key", "e-boots", "e-deed"]) {
    await page.getByTestId(`hotspot-${id}`).click();
    if (id === "e-clock") await shot(page, "examine-card");
    await page.getByTestId("close-detail").click();
  }
  await shot(page, "examine");
  await page.getByTestId("continue").click();
  await readNarration(page);
  await page.getByTestId("topic-t-hale-evening").click();
  await page.getByTestId("topic-t-hale-hall").click();
  await shot(page, "interrogate");
  await page.getByTestId("continue").click();

  await enterPalace(page);
  for (const [e, s] of [
    ["vance", "first"],
    ["pike", "second"],
    ["colonel", "third"],
    ["hale", "fourth"],
    ["clara", "fifth"],
  ]) {
    await page.getByTestId(`entity-${e}`).click();
    await page.getByTestId(`slot-${s}`).click();
  }
  await shot(page, "palace-arrangement");
  await hold(page, page.getByTestId("declare"));
  await holmesSpeaks(page);

  // Chapter III
  await readNarration(page);
  for (const t of ["t-pike-evening", "t-pike-noise", "t-pike-dogs"]) await page.getByTestId(`topic-${t}`).click();
  await page.getByTestId("continue").click();
  await enterPalace(page);
  await byText(page, "I never left the stables").click();
  await byText(page, "Pike’s boots").click();
  await shot(page, "palace-objection");
  await hold(page, page.getByTestId("declare"));
  await holmesSpeaks(page);
  await readNarration(page);

  await enterPalace(page);
  for (const id of ["p3", "p1", "p2", "p4"]) await page.getByTestId(`card-${id}`).click();
  await page.getByTestId("turn-p4").click(); // stated → contrapositive
  await shot(page, "palace-chain");
  await hold(page, page.getByTestId("declare"));
  await holmesSpeaks(page, "holmes-speaks-chain");

  // Finale
  await enterPalace(page);
  for (const [blank, word] of [
    ["culprit", "Mr. Vance"],
    ["when", "before nine"],
    ["false-time", "9:14"],
    ["alibi", "the Colonel"],
    ["motive", "the forged partnership deed"],
  ]) {
    await page.getByTestId(`blank-${blank}`).click();
    await page.locator("button.chip", { hasText: word }).first().click();
  }
  await shot(page, "palace-reconstruction");
  await hold(page, page.getByTestId("declare"));
  await page.getByTestId("solution").waitFor();
  await page.getByTestId("continue").click();
  await page.getByTestId("account").waitFor();
  await page.waitForTimeout(1200); // let the seal stamp
  await shot(page, "account");
  const grade = await page.getByTestId("grade").textContent();
  if (grade !== "workmanlike") throw new Error(`expected a Workmanlike grade, got ${grade}`);
  await page.getByTestId("continue").click();
  await shot(page, "casebook-after");

  // Holmes' Ledger: the finished case's deductions are counted.
  await page.getByRole("button", { name: "Holmes’ Ledger" }).click();
  await page.locator(".ledger-row").first().waitFor();
  await shot(page, "ledger");
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByText("By Candlelight").waitFor();
  await shot(page, "settings");
  await page.getByRole("button", { name: "Credits" }).click();
  await shot(page, "credits");

  if (errors.length) throw new Error(`browser errors:\n${errors.join("\n")}`);
  await browser.close();
  console.log(`Playthrough passed (grade: ${grade}). Screenshots in ${shots}`);
}

main()
  .then(() => {
    stop();
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    stop();
    process.exit(1);
  });
