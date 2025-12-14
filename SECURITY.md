# Security Notice

Vercel published a security bulletin for CVE-2025-55184 and CVE-2025-55183 affecting Next.js runtimes. To address this bulletin we bumped the application to Next.js 15.1.6 (and matching eslint tooling) so future installs pick up the patched runtime. If you reinstall dependencies, please run `npm ci` or `npm install` to download the updated packages.

If your environment blocks access to the public npm registry, mirror the updated versions internally before installing.
