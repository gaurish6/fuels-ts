#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';
import { join } from 'path';
import sh from 'shelljs';

import { buildFromGitBranch, getCurrentVersion, getPkgPlatform, isGitBranch } from './shared';

(async () => {
  const { info } = console;

  const pkgPlatform = getPkgPlatform();
  const fuelCoreVersion = await getCurrentVersion();

  // If a git branch is specified in the VERSION file, build from that branch
  if (isGitBranch(fuelCoreVersion)) {
    const branchName = fuelCoreVersion.split(':')[1];
    buildFromGitBranch(branchName);
    return;
  }

  const fileName = `fuel-core-${fuelCoreVersion}-${pkgPlatform}`;
  const pkgName = `${fileName}.tar.gz`;
  const pkgUrl = `https://github.com/FuelLabs/fuel-core/releases/download/v${fuelCoreVersion}/${pkgName}`;

  const pkgPath = join(__dirname, pkgName);
  const rootDir = join(__dirname, '..');
  const binDir = join(rootDir, 'fuel-core-binaries');

  const binPath = join(binDir, 'fuel-core');
  let versionMatches = false;

  if (existsSync(binPath)) {
    const binRawVersion = execSync(`${binPath} --version`).toString().trim();
    const binVersion = binRawVersion.match(/([.0-9]+)/)?.[0];

    versionMatches = binVersion === fuelCoreVersion;
    info({ expected: fuelCoreVersion, received: binVersion });
  }

  if (versionMatches) {
    info(`Fue-Core binary already installed, skipping.`);
  } else {
    // Download
    const buf = await fetch(pkgUrl).then((r) => r.buffer());
    await writeFileSync(pkgPath, buf);

    // Extract
    sh.exec(`tar xzf "${pkgPath}" -C "${rootDir}"`);
    sh.mv(fileName, binDir);

    // Cleanup
    await rmSync(pkgPath);
  }
})();