const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');

async function main() {
  const published = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
  const updates = Array.isArray(published) ? published : published.updates || [published];
  const first = updates[0];
  const groupValue = first?.group || first?.groupId || first?.updateGroupId;
  const groupId = typeof groupValue === 'string' ? groupValue : groupValue?.id;
  const config = require('../app.json').expo;
  const projectId = config.extra?.eas?.projectId;
  if (!groupId || !projectId) throw new Error('Published update group or project ID is missing.');
  const channel = 'shared-preview';
  const runtimeVersion = first.runtimeVersion;
  if (typeof runtimeVersion !== 'string' || !runtimeVersion)
    throw new Error('Published runtime version is missing.');
  const output = path.resolve('dist/shared-preview');
  await fs.mkdir(output, { recursive: true });
  const qrUrl = new URL('https://qr.expo.dev/eas-update');
  qrUrl.searchParams.set('projectId', projectId);
  qrUrl.searchParams.set('channel', channel);
  qrUrl.searchParams.set('runtimeVersion', runtimeVersion);
  qrUrl.searchParams.set('slug', 'exp');
  const connection = {
    projectId,
    groupId,
    account: config.owner,
    platforms: updates.map((update) => update.platform).filter(Boolean),
    channel,
    runtimeVersion,
    qrUrl: qrUrl.href,
    versionUrl: `exp://u.expo.dev/${projectId}/group/${groupId}`,
    dashboardUrl: `https://expo.dev/accounts/${config.owner}/projects/${config.slug}/updates/${groupId}`,
    publishedAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(output, 'connection.json'), JSON.stringify(connection, null, 2));
  await fs.writeFile(path.join(output, 'published.json'), JSON.stringify(published, null, 2));
  qrUrl.searchParams.set('format', 'url');
  const response = await fetch(qrUrl, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error('Expo QR service returned HTTP ' + response.status);
  const text = (await response.text()).trim();
  let launchUrl = text;
  try {
    const value = JSON.parse(text);
    launchUrl = typeof value === 'string' ? value : value.url;
  } catch {
    /* The QR service can return a plain-text deep link. */
  }
  if (typeof launchUrl !== 'string' || !/^exps?:\/\//.test(launchUrl)) {
    throw new Error('Expo QR service did not return an Expo Go launch URL.');
  }
  const launch = new URL(launchUrl);
  if (
    launch.hostname !== 'u.expo.dev' ||
    launch.pathname !== `/${projectId}` ||
    launch.searchParams.get('channel-name') !== channel ||
    launch.searchParams.get('runtime-version') !== runtimeVersion
  ) {
    throw new Error('The preview URL must target the persistent channel and compatible runtime.');
  }
  connection.url = launchUrl;
  const requireFromExpo = createRequire(require.resolve('expo/package.json'));
  const requireFromCli = createRequire(requireFromExpo.resolve('@expo/cli/package.json'));
  const matrix = Array.from(requireFromCli('toqr').toQR(launchUrl));
  await fs.writeFile(path.join(output, 'qr.json'), JSON.stringify(matrix));
  await fs.writeFile(path.join(output, 'connection.json'), JSON.stringify(connection, null, 2));
  console.log(JSON.stringify(connection, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
