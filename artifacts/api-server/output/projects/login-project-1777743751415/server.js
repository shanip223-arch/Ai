'use strict';
const express = require('express');
const path    = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// Serve all static project files
app.use(express.static(path.join(__dirname)));

// SPA fallback
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () =>
  console.log(`\n  🚀  Running at http://localhost:${PORT}\n`)
);
