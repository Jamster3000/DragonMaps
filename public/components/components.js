document.addEventListener('DOMContentLoaded', function() {
    // Set the base path to include 'testWebSite'
    const basePath = '';

    // Load header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        const headerFile = document.body.classList.contains('designer-page') 
            ? `${basePath}/designer-header.html` 
            : `${basePath}/components/header.html`;
        fetch(headerFile)
            .then(response => response.text())
            .then(data => {
                // Replace relative paths with the correct base path
                const updatedData = data.replace(/href="(?!http|https:\/\/)/g, `href="${basePath}/`);
                headerPlaceholder.innerHTML = updatedData;
            })
            .catch(error => console.error('Error loading header:', error));
    }

    // Load footer (only if not on designer page)
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder && !document.body.classList.contains('designer-page')) {
        fetch(`${basePath}/components/footer.html`)
            .then(response => response.text())
            .then(data => {
                // Replace relative paths with the correct base path
                const updatedData = data.replace(/href="(?!http|https:\/\/)/g, `href="${basePath}/`);
                footerPlaceholder.innerHTML = updatedData;
            })
            .catch(error => console.error('Error loading footer:', error));
    }
});
