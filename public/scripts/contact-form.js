document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    const responseDiv = document.getElementById('response');
    const dragon = document.getElementById('dragon');
    const funMessage = document.getElementById('fun-message');

    const messages = [
        "The dragon is carefully sending your message with its fiery breath!",
        "Your email is being delivered on a dragon’s enchanted wings!",
        "The dragon is making sure your message reaches us with great speed!",
        "Your message is on a dragon’s trusty journey to our inbox!",
        "The dragon is weaving its magic to ensure your email gets through!",
        "Your email is soaring through the dragon’s mystical clouds!",
        "The dragon’s fiery breath is ensuring your message arrives promptly!",
        "Your message is being carried by a dragon with the utmost care!",
        "The dragon is guiding your email with its ancient magic!",
        "Your message is riding on the dragon’s mystical path to us!",
        "The dragon is using its magical breath to send your message!",
        "Your email is being transported on the dragon’s swift wings!",
        "The dragon is making sure your message reaches its destination!",
        "Your message is being sent with a touch of dragon magic!",
        "The dragon’s scales are glowing as it delivers your email!",
        "Your email is being carried by the dragon’s enchanted spell!",
        "The dragon is ensuring your message arrives with its magical touch!",
        "Your message is being delivered with the dragon’s powerful breath!",
        "The dragon is guiding your email through its mystical realm!",
        "Your email is being sent with a burst of dragon magic!",
        "The dragon is using its fiery breath to speed up your message!",
        "Your message is being escorted by the dragon’s enchanted wings!",
        "The dragon’s ancient magic is making sure your email gets through!",
        "Your email is being flown across enchanted lands by the dragon!",
        "The dragon is using its mystical flames to ensure your message arrives!",
        "Your message is being delivered with a touch of dragon’s whimsy!",
        "The dragon’s magical breath is making sure your email is on its way!",
        "Your email is riding on the dragon’s majestic wings to us!",
        "The dragon is using its fiery magic to send your message swiftly!",
        "Your message is being carried by the dragon’s enchanted flight!",
        "The dragon’s magical breath is guiding your email safely to us!",
        "Your email is being delivered with a hint of dragon’s charm!",
        "The dragon is ensuring your message gets to us with its mystical power!",
        "Your message is being flown on the dragon’s magical trail!",
        "The dragon’s enchanted wings are carrying your email to its destination!",
        "Your email is being sent with the dragon’s magical efficiency!"
    ];

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData(form);
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        funMessage.textContent = randomMessage;
        funMessage.style.display = "block";

        responseDiv.textContent = 'Sending...';
        responseDiv.className = '';

        confetti({
            particleCount: 500,
            spread: 200,
            gravity: 0.75
        });

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
            // Optionally, you can show an error message here if the submission fails
            // responseDiv.textContent = 'There was an issue sending your message. Please try again later.';
            // responseDiv.className = 'error';
        });

        form.reset(); // Clear the form
    });
});
