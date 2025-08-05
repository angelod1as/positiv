/**
 * Wrapper script for serving Vercel builds in production
 * This file is executed as a separate process to avoid dynamic code execution
 */
import express from 'express';
import { join, isAbsolute, resolve } from 'path';
import compression from 'compression';
import { existsSync, statSync } from 'fs';
import { createRequestHandler } from '@react-router/express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 5173;
const SERVER_PATH = process.env.SERVER_PATH;

// Validate SERVER_PATH environment variable
if (!SERVER_PATH) {
  console.error('SERVER_PATH environment variable is required');
  process.exit(1);
}

// Additional validation for the server path
const serverPath = isAbsolute(SERVER_PATH) ? SERVER_PATH : resolve(SERVER_PATH);

if (!existsSync(serverPath)) {
  console.error(`Server path does not exist: ${serverPath}`);
  process.exit(1);
}

const stats = statSync(serverPath);
if (!stats.isFile()) {
  console.error(`Server path is not a file: ${serverPath}`);
  process.exit(1);
}

if (!serverPath.endsWith('.js')) {
  console.error(`Server path must be a JavaScript file: ${serverPath}`);
  process.exit(1);
}

// Ensure the path is within the build directory
const buildDir = resolve(process.cwd(), 'build');
if (!serverPath.startsWith(buildDir)) {
  console.error(`Server path must be within build directory: ${serverPath}`);
  process.exit(1);
}

const app = express();

// Enable compression
app.use(compression());

// Serve static files
app.use(express.static(join(process.cwd(), 'build/client'), {
  maxAge: '1h',
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Import the Vercel server build dynamically
const serverBuild = await import(serverPath);

// Create the request handler with the build
const requestHandler = createRequestHandler({
  build: serverBuild,
  mode: process.env.NODE_ENV || 'production'
});

// Handle all other requests with React Router
app.all('*', requestHandler);

// Start server
const server = app.listen(PORT, () => {
  console.info('Production server running at http://localhost:' + PORT);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.info('SIGTERM received, closing server...');
  server.close(() => {
    console.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.info('SIGINT received, closing server...');
  server.close(() => {
    console.info('Server closed');
    process.exit(0);
  });
});