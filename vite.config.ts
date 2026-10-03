import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { defineConfig, Plugin } from 'vite';

function repoZipPlugin(): Plugin {
  return {
    name: 'repo-zip-plugin',
    configureServer(server) {
      server.middlewares.use('/api/download-zip', (req, res) => {
        try {
          const zipPath = '/tmp/edgespec-full-repo.zip';
          execSync(
            `python3 -c "
import os, zipfile
EXCLUDE = {'node_modules', '.git', 'dist', '__pycache__', '.pytest_cache'}
with zipfile.ZipFile('${zipPath}', 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in EXCLUDE]
        for f in files:
            if f.endswith('.pyc') or f.endswith('.log'): continue
            fp = os.path.join(root, f)
            arcname = os.path.relpath(fp, '.')
            z.write(fp, arcname)
"`,
            { cwd: process.cwd() }
          );

          if (fs.existsSync(zipPath)) {
            const stat = fs.statSync(zipPath);
            res.writeHead(200, {
              'Content-Type': 'application/zip',
              'Content-Length': stat.size,
              'Content-Disposition': 'attachment; filename="edgespec-full-repo.zip"',
            });
            const stream = fs.createReadStream(zipPath);
            stream.pipe(res);
            return;
          }
        } catch (err) {
          console.error('Error generating zip:', err);
        }
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Failed to generate repo zip');
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), repoZipPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
