/**
 * PoE2 Trade Extension - Automated Dev Browser Launcher
 * Launches native Google Chrome with a dedicated development profile and our
 * unpacked extension loaded.
 * 
 * Written in Node.js to be 100% shell-independent (PowerShell, CMD, Bash compatible)
 * and safely handle Windows spaces in paths (like "Program Files") without escaping bugs.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const workspacePath = path.resolve(__dirname, '..');
const profilePath = path.join(workspacePath, '.chrome-profile');
const url = 'https://jp.pathofexile.com/trade2/search/poe2/';

console.log('========================================================');
console.log('         PoE2 Trade Extension Dev Launcher              ');
console.log('========================================================');
console.log(`Chrome Executable : ${chromePath}`);
console.log(`Profile Directory : ${profilePath}`);
console.log(`Extension Path    : ${workspacePath}`);
console.log(`Target URL        : ${url}`);
console.log('========================================================');

// Ensure the profile directory exists (avoids Chrome creation hiccups)
if (!fs.existsSync(profilePath)) {
  fs.mkdirSync(profilePath, { recursive: true });
}

// Spawn Chrome as a completely detached background process
const chrome = spawn(chromePath, [
  `--user-data-dir=${profilePath}`,
  `--load-extension=${workspacePath}`,
  '--new-window',
  url
], {
  detached: true,     // Detaches the child process
  stdio: 'ignore'     // Ignores stdio so it doesn't hold the parent terminal
});

// Unreference the child process so Node can exit cleanly while Chrome remains open
chrome.unref();

console.log('\n🚀 Dev Chrome launched successfully in a separate window!');
console.log('Terminal control returned. Happy coding!\n');
process.exit(0);
