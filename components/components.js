document.addEventListener('DOMContentLoaded', function() {
    // Get the repository name (assuming it's part of the URL)
    const pathSegments = window.location.pathname.split('/');
    const repoName = pathSegments[1];  // This will be empty for user/org sites
    
    // Construct the base path
    const basePath = repoName ? '/' + repoName : '';

    // Load header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        const headerFile = document.body.classList.contains('designer-page') 
            ? basePath + '/designer-header.html' 
            : basePath + '/components/header.html';
        fetch(headerFile)
            .then(response => response.text())
            .then(data => {
                headerPlaceholder.innerHTML = data;
            })
            .catch(error => console.error('Error loading header:', error));
    }

    // Load footer (only if not on designer page)
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder && !document.body.classList.contains('designer-page')) {
        fetch(basePath + '/components/footer.html')
            .then(response => response.text())
            .then(data => {
                footerPlaceholder.innerHTML = data;
            })
            .catch(error => console.error('Error loading footer:', error));
    }
});
