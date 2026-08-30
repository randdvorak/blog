# Local blog editor

This project stores blog posts and images on your computer. Astro builds the public site. GitHub Pages hosts it.

## Install

1. Install the project packages.

   ```bash
   npm install
   ```

2. Start the local editor.

   ```bash
   npm run editor
   ```

3. Open `http://127.0.0.1:4322`.

The editor also starts the blog preview at `http://127.0.0.1:4321/blog/`.

## Write a post

1. Select the plus button to create a post.
2. Enter the title and description.
3. Use the toolbar to add Markdown formatting.
4. Select **Image** to add an image.
5. Clear **Keep this post as a draft** when the post is ready.
6. Select **Save post**.

The editor writes posts to `src/content/posts`. It writes images to `public/images`.

## Publish

Run this command after the GitHub repository exists:

```bash
npm run publish -- "Describe this update"
```

The command checks the site, creates a commit, and pushes `main`. GitHub Pages then publishes the site.

In the GitHub repository settings, select **Pages** and set **Source** to **GitHub Actions**.

The default public address is `https://randdvorak.github.io/blog/`.

## Recover a deleted post

The editor moves deleted content to `trash`. Git ignores this directory. Move the required files back to restore a post.
