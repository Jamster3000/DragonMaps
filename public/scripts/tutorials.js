document.addEventListener("DOMContentLoaded", function() {
    const postsContainer = document.getElementById('posts-container');
    const searchInput = document.getElementById('search-input');

    const postFiles = ['exporting the map.md', 'How to deal with not seeing an update to the website.md'];

    function extractTitleFromFilename(filename) {
        const title = filename.split('.').join(' ').replace('.md', '').replace(' md', '');
        return title.trim(); // Ensuring we don't have extra spaces
    }

    async function fetchMarkdownFile(filename) {
        const response = await fetch(`../tutorials/${filename}`);
        if (!response.ok) {
            throw new Error(`Error fetching ${filename}`);
        }
        return await response.text();
    }

    function extractDescription(markdown) {
        const lines = markdown.split('\n');
        let description = '';
        let isInParagraph = false;
        let foundFirstParagraph = false;

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (!isInParagraph && trimmedLine === '') {
                continue;
            }

            if (!foundFirstParagraph && !isInParagraph && trimmedLine !== '') {
                foundFirstParagraph = true;
                continue;
            }

            if (foundFirstParagraph && !isInParagraph && trimmedLine !== '') {
                isInParagraph = true;
            }

            if (isInParagraph && trimmedLine === '') {
                break;
            }

            if (isInParagraph) {
                description += trimmedLine + ' ';
            }
        }

        return description.trim();
    }

    async function renderTutorialLinks() {
        postsContainer.innerHTML = '';

        for (const file of postFiles) {
            const postElement = document.createElement('div');
            const title = extractTitleFromFilename(file);

            try {
                const markdown = await fetchMarkdownFile(file);
                const description = extractDescription(markdown);

                postElement.innerHTML = `
                    <div class="tutorial-list-item">
                        <h2>${title}</h2>
                        <p>${description}</p>
                        <a href="tutorial.html?file=${file}">Read more</a>
                    </div>
                `;

                // Set data-title attribute to lowercased title for easier search comparison
                postElement.classList.add('tutorial-card');
                postElement.setAttribute('data-title', title.toLowerCase());

                postsContainer.appendChild(postElement);
            } catch (error) {
                console.error('Error loading tutorial:', error);
            }
        }
    }

    // Search functionality
    function filterTutorials() {
        const query = searchInput.value.toLowerCase();
        const tutorials = document.querySelectorAll('.tutorial-card');

        tutorials.forEach(tutorial => {
            const title = tutorial.getAttribute('data-title');

            // Check if the title contains the query string
            if (title.includes(query)) {
                tutorial.style.display = 'flex';
            } else {
                tutorial.style.display = 'none';
            }
        });
    }

    searchInput.addEventListener('input', filterTutorials);

    renderTutorialLinks();
});
