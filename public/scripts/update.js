const postsContainer = document.getElementById('posts-container');

async function fetchMarkdownFile(filename) {
    const response = await fetch(`../posts/${filename}`);
    return await response.text();
}

function extractDateFromFilename(filename) {
    const parts = filename.split('-');
    return new Date(parts[2], parts[1] - 1, parts[0]);
}

async function renderPosts() {
    const postFiles = ['14-9-2024-Migration.md', '19-8-2024-DragonMap Update.md', '24-7-2024-Welcome.md'];

    // Sort files by date (newest first)
    postFiles.sort((a, b) => extractDateFromFilename(b) - extractDateFromFilename(a));

    for (const file of postFiles) {
        try {
            const markdown = await fetchMarkdownFile(file);
            const html = marked.parse(markdown);
            const postElement = document.createElement('div');
            const date = extractDateFromFilename(file);
            postElement.innerHTML = `
                      <div class="update-post-container">
                          <div class="post-date">${date.toLocaleDateString()}</div>
                          ${html}
                      </div>
                  `;
            postsContainer.appendChild(postElement);
        } catch (error) {
            console.error(`Error loading ${file}:`, error);
        }
    }
}

renderPosts();
