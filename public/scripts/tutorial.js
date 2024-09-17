document.addEventListener("DOMContentLoaded", async function () {
    const tutorialContent = document.getElementById('tutorial-content');
    const tutorialTitle = document.getElementById('tutorial-title');
    
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    async function fetchMarkdownFile(filename) {
        const response = await fetch(`../tutorials/${filename}`);
        if (!response.ok) {
            throw new Error(`Error fetching ${filename}`);
        }
        return await response.text();
    }

    try {
        const file = getQueryParam('file');
        const markdown = await fetchMarkdownFile(file);
        const htmlContent = marked.parse(markdown);
        
        // Display title dynamically from the filename
        const title = file.split('-').slice(3).join(' ').replace('.md', '');
        tutorialTitle.textContent = title;
        
        tutorialContent.innerHTML = htmlContent;
    } catch (error) {
        console.error('Error loading tutorial:', error);
        tutorialContent.innerHTML = '<p>Sorry, this tutorial could not be loaded.</p>';
    }
});
