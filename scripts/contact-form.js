document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    const responseDiv = document.getElementById('response');

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData(form);

        responseDiv.textContent = 'Sending...';
        responseDiv.className = '';

        fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        }).then(response => {
            if (response.ok) {
                responseDiv.textContent = 'Thank you for your message. We\'ll get back to you soon!';
                responseDiv.className = 'success';
                form.reset(); // Clear the form
            } else {
                throw new Error('Form submission failed');
            }
        }).catch(error => {
            responseDiv.textContent = 'Sorry, an error occurred. Please try again later.';
            responseDiv.className = 'error';
            console.error('Form submission error:', error);
        });
    });
});
