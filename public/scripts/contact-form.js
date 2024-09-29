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
