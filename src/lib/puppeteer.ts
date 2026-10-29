import fs from 'fs';
import puppeteer, { type Browser, type Page } from 'puppeteer';

const globalForPuppeteer = globalThis as unknown as {
  _sharedPuppeteerBrowser?: Browser | null;
  _puppeteerLaunchPromise?: Promise<Browser> | null;
};

function getExecutablePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.platform === 'win32') {
    const winChromeCandidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : '',
    ].filter(Boolean);
    const systemWinChrome = winChromeCandidates.find((p) => fs.existsSync(p));
    if (systemWinChrome) return systemWinChrome;
  }
  const defaultLinuxPaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable',
  ];
  return defaultLinuxPaths.find(p => fs.existsSync(p));
}

const CHROMIUM_BASE_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-first-run',
  '--no-zygote',
  '--single-process',
  '--font-render-hinting=medium',
];

/**
 * Mendapatkan instance Chromium browser singleton yang tetap hidup di memori server.
 * Dilengkapi proteksi race-condition saat startup dan auto-healing jika proses browser terputus.
 */
export async function getSharedBrowser(): Promise<Browser> {
  const existing = globalForPuppeteer._sharedPuppeteerBrowser;
  if (existing && existing.connected) {
    return existing;
  }

  // Jika sedang ada proses launching dari request paralel lain, tunggu promise yang sama
  if (globalForPuppeteer._puppeteerLaunchPromise) {
    return globalForPuppeteer._puppeteerLaunchPromise;
  }

  const launchPromise = (async () => {
    try {
      const executablePath = getExecutablePath();
      const browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: CHROMIUM_BASE_ARGS,
      });

      browser.on('disconnected', () => {
        globalForPuppeteer._sharedPuppeteerBrowser = null;
        globalForPuppeteer._puppeteerLaunchPromise = null;
      });

      globalForPuppeteer._sharedPuppeteerBrowser = browser;
      return browser;
    } finally {
      globalForPuppeteer._puppeteerLaunchPromise = null;
    }
  })();

  globalForPuppeteer._puppeteerLaunchPromise = launchPromise;
  return launchPromise;
}

/**
 * Helper eksekusi tab/page Chromium dengan jaminan penutupan tab 100% (anti memory-leak).
 */
export async function withBrowserPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  try {
    return await fn(page);
  } finally {
    await page.close().catch(() => undefined);
  }
}
