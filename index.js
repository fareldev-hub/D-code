const express = require('express');
const path = require('path');
const { Readable } = require('stream');
const app = express();
const port = Number(process.env.PORT) || 3000;

app.get('/404', (req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'), (err) => {
    if (err) next(err);
  });
});

app.use('/private', (req, res) => {
  res.redirect('/404');
});

app.use((req, res, next) => {
  const acceptHeader = req.get('accept') || '';
  const isDocumentRequest = req.get('sec-fetch-dest') === 'document'
    || /(?:^|,)\s*text\/html(?:\s*;|,|$)/i.test(acceptHeader);

  if (/\.(?:css|js)$/i.test(req.path) && isDocumentRequest) {
    return res.redirect('/404');
  }

  next();
});

app.get('/api/github/pages-status', async (req, res) => {
  const owner = typeof req.query.owner === 'string' ? req.query.owner : '';
  const repository = typeof req.query.repository === 'string' ? req.query.repository : '';
  const validIdentifier = /^[\w.-]+$/;
  let previewUrl;

  try {
    previewUrl = new URL(typeof req.query.url === 'string' ? req.query.url : '');
  } catch {
    return res.status(400).json({ available: false, status: 400 });
  }

  if (!validIdentifier.test(owner) || !validIdentifier.test(repository)
    || previewUrl.protocol !== 'https:'
    || previewUrl.hostname.toLowerCase() !== `${owner}.github.io`.toLowerCase()) {
    return res.status(400).json({ available: false, status: 400 });
  }

  try {
    let upstream = await fetch(previewUrl, { method: 'HEAD', redirect: 'manual' });
    if (upstream.status === 405 || upstream.status === 501) {
      upstream = await fetch(previewUrl, {
        headers: { Range: 'bytes=0-0' },
        redirect: 'manual'
      });
      await upstream.body?.cancel();
    }
    return res.json({ available: upstream.ok, status: upstream.status });
  } catch {
    return res.json({ available: false, status: 0 });
  }
});

app.get(/^\/api\/github\/raw\/(.+)$/, async (req, res) => {
  let segments;
  try {
    const pathname = new URL(req.originalUrl, 'http://localhost').pathname;
    segments = pathname.slice('/api/github/raw/'.length).split('/').map(decodeURIComponent);
  } catch {
    return res.status(400).send('Path file GitHub tidak valid.');
  }

  if (segments.length < 4) {
    return res.status(400).send('Path file GitHub tidak lengkap.');
  }

  const [owner, repository, branch, ...fileSegments] = segments;
  const validIdentifier = /^[\w.-]+$/;
  if (!validIdentifier.test(owner) || !validIdentifier.test(repository)
    || branch.split('/').some((part) => !validIdentifier.test(part))
    || fileSegments.some((part) => !part || part === '.' || part === '..' || part.includes('\\'))) {
    return res.status(400).send('Path file GitHub tidak valid.');
  }

  const upstreamPath = [
    encodeURIComponent(owner),
    encodeURIComponent(repository),
    ...branch.split('/').map(encodeURIComponent),
    ...fileSegments.map(encodeURIComponent)
  ].join('/');

  try {
    const upstream = await fetch(`https://raw.githubusercontent.com/${upstreamPath}`);
    const contentTypes = {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.htm': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8'
    };

    res.status(upstream.status);
    res.set('Content-Type', contentTypes[path.extname(fileSegments.at(-1)).toLowerCase()]
      || upstream.headers.get('content-type')
      || 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=300');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');

    if (!upstream.body) return res.end();
    Readable.fromWeb(upstream.body)
      .on('error', (error) => res.destroy(error))
      .pipe(res);
  } catch {
    res.status(502).send('File tidak dapat diambil dari GitHub.');
  }
});

app.use('/assets/css', express.static(path.join(__dirname, 'private', 'css'), {
  dotfiles: 'deny',
  index: false
}));

app.get('/assets/js/app.js', (req, res, next) => {
  res.sendFile(path.join(__dirname, 'private', 'app.js'), (err) => {
    if (err) next(err);
  });
});

app.get('/assets/js/templates.js', (req, res, next) => {
  res.sendFile(path.join(__dirname, 'private', 'templates.js'), (err) => {
    if (err) next(err);
  });
});

app.get('/assets/js/template-detail.js', (req, res, next) => {
  res.sendFile(path.join(__dirname, 'private', 'template-detail.js'), (err) => {
    if (err) next(err);
  });
});

app.use(express.static('public'));

app.get('/learn', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'learn.html'));
});

app.get('/templates', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'templates.html'));
});

app.get('/templates/:owner/:repository', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'template-detail.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.listen(port, () => {
  console.log(`Website Berjalan Di localhost:${port}`);
});