document.addEventListener('DOMContentLoaded', function() {
    // Load header
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (headerPlaceholder) {
        const headerFile = document.body.classList.contains('designer-page') ? 'designer-header.html' : 'components/header.html';
        fetch(headerFile)
            .then(response => response.text())
            .then(data => {
                headerPlaceholder.innerHTML = data;
            });
    }

    // Load footer (only if not on designer page)
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder && !document.body.classList.contains('designer-page')) {
        fetch('components/footer.html')
            .then(response => response.text())
            .then(data => {
                footerPlaceholder.innerHTML = data;
            });
    }
});
