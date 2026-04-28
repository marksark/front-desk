import puppeteer from "puppeteer-core";

const url = "http://localhost:3000/intake?tenant=sunshine-academy";
const visible = process.env.VISIBLE === "1" || process.argv.includes("--visible");

const browser = await puppeteer.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: visible ? false : "new",
  slowMo: visible ? 60 : 0,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,900"]
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(url, { waitUntil: "networkidle0" });

  const inputs = await page.$$("input.MuiInputBase-input");
  if (inputs.length < 3) {
    throw new Error(`Expected at least 3 MUI text inputs, got ${inputs.length}`);
  }

  await inputs[0].type("Walkthrough Parent", { delay: 20 });
  await inputs[1].type("walk@example.com", { delay: 20 });
  await inputs[2].type("Walkthrough Child", { delay: 20 });

  await Promise.all([
    page.waitForSelector('[data-testid="intake-success"]', { timeout: 25000 }),
    page.click('button[type="submit"]')
  ]);

  console.log("OK: thank-you state reached");
} finally {
  await browser.close();
}
