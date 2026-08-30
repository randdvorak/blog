const elements = {
  list: document.querySelector('#post-list'),
  search: document.querySelector('#search'),
  title: document.querySelector('#title'),
  slug: document.querySelector('#slug'),
  date: document.querySelector('#date'),
  description: document.querySelector('#description'),
  tags: document.querySelector('#tags'),
  draft: document.querySelector('#draft'),
  body: document.querySelector('#body'),
  preview: document.querySelector('#preview'),
  state: document.querySelector('#save-state'),
  toast: document.querySelector('#toast'),
  imageFile: document.querySelector('#image-file')
};

let posts = [];
let originalSlug = '';
let changed = false;
let slugEdited = false;
let previewTimer;
let toastTimer;

const today = () => new Date().toISOString().slice(0, 10);
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);

function showToast(message, error = false) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.className = `toast visible${error ? ' error' : ''}`;
  toastTimer = setTimeout(() => { elements.toast.className = 'toast'; }, 3200);
}

async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The request failed.');
  return data;
}

function setChanged(value) {
  changed = value;
  elements.state.textContent = value ? 'Unsaved changes' : 'All changes saved locally';
}

function draftKey() {
  return `blog-editor-draft:${originalSlug || elements.slug.value || 'new'}`;
}

function currentPost() {
  return {
    originalSlug,
    title: elements.title.value,
    slug: elements.slug.value,
    date: elements.date.value,
    description: elements.description.value,
    tags: elements.tags.value,
    draft: elements.draft.checked,
    body: elements.body.value
  };
}

function renderList() {
  const query = elements.search.value.trim().toLowerCase();
  const visible = posts.filter((post) => `${post.title} ${post.slug}`.toLowerCase().includes(query));
  elements.list.replaceChildren(...visible.map((post) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `post-item${post.slug === originalSlug ? ' active' : ''}`;
    button.dataset.slug = post.slug;
    const title = document.createElement('span');
    title.className = 'post-title';
    title.textContent = post.title;
    const meta = document.createElement('span');
    meta.className = 'post-meta';
    meta.textContent = post.date ? String(post.date).slice(0, 10) : 'No date';
    if (post.draft) {
      const badge = document.createElement('span');
      badge.className = 'draft-badge';
      badge.textContent = 'Draft';
      meta.append(' · ', badge);
    }
    button.append(title, meta);
    button.addEventListener('click', () => loadPost(post.slug));
    return button;
  }));
}

async function refreshPosts() {
  posts = await request('/api/posts');
  renderList();
}

function setFields(post) {
  originalSlug = post.slug || '';
  elements.title.value = post.title || '';
  elements.slug.value = post.slug || '';
  elements.date.value = post.date || today();
  elements.description.value = post.description || '';
  elements.tags.value = post.tags || '';
  elements.draft.checked = post.draft !== false;
  elements.body.value = post.body || '';
  slugEdited = Boolean(post.slug);
  setChanged(false);
  schedulePreview();
  renderList();
}

async function loadPost(slug) {
  if (changed && !window.confirm('Discard the unsaved changes?')) return;
  try {
    const post = await request(`/api/posts/${encodeURIComponent(slug)}`);
    const savedDraft = localStorage.getItem(`blog-editor-draft:${slug}`);
    if (savedDraft) {
      const draft = JSON.parse(savedDraft);
      if (window.confirm('Restore the unsaved browser draft for this post?')) {
        setFields({ ...post, ...draft, slug: post.slug });
        setChanged(true);
        return;
      }
      localStorage.removeItem(`blog-editor-draft:${slug}`);
    }
    setFields(post);
  } catch (error) {
    showToast(error.message, true);
  }
}

function newPost() {
  if (changed && !window.confirm('Discard the unsaved changes?')) return;
  setFields({ date: today(), draft: true });
  slugEdited = false;
  elements.title.focus();
}

async function savePost() {
  try {
    const priorDraftKey = draftKey();
    const result = await request('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentPost())
    });
    originalSlug = result.slug;
    elements.slug.value = result.slug;
    slugEdited = true;
    localStorage.removeItem(priorDraftKey);
    localStorage.removeItem(draftKey());
    setChanged(false);
    await refreshPosts();
    showToast(result.message);
    return result.slug;
  } catch (error) {
    showToast(error.message, true);
    return null;
  }
}

async function deletePost() {
  if (!originalSlug) {
    newPost();
    return;
  }
  if (!window.confirm(`Move “${elements.title.value || originalSlug}” to the local trash directory?`)) return;
  try {
    const result = await request(`/api/posts/${encodeURIComponent(originalSlug)}`, { method: 'DELETE' });
    localStorage.removeItem(draftKey());
    await refreshPosts();
    showToast(result.message);
    if (posts.length) await loadPost(posts[0].slug);
    else newPost();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function updatePreview() {
  try {
    const data = await request('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: elements.body.value })
    });
    elements.preview.innerHTML = data.html || '<p>Start writing to see a preview.</p>';
  } catch {
    elements.preview.textContent = 'The preview is not available.';
  }
}

function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 180);
}

function replaceSelection(before, after = before, fallback = '') {
  const field = elements.body;
  const start = field.selectionStart;
  const end = field.selectionEnd;
  const selected = field.value.slice(start, end) || fallback;
  field.setRangeText(`${before}${selected}${after}`, start, end, 'end');
  field.focus();
  markChanged();
}

function linePrefix(prefix) {
  const field = elements.body;
  const start = field.value.lastIndexOf('\n', field.selectionStart - 1) + 1;
  const endBreak = field.value.indexOf('\n', field.selectionEnd);
  const end = endBreak === -1 ? field.value.length : endBreak;
  const selected = field.value.slice(start, end) || 'Text';
  field.setRangeText(selected.split('\n').map((line) => `${prefix}${line}`).join('\n'), start, end, 'end');
  field.focus();
  markChanged();
}

function format(kind) {
  if (kind === 'heading') linePrefix('## ');
  if (kind === 'bold') replaceSelection('**', '**', 'bold text');
  if (kind === 'italic') replaceSelection('_', '_', 'italic text');
  if (kind === 'quote') linePrefix('> ');
  if (kind === 'list') linePrefix('- ');
  if (kind === 'code') replaceSelection('`', '`', 'code');
  if (kind === 'link') {
    const address = window.prompt('Enter the link address:', 'https://');
    if (address) replaceSelection('[', `](${address})`, 'link text');
  }
}

async function uploadImage(file) {
  if (!file) return;
  let slug = originalSlug;
  if (!slug || changed) slug = await savePost();
  if (!slug) return;
  const form = new FormData();
  form.append('slug', slug);
  form.append('image', file);
  try {
    const result = await request('/api/images', { method: 'POST', body: form });
    replaceSelection('\n', `\n${result.markdown}\n`, result.markdown);
    showToast('Image added. Save the post to keep the new image reference.');
  } catch (error) {
    showToast(error.message, true);
  } finally {
    elements.imageFile.value = '';
  }
}

function markChanged() {
  setChanged(true);
  localStorage.setItem(draftKey(), JSON.stringify(currentPost()));
  schedulePreview();
}

document.querySelector('#new-post').addEventListener('click', newPost);
document.querySelector('#save-post').addEventListener('click', savePost);
document.querySelector('#delete-post').addEventListener('click', deletePost);
document.querySelector('#add-image').addEventListener('click', () => elements.imageFile.click());
elements.imageFile.addEventListener('change', () => uploadImage(elements.imageFile.files[0]));
elements.search.addEventListener('input', renderList);
document.querySelectorAll('[data-format]').forEach((button) => button.addEventListener('click', () => format(button.dataset.format)));

[elements.title, elements.slug, elements.date, elements.description, elements.tags, elements.draft, elements.body].forEach((field) => {
  field.addEventListener('input', () => {
    if (field === elements.slug) slugEdited = true;
    if (field === elements.title && !slugEdited) elements.slug.value = slugify(field.value);
    markChanged();
  });
});

window.addEventListener('beforeunload', (event) => {
  if (!changed) return;
  event.preventDefault();
});

refreshPosts().then(() => {
  if (posts.length) loadPost(posts[0].slug);
  else newPost();
}).catch((error) => showToast(error.message, true));
