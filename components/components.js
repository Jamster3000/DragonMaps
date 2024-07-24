document.addEventListener('DOMContentLoaded', function() {
    // Get the full path of the current page
    const fullPath = window.location.pathname;
    
    // Calculate the relative path to the root
    const pathToRoot = fullPath.split('/').slice(0, -1).map(() => '..').join('/') || '.';

    // Load header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        const headerFile = document.body.classList.contains('designer-page') 
            ? `${pathToRoot}/designer-header.html` 
            : `${pathToRoot}/components/header.html`;
        fetch(headerFile)
            .then(response => response.text())
            .then(data => {
                // Replace relative paths with the correct path to root
                const updatedData = data.replace(/href="(?!http|https:\/\/)/g, `href="${pathToRoot}/`);
                headerPlaceholder.innerHTML = updatedData;
            })
            .catch(error => console.error('Error loading header:', error));
    }

    // Load footer (only if not on designer page)
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder && !document.body.classList.contains('designer-page')) {
        fetch(`${pathToRoot}/components/footer.html`)
            .then(response => response.text())
            .then(data => {
                // Replace relative paths with the correct path to root
                const updatedData = data.replace(/href="(?!http|https:\/\/)/g, `href="${pathToRoot}/`);
                footerPlaceholder.innerHTML = updatedData;
            })
            .catch(error => console.error('Error loading footer:', error));
    }
});
