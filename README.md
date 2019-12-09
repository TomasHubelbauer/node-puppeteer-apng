# Node Puppeteer APNG

A pure JavaScript Node library for recording a screencast of a webpage and
returning an animated PNG (APNG) file of the screencast. APNG is supported
in Firefox, Chrome, Safari and in the Chrome-based version of Edge. Also,
GitHub will play animated PNGs in readmes and other MarkDown documents, no
problem.

## Usage and API

`npm install https://github.com/TomasHubelbauer/node-puppeteer-apng`

### Capture a 5 second clip of a webpage by URL

```js
const buffer = await nodePuppeteerApng('https://google.com/ncr');
await fs.writeFile(`screencast.png`, buffer);
```

### Set up a Puppeteer scene and start and stop the recording programatically

```js
const buffer = await nodePuppeteerApng(async (start, stop) => {
  const browser = await puppeteer.launch();
  const [page] = await browser.pages();
  await page.goto('https://www.youtube.com/watch?v=jNQXAC9IVRw');
  const playButton = await page.waitForSelector('.ytp-large-play-button');
  await playButton.click();
  await start(page);
  await page.waitFor(5000);
  await stop();
  await browser.close();
});

await fs.writeFile(`screencast.png`, buffer);
```

## To-Do

### Set up GitHub Actions for the test

### Rename cuts to timestampts everywhere

### Fix the timestamps in the trace method

### Fix the flaky custom setup test failing on the play button
