form.addEventListener('submit', function (e) {
    e.preventDefault();

    const formData = new FormData(form);
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    funMessage.textContent = randomMessage;
    funMessage.style.display = "block";

    // Hide the fun message after 5 seconds
    setTimeout(() => {
        funMessage.style.display = "none";
    }, 5000);

    responseDiv.textContent = 'Sending...';
    responseDiv.className = '';

    confetti({ particleCount: 500, spread: 200, gravity: 0.75 });

    // Immediately show success message
    responseDiv.textContent = 'Thank you for your message. We\'ll get back to you soon!';
    responseDiv.className = 'success';

    // Perform the actual form submission in the background
    fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
    }).then(response => {
        if (!response.ok) {
            throw new Error('Form submission failed');
        }
    }).catch(error => {
        console.error('Form submission error:', error);
        // Show error message if the submission fails
        responseDiv.textContent = 'There was an issue sending your message. Please try again later.';
        responseDiv.className = 'error';
    });

    form.reset(); // Clear the form
});
