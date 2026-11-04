const { spawn, spawnSync } = require('node:child_process');
const { mkdir, writeFile } = require('node:fs/promises');
const { createRequire } = require('node:module');
const path = require('node:path');

const expoPackage = require.resolve('expo/package.json');
const expoCli = path.join(path.dirname(expoPackage), 'bin/cli');
const outputDirectory = path.resolve('dist/phone-preview');
const durationMs = 45 * 60 * 1000;
let server;
let stopped = false;

function stop() {
  if (stopped) return;
  stopped = true;
  server?.kill('SIGTERM');
}

async function main() {
  if (!process.env.EXPO_TOKEN) {
    throw new Error('GitHub Actions repository secret EXPO_TOKEN is required.');
  }
  const config = require('../app.json').expo;
  const expectedAccount = config.owner;
  if (!config.extra?.eas?.projectId) {
    throw new Error('A linked EAS project is required for shared Expo Go previews.');
  }
  const identity = spawnSync(process.execPath, [expoCli, 'whoami'], { encoding: 'utf8' });
  if (identity.status !== 0 || !identity.stdout.trim()) {
    const detail = (identity.stderr || identity.stdout || 'No Expo account returned.')
      .replaceAll(process.env.EXPO_TOKEN, '***').trim();
    throw new Error('Expo authentication failed: ' + detail);
  }
  const signedInAs = identity.stdout.trim();
  console.log('Expo account verified: ' + signedInAs);
  server = spawn(process.execPath, [expoCli, 'start', '--tunnel', '--go', '--port', '8081'], {
    stdio: 'inherit',
    env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' },
  });
  server.on('error', () => { stop(); process.exitCode = 1; });
  server.on('exit', code => {
    if (!stopped) process.exit(code || 1);
  });
  const deadline = Date.now() + 180000;
  let previewUrl;
  while (Date.now() < deadline && !stopped) {
    try {
      const response = await fetch('http://127.0.0.1:8081/_expo/open?platform=ios&runtime=expo', {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const result = await response.json();
        const url = new URL(result.url);
        if (['exp:', 'exps:'].includes(url.protocol) &&
            !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) {
          previewUrl = result.url;
          break;
        }
      }
    } catch { /* Metro and its tunnel are still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (!previewUrl) throw new Error('Expo tunnel did not become ready within three minutes.');
  const requireFromExpo = createRequire(expoPackage);
  const requireFromCli = createRequire(requireFromExpo.resolve('@expo/cli/package.json'));
  const matrix = Array.from(requireFromCli('toqr').toQR(previewUrl));
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, 'qr.json'), JSON.stringify(matrix));
  const preview = {
    url: previewUrl,
    account: expectedAccount,
    signedInAs,
    expiresAt: new Date(Date.now() + durationMs).toISOString(),
  };
  await writeFile(path.join(outputDirectory, 'preview.json'), JSON.stringify(preview, null, 2));
  console.log('iPhone preview: ' + previewUrl);
  const lifetime = setTimeout(stop, durationMs);
  await new Promise(resolve => server.once('exit', resolve));
  clearTimeout(lifetime);
}

process.once('SIGINT', stop);
process.once('SIGTERM', stop);
main().catch(error => {
  console.error(error.message);
  stop();
  process.exitCode = 1;
});
