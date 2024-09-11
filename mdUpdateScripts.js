async function renderPosts() {
    const postFiles = ['19-8-2024-DragonMap Update.md', '24-7-2024-Welcome.md'];
    
    console.log('Post files to process:', postFiles);

    // Sort files by date (newest first)
    postFiles.sort((a, b) => extractDateFromFilename(b) - extractDateFromFilename(a));
    
    console.log('Sorted post files:', postFiles);

    for (const file of postFiles) {
        try {
            console.log('Fetching file:', file);
            const markdown = await fetchMarkdownFile(file);
            console.log('Markdown content:', markdown.substring(0, 100) + '...'); // Log first 100 characters
            const html = marked.parse(markdown);
            const postElement = document.createElement('div');
            const date = extractDateFromFilename(file);
            postElement.innerHTML = `
                <div class="update-post-container">
                    <div class="post-date">${date.toLocaleDateString()}</div>
                    ${html}
                </div>
            `;
            console.log('Appending post element for:', file);
            postsContainer.appendChild(postElement);
        } catch (error) {
            console.error(`Error loading ${file}:`, error);
        }
    }
}
