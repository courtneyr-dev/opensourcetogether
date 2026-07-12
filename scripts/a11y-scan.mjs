#!/usr/bin/env node
/**
 * Accessibility scan: runs axe-core against key routes of a running dev
 * server (default http://localhost:4321) and exits non-zero on any
 * violation. Usage:
 *
 *   npm run a11y            # scan default routes
 *   BASE_URL=... npm run a11y
 *
 * Requires a Chrome/Chromium binary (CHROME_PATH overrides discovery).
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import puppeteer from "puppeteer-core";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const axeSource = readFileSync(axePath, "utf8");

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4321";
const ROUTES = [
	"/",
	"/posts",
	"/blogroll",
	"/search",
	"/pages/about",
	"/pages/privacy",
	"/this-page-does-not-exist", // 404 template
];

function findChrome() {
	if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
	for (const bin of ["google-chrome", "chromium", "chromium-browser"]) {
		try {
			return execSync(`which ${bin}`, { encoding: "utf8" }).trim();
		} catch {
			// try next
		}
	}
	throw new Error("No Chrome binary found; set CHROME_PATH");
}

// First post link discovered from the archive gets scanned too, so the
// post template is covered without hard-coding a slug.
async function discoverPostRoute(page) {
	await page.goto(`${BASE_URL}/posts`, { waitUntil: "networkidle0" });
	return page.evaluate(() => {
		const link = document.querySelector('a[href^="/posts/"]');
		return link ? link.getAttribute("href") : null;
	});
}

const browser = await puppeteer.launch({
	executablePath: findChrome(),
	headless: "new",
	args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

let totalViolations = 0;

try {
	const page = await browser.newPage();

	const postRoute = await discoverPostRoute(page);
	const routes = postRoute ? [...ROUTES, postRoute] : ROUTES;

	for (const route of routes) {
		const url = `${BASE_URL}${route}`;
		await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
		await page.evaluate(axeSource);
		const results = await page.evaluate(() =>
			// eslint-disable-next-line no-undef
			axe.run(document, {
				runOnly: {
					type: "tag",
					values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
				},
			}),
		);

		if (results.violations.length === 0) {
			console.log(`PASS ${route}`);
			continue;
		}

		totalViolations += results.violations.length;
		console.log(`FAIL ${route} — ${results.violations.length} violation(s)`);
		for (const v of results.violations) {
			console.log(`  [${v.impact}] ${v.id}: ${v.help}`);
			for (const node of v.nodes.slice(0, 3)) {
				console.log(`    ${node.target.join(" ")}`);
			}
		}
	}
} finally {
	await browser.close();
}

if (totalViolations > 0) {
	console.error(`\n${totalViolations} accessibility violation(s) found.`);
	process.exit(1);
}
console.log("\nAll routes pass the axe scan.");
