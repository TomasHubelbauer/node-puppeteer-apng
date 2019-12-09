const puppeteer = require('puppeteer');
const apng = require('node-apng');
const jimp = require('jimp');

module.exports = function (setupOrUrl, method = 'screencast') {
  const setup = typeof setupOrUrl === 'string' ? (start, stop) => doBasicSetup(setupOrUrl, start, stop) : setupOrUrl;
  switch (method) {
    case 'screencast': {
      return recordUsingScreencast(setup);
    }
    case 'screenshot': {
      return recordUsingScreenshot(setup);
    }

    case 'trace': {
      return recordUsingTrace(setup);
    }
  }

  throw new Error(`Invalid method "${method}"! Expected screencast, screenshot or trace.`);
}

async function doBasicSetup(url, start, stop) {
  const browser = await puppeteer.launch();
  const [page] = await browser.pages();
  await page.goto(url);
  await start(page);
  await page.waitFor(5000);
  await stop();
  await browser.close();
}

async function recordUsingScreencast(setup) {
  let buffers;
  let cuts;
  let timestamp;
  let session;

  let resolve;
  // TODO: Hook up the reject using try-catch blocks in start and stop
  let reject;
  const deffered = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  async function start(page) {
    // Clear the buffers and cuts and reset the timestamp from the previous recording
    buffers = [];
    cuts = [];
    timestamp = Date.now();
    session = await page.target().createCDPSession();
    await session.send('Page.startScreencast');
    session.on('Page.screencastFrame', event => {
      const buffer = Buffer.from(event.data, 'base64');
      buffers.push(buffer);
      cuts.push(Date.now());
    });
  }

  async function stop() {
    await session.send('Page.stopScreencast');
    // Drop the first frame because it always has wrong dimensions
    buffers.shift(0);
    cuts.shift(0);
    resolve(makeApng(buffers, cuts, timestamp));
  }

  await setup(start, stop);
  return deffered;
}

async function recordUsingScreenshot(setup) {
  let buffers;
  let cuts;
  let timestamp;
  let record;

  let resolve;
  // TODO: Hook up the reject using try-catch blocks in start and stop
  let reject;
  const deffered = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  async function start(page) {
    // Clear the buffers and cuts and reset the timestamp from the previous recording
    buffers = [];
    cuts = [];
    timestamp = Date.now();
    record = true;

    void function snap() {
      if (!record) {
        return;
      }

      page.screenshot()
        .then(buffer => {
          buffers.push(buffer);
          cuts.push(Date.now());
          snap();
        })
        // Ignore target having closed, we just stop collecting then
        .catch(error => { });
    }()
  }

  async function stop() {
    record = false;
    resolve(makeApng(buffers, cuts, timestamp));
  }

  await setup(start, stop);
  return deffered;
}

async function recordUsingTrace(setup) {
  let timestamp;
  let tracing;

  let resolve;
  // TODO: Hook up the reject using try-catch blocks in start and stop
  let reject;
  const deffered = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  async function start(page) {
    // Reset the timestamp from the previous recording
    timestamp = Date.now();
    await page.tracing.start({ screenshots: true });
    tracing = page.tracing;
  }

  async function stop() {
    const buffer = await tracing.stop();
    const trace = JSON.parse(await String(buffer));
    const buffers = [];
    const cuts = [];
    for (const event of trace.traceEvents) {
      if (event.name === 'Screenshot') {
        const jpgBuffer = Buffer.from(event.args.snapshot, 'base64');
        const image = await jimp.read(jpgBuffer);
        const pngBuffer = await image.getBufferAsync('image/png');
        buffers.push(pngBuffer);

        // TODO: Pull the correct timestamp from the event -> event.ts/event.tts
        cuts.push(Date.now());
      }
    }

    // Drop the first frame because it always has wrong dimensions
    buffers.shift(0);
    cuts.shift(0);
    resolve(makeApng(buffers, cuts, timestamp));
  }

  await setup(start, stop);
  return deffered;
}

function makeApng(buffers, cuts, timestamp) {
  const delays = cuts.reduce((a, c, i) => { a.push(c - (cuts[i - 1] || timestamp)); return a; }, []);
  return apng(buffers, index => ({ numerator: 1, denominator: 1000 / delays[index] }));
}
