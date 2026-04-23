document.addEventListener('DOMContentLoaded', () => {
    
    // --- Tool Search Functionality ---
    const toolSearch = document.getElementById('toolSearch');
    const toolCards = document.querySelectorAll('.tool-card');
    const noResults = document.getElementById('noResults');

    toolSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        let visibleCount = 0;

        toolCards.forEach(card => {
            // Read the data-name attribute which contains our hidden SEO search terms
            const searchData = card.getAttribute('data-name').toLowerCase();
            
            if (searchData.includes(searchTerm)) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Show "No Results" message if everything is filtered out
        if (visibleCount === 0) {
            noResults.classList.remove('hidden');
        } else {
            noResults.classList.add('hidden');
        }
    });

    // --- Cookie Consent Logic ---
    const cookieConsent = document.getElementById('cookieConsent');
    const acceptCookiesBtn = document.getElementById('acceptCookiesBtn');

    // Check localStorage to see if user already accepted
    const cookiesAccepted = localStorage.getItem('zerokey_cookies_accepted');

    if (!cookiesAccepted) {
        // Slight delay for smooth slide-up effect on page load
        setTimeout(() => {
            cookieConsent.classList.remove('translate-y-full');
        }, 1000);
    }

    acceptCookiesBtn.addEventListener('click', () => {
        // Save to localStorage so it persists across the domain
        localStorage.setItem('zerokey_cookies_accepted', 'true');
        
        // Slide banner down
        cookieConsent.classList.add('translate-y-full');
        
        // Remove from DOM after transition completes to clean up
        setTimeout(() => {
            cookieConsent.style.display = 'none';
        }, 500);
    });

});
