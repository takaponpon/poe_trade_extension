/**
 * PoE2 Trade Extension - Interactive Headful Verification Script
 * Launches a real headful Chrome window with our unpacked extension,
 * navigates to the official PoE2 Trade page, and waits for the user
 * to log in. Once the user is logged in and ready, they press ENTER in the terminal
 * to capture a screenshot showing the active extension.
 */

const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  // Ensure absolute path with escaped backslashes for Windows compatibility
  const extensionPath = path.resolve(__dirname, '..');
  const screenshotPath = 'C:\\Users\\takah\\.gemini\\antigravity\\brain\\2904ac05-f77d-43e7-98ed-92a87bc1b653\\trade_screenshot.png';

  console.log('========================================================');
  console.log(`Extension Path: ${extensionPath}`);
  console.log(`Saving Screenshot to: ${screenshotPath}`);
  console.log('========================================================');

  console.log('Launching a real Chrome window (headless: false) with the extension loaded...');
  const browser = await puppeteer.launch({
    headless: false, // Open a visible browser window so the user can interact and log in!
    defaultViewport: null, // Allow natural window sizing
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--start-maximized'
    ]
  });

  try {
    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();
    
    // Set a solid desktop size
    await page.setViewport({ width: 1440, height: 900 });

    console.log('Navigating to Path of Exile 2 official trade site...');
    await page.goto('https://jp.pathofexile.com/trade2/search/poe2', {
      waitUntil: 'domcontentloaded'
    });

    console.log('\n🌟 USER ACTION REQUIRED 🌟');
    console.log('1. Real Chrome has opened on your screen.');
    console.log('2. Please log in to your Path of Exile account inside that window.');
    console.log('3. Navigate back to the PoE2 Trade search page (if you were redirected).');
    console.log('4. Once you are logged in, the sidebar is visible, and you are ready...');
    console.log('👉 GO TO THE TERMINAL INPUT AND PRESS [ENTER] key to capture the screenshot! 👈\n');

    // Wait for the user to press Enter in the terminal
    await new Promise((resolve) => {
      process.stdin.once('data', () => {
        resolve();
      });
    });

    console.log('Capturing viewport screenshot...');
    await page.screenshot({ path: screenshotPath });
    console.log('SUCCESS! Screenshot captured successfully.');

  } catch (err) {
    console.error('Error during interactive verification:', err);
  } finally {
    console.log('Closing browser...');
    await browser.close();
    console.log('Browser closed. Process finished.');
    process.exit(0);
  }
})();
