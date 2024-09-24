document.addEventListener("DOMContentLoaded", function () {
    const postsContainer = document.getElementById('posts-container');

    // Define your markdown files here
    const postFiles = ['test.md'];

    // Extracts the title from the filename
    function extractTitleFromFilename(filename) {
        return filename.split('-').slice(3).join(' ').replace('.md', '');
    }

    // Renders the tutorial links dynamically
    function renderTutorialLinks() {
        postFiles.forEach(file => {
            const postElement = document.createElement('div');
            const title = extractTitleFromFilename(file);

            postElement.innerHTML = `
                <div class="tutorial-list-item">
                    <h2><a href="tutorial.html?file=${file}">${title}</a></h2>
                </div>
            `;
            postsContainer.appendChild(postElement);
        });
    }

    // Render the tutorial links on page load
    renderTutorialLinks();
});
