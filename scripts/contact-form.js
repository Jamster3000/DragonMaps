document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    const responseDiv = document.getElementById('response');

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;

        // Here you would typically send the data to a server
        // Since this is client-side only, we'll simulate a response

        // Simulate processing time
        responseDiv.textContent = 'Sending...';
        responseDiv.className = '';

        setTimeout(() => {
            if (email && message) {
                responseDiv.textContent = 'Thank you for your message. We\'ll get back to you soon!';
                responseDiv.className = 'success';
                form.reset(); // Clear the form
            } else {
                responseDiv.textContent = 'Please fill out all fields.';
                responseDiv.className = 'error';
            }
        }, 1500);
    });
});
