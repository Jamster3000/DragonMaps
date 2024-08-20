document.addEventListener('DOMContentLoaded', function() {
    const postsContainer = document.getElementById('posts-container');
    const postsFolder = '../posts'; // Folder where markdown files are stored

    // List of markdown files
    const posts = [
        '19-8-2024-DragonMap Update.md',
        '24-7-2024-Welcome.md'
    ];

    // Create an array of promises for fetching the markdown files
    const fetchPromises = posts.map(post => {
        const filePath = `${postsFolder}/${post}`;
        return fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Could not fetch ${filePath}`);
                }
                return response.text();
            })
            .then(content => ({
                post,
                content
            }))
            .catch(error => console.error('Error fetching markdown file:', error));
    });

    // Once all fetch requests are completed, process the markdown files
    Promise.all(fetchPromises)
        .then(results => {
            results.forEach(({ post, content }) => {
                // Convert markdown to HTML using marked
                const postElement = document.createElement('div');
                postElement.className = 'post';
                postElement.innerHTML = `
                    <h2>${post.replace('.md', '')}</h2>
                    <div>${marked(content)}</div>
                `;
                postsContainer.appendChild(postElement);
            });
        });
});
