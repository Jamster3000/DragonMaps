document.addEventListener('DOMContentLoaded', function() {
    const postsContainer = document.getElementById('posts-container');
    const postsFolder = '../posts'; // Folder where markdown files are stored

    // List of markdown files
    const posts = [
        '24-7-2024-Welcome.md'
    ];

    posts.forEach(post => {
        const filePath = `${postsFolder}/${post}`;

        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Could not fetch ${filePath}`);
                }
                return response.text();
            })
            .then(content => {
                // Convert markdown to HTML using marked
                const postElement = document.createElement('div');
                postElement.className = 'post';
                postElement.innerHTML = `
                    <h2>${post.replace('.md', '')}</h2>
                    <div>${marked(content)}</div>
                `;
                postsContainer.appendChild(postElement);
            })
            .catch(error => console.error('Error fetching markdown file:', error));
    });
});

