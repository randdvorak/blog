import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import express from 'express';
import matter from 'gray-matter';
import { marked } from 'marked';
import multer from 'multer';
import sanitizeHtml from 'sanitize-html';

const editorDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(editorDirectory, '..');
const postsDirectory = path.join(projectDirectory, 'src', 'content', 'posts');
const imagesDirectory = path.join(projectDirectory, 'public', 'images');
const trashDirectory = path.join(projectDirectory, 'trash');
const siteBase = '/blog';
const editorPort = Number(process.env.EDITOR_PORT || 4322);
const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(_request, file, callback) {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']);
    callback(allowed.has(file.mimetype) ? null : new Error('Select a JPEG, PNG, GIF, WebP, or AVIF image.'), allowed.has(file.mimetype));
  }
});

const safeSlug = (value = '') => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 100);

const safeFileName = (value = '') => {
  const extension = path.extname(value).toLowerCase();
  const name = path.basename(value, extension)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'image';
  return `${name}-${crypto.randomBytes(3).toString('hex')}${extension}`;
};

const postPath = (slug) => path.join(postsDirectory, `${slug}.md`);

async function writeAtomic(filePath, value) {
  const temporaryPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporaryPath, value, 'utf8');
  await fs.rename(temporaryPath, filePath);
}

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(editorDirectory, 'public')));
app.use(`${siteBase}/images`, express.static(imagesDirectory));

app.get('/api/posts', async (_request, response, next) => {
  try {
    const files = (await fs.readdir(postsDirectory)).filter((file) => file.endsWith('.md'));
    const posts = await Promise.all(files.map(async (file) => {
      const source = await fs.readFile(path.join(postsDirectory, file), 'utf8');
      const { data } = matter(source);
      return {
        slug: file.slice(0, -3),
        title: data.title || file.slice(0, -3),
        date: data.date || '',
        draft: data.draft !== false
      };
    }));
    posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    response.json(posts);
  } catch (error) {
    next(error);
  }
});

app.get('/api/posts/:slug', async (request, response, next) => {
  try {
    const slug = safeSlug(request.params.slug);
    if (slug !== request.params.slug) return response.status(400).json({ error: 'The post slug is not valid.' });
    const source = await fs.readFile(postPath(slug), 'utf8');
    const parsed = matter(source);
    response.json({
      slug,
      title: parsed.data.title || '',
      date: parsed.data.date ? new Date(parsed.data.date).toISOString().slice(0, 10) : '',
      description: parsed.data.description || '',
      draft: parsed.data.draft !== false,
      coverImage: parsed.data.coverImage || '',
      tags: Array.isArray(parsed.data.tags) ? parsed.data.tags.join(', ') : '',
      body: parsed.content.replace(/^\n/, '')
    });
  } catch (error) {
    if (error.code === 'ENOENT') return response.status(404).json({ error: 'The post does not exist.' });
    next(error);
  }
});

app.post('/api/posts', async (request, response, next) => {
  try {
    const { originalSlug = '', title = '', date = '', description = '', draft = true, coverImage = '', tags = '', body = '' } = request.body;
    const slug = safeSlug(request.body.slug || title);
    const priorSlug = originalSlug ? safeSlug(originalSlug) : '';
    if (!title.trim()) return response.status(400).json({ error: 'Enter a post title.' });
    if (!slug) return response.status(400).json({ error: 'Enter a valid post slug.' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return response.status(400).json({ error: 'Enter a valid post date.' });

    if (priorSlug && priorSlug !== slug) {
      try {
        await fs.access(postPath(slug));
        return response.status(409).json({ error: 'Another post already uses this slug.' });
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }

    const post = matter.stringify(String(body).trimEnd() + '\n', {
      title: title.trim(),
      date,
      description: description.trim(),
      draft: Boolean(draft),
      ...(coverImage.trim() ? { coverImage: coverImage.trim() } : {}),
      tags: String(tags).split(',').map((tag) => tag.trim()).filter(Boolean)
    });
    await writeAtomic(postPath(slug), post);
    if (priorSlug && priorSlug !== slug) await fs.rm(postPath(priorSlug), { force: true });
    response.json({ slug, message: 'Post saved.' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/render', (request, response) => {
  const rendered = marked.parse(String(request.body.body || ''), { gfm: true, breaks: false });
  const clean = sanitizeHtml(rendered, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title'],
      code: ['class']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true)
    }
  });
  response.json({ html: clean });
});

app.post('/api/images', upload.single('image'), async (request, response, next) => {
  try {
    const slug = safeSlug(request.body.slug);
    if (!slug) return response.status(400).json({ error: 'Save the post before you add an image.' });
    if (!request.file) return response.status(400).json({ error: 'Select an image.' });
    const directory = path.join(imagesDirectory, slug);
    await fs.mkdir(directory, { recursive: true });
    const fileName = safeFileName(request.file.originalname);
    await fs.writeFile(path.join(directory, fileName), request.file.buffer);
    response.json({
      path: `${siteBase}/images/${slug}/${fileName}`,
      markdown: `![${path.basename(request.file.originalname, path.extname(request.file.originalname))}](${siteBase}/images/${slug}/${fileName})`
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/posts/:slug', async (request, response, next) => {
  try {
    const slug = safeSlug(request.params.slug);
    if (slug !== request.params.slug) return response.status(400).json({ error: 'The post slug is not valid.' });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const postTrash = path.join(trashDirectory, 'posts');
    const imageTrash = path.join(trashDirectory, 'images');
    await fs.mkdir(postTrash, { recursive: true });
    await fs.mkdir(imageTrash, { recursive: true });
    await fs.rename(postPath(slug), path.join(postTrash, `${stamp}-${slug}.md`));
    try {
      await fs.rename(path.join(imagesDirectory, slug), path.join(imageTrash, `${stamp}-${slug}`));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    response.json({ message: 'Post moved to the local trash directory.' });
  } catch (error) {
    if (error.code === 'ENOENT') return response.status(404).json({ error: 'The post does not exist.' });
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 500).json({
    error: error.code === 'LIMIT_FILE_SIZE' ? 'The image must be smaller than 10 MB.' : (error.message || 'The editor could not complete the request.')
  });
});

await fs.mkdir(postsDirectory, { recursive: true });
await fs.mkdir(imagesDirectory, { recursive: true });

const server = app.listen(editorPort, '127.0.0.1', () => {
  console.log(`Local editor: http://127.0.0.1:${editorPort}`);
  console.log(`Blog preview: http://127.0.0.1:4321${siteBase}/`);
});

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const siteProcess = spawn(npmCommand, ['run', 'dev', '--', '--host', '127.0.0.1'], {
  cwd: projectDirectory,
  stdio: 'inherit'
});

function stop() {
  siteProcess.kill('SIGTERM');
  server.close(() => process.exit(0));
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
