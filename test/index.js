const nodePuppeteerApng = require('..');
const fs = require('fs-extra');
const puppeteer = require('puppeteer');

void async function () {
  const url = 'https://google.com';
  const setup = async (start, stop) => {
    const browser = await puppeteer.launch();
    const [page] = await browser.pages();
    await page.goto('https://www.youtube.com/watch?v=jNQXAC9IVRw');
    const playButton = await page.waitForSelector('.ytp-large-play-button');
    await playButton.click();
    await start(page);
    await page.waitFor(5000);
    await stop();
    await browser.close();
  };

  for (const setupOrUrl of [url, setup]) {
    for (const method of ['screencast', 'screenshot', 'trace']) {
      console.log(typeof setupOrUrl === 'string' ? 'url' : 'setup', method);
      const buffer = await nodePuppeteerApng(setupOrUrl, method);
      await fs.writeFile(`screencast-${typeof setupOrUrl === 'string' ? 'url' : 'setup'}-${method}.png`, buffer);
    }
  }
}()
