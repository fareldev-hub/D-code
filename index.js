const express = require('express');
const path = require('path');
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