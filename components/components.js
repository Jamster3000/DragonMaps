document.addEventListener('DOMContentLoaded', function() {
    // Get the base URL of your website
    const baseUrl = window.location.origin;

    // Load header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        const headerFile = document.body.classList.contains('designer-page') 
            ? '/designer-header.html' 
            : '/header.html';
        fetch(baseUrl + headerFile)
            .then(response => response.text())
            .then(data => {
                headerPlaceholder.innerHTML = data;
            })
            .catch(error => console.error('Error loading header:', error));
    }

    // Load footer (only if not on designer page)
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder && !document.body.classList.contains('designer-page')) {
        fetch(baseUrl + '/ßfooter.html')
            .then(response => response.text())
            .then(data => {
                footerPlaceholder.innerHTML = data;
            })
            .catch(error => console.error('Error loading footer:', error));
    }
});
