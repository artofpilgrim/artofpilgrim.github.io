document.addEventListener("DOMContentLoaded", async () => {
    const recommendationContent = document.querySelector('.recommendation-content');
    const dotsContainer = document.getElementById('recommendation-dots');
    const announcer = document.createElement('div');
    announcer.id = 'recommendation-announcer';
    announcer.className = 'sr-only';
    announcer.setAttribute('aria-live', 'polite');
    document.body.appendChild(announcer);

    if (!recommendationContent || !dotsContainer) {
        console.error('Recommendation content or dots container not found');
        return;
    }

    recommendationContent.tabIndex = 0;

    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    const throttle = (func, limit) => {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };

    const cacheKey = 'recommendations_v1';
    let recommendations;
    const cached = localStorage.getItem(cacheKey);
    try {
        if (cached) {
            console.log('Using cached recommendations');
            recommendations = cached.split('---').map(rec => rec.trim()).filter(Boolean);
        } else {
            const response = await fetch('../Config/recommendations.txt');
            if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
            const text = await response.text();
            if (!text.trim()) throw new Error('Empty recommendations file');
            recommendations = text.split('---').map(rec => rec.trim()).filter(Boolean);
            localStorage.setItem(cacheKey, text);
        }
        if (!recommendations.length) throw new Error('No valid recommendations');

        const recommendationFragment = document.createDocumentFragment();
        const dotsFragment = document.createDocumentFragment();

        recommendations.forEach((rec, index) => {
            const lines = rec.split('\n').map(line => line.trim()).filter(Boolean);
            const hasAvatar = lines[1]?.startsWith('http');
            const name = lines[0] || 'Anonymous';
            const avatar = hasAvatar ? lines[1] : '';
            const position = (hasAvatar ? lines[2] : lines[1]) || 'Unknown Position';
            const date = (hasAvatar ? lines[3] : lines[2]) || 'Unknown Date';
            const quote = (hasAvatar ? lines[4] : lines[3]) || 'No quote provided';

            const recommendation = document.createElement('div');
            recommendation.className = 'recommendation';
            recommendation.setAttribute('aria-hidden', index !== 0);
            if (index === 0) recommendation.classList.add('active');
            recommendation.innerHTML = `
                <div class="recommendation-header">
                    ${avatar ? `<img src="${avatar}" alt="${name}'s avatar" class="recommendation-avatar" loading="lazy">` : ''}
                    <div class="recommendation-details">
                        <h2>${name}</h2>
                        <h3>${position}</h3>
                        <p class="recommendation-date">${date}</p>
                    </div>
                </div>
                <p class="recommendation-quote">"${quote}"</p>
            `;
            recommendationFragment.appendChild(recommendation);

            const dot = document.createElement('span');
            dot.classList.add('dot');
            dot.role = 'button';
            dot.tabIndex = 0;
            dot.setAttribute('aria-label', `Show recommendation ${index + 1}`);
            if (index === 0) dot.classList.add('active');
            dot.dataset.index = index;
            dot.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    dot.click();
                }
            });
            dotsFragment.appendChild(dot);
        });

        recommendationContent.appendChild(recommendationFragment);
        dotsContainer.appendChild(dotsFragment);

        const recommendationsElements = recommendationContent.querySelectorAll('.recommendation');
        const dots = dotsContainer.querySelectorAll('.dot');

        if (recommendationsElements.length === 0 || dots.length === 0) {
            console.error('No recommendations or dots found in DOM');
            return;
        }

        let currentIndex = 0;
        let isTransitioning = false;
        let autoplay = setInterval(() => showRecommendation((currentIndex + 1) % recommendationsElements.length, 'left'), 5000);

        function showRecommendation(index, direction) {
            if (isTransitioning || index === currentIndex) return;
            isTransitioning = true;

            const current = recommendationsElements[currentIndex];
            const next = recommendationsElements[index];

            if (direction === 'left') {
                current.classList.add('recommendation-exit-left');
                next.classList.add('recommendation-enter-right');
            } else if (direction === 'right') {
                current.classList.add('recommendation-exit-right');
                next.classList.add('recommendation-enter-left');
            }

            next.addEventListener('transitionend', () => {
                current.classList.remove('active', 'recommendation-exit-left', 'recommendation-exit-right');
                next.classList.remove('recommendation-enter-left', 'recommendation-enter-right');
                current.setAttribute('aria-hidden', 'true');
                next.classList.add('active');
                next.setAttribute('aria-hidden', 'false');
                currentIndex = index;
                isTransitioning = false;
                adjustHeight();
                announcer.textContent = `Showing recommendation ${index + 1} of ${recommendationsElements.length}`;
            }, { once: true });

            setTimeout(() => {
                if (isTransitioning) {
                    console.warn('Transitionend didn’t fire, forcing completion');
                    current.classList.remove('active', 'recommendation-exit-left', 'recommendation-exit-right');
                    next.classList.remove('recommendation-enter-left', 'recommendation-enter-right');
                    current.setAttribute('aria-hidden', 'true');
                    next.classList.add('active');
                    next.setAttribute('aria-hidden', 'false');
                    currentIndex = index;
                    isTransitioning = false;
                    adjustHeight();
                }
            }, 600);

            dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
        }

        const debouncedShowRecommendation = debounce((index, direction) => showRecommendation(index, direction), 200);

        const handleDotClick = (event) => {
            if (event.target.classList.contains('dot')) {
                clearInterval(autoplay);
                const index = parseInt(event.target.dataset.index, 10);
                if (index > currentIndex) {
                    debouncedShowRecommendation(index, 'left');
                } else if (index < currentIndex) {
                    debouncedShowRecommendation(index, 'right');
                }
            }
        };

        const handleKeydown = (e) => {
            if (e.key === 'ArrowLeft' && currentIndex > 0) {
                clearInterval(autoplay);
                debouncedShowRecommendation(currentIndex - 1, 'right');
            } else if (e.key === 'ArrowRight' && currentIndex < recommendationsElements.length - 1) {
                clearInterval(autoplay);
                debouncedShowRecommendation(currentIndex + 1, 'left');
            }
        };

        const swipeThreshold = 50;
        let startX;
        let isSwiping = false;

        const handleTouchStart = (event) => {
            startX = event.touches[0].clientX;
            isSwiping = true;
            clearInterval(autoplay);
        };

        const handleTouchMove = throttle((event) => {
            if (!isSwiping) return;
            const moveX = event.touches[0].clientX;
            const diffX = startX - moveX;
            if (Math.abs(diffX) > swipeThreshold) {
                const newIndex = diffX > 0
                    ? (currentIndex + 1) % recommendations.length
                    : (currentIndex - 1 + recommendations.length) % recommendations.length;
                showRecommendation(newIndex, diffX > 0 ? 'left' : 'right');
                isSwiping = false;
            }
        }, 100);

        const handleTouchEnd = () => isSwiping = false;
        const handleTouchCancel = () => isSwiping = false;

        dotsContainer.addEventListener('click', handleDotClick);
        recommendationContent.addEventListener('keydown', handleKeydown);
        recommendationContent.addEventListener('touchstart', handleTouchStart);
        recommendationContent.addEventListener('touchmove', handleTouchMove);
        recommendationContent.addEventListener('touchend', handleTouchEnd);
        recommendationContent.addEventListener('touchcancel', handleTouchCancel);

        recommendationContent.addEventListener('mouseenter', () => clearInterval(autoplay));
        recommendationContent.addEventListener('mouseleave', () => {
            autoplay = setInterval(() => showRecommendation((currentIndex + 1) % recommendationsElements.length, 'left'), 5000);
        });

        function adjustHeight() {
            const activeRecommendation = recommendationContent.querySelector('.recommendation.active');
            if (activeRecommendation) {
                const activeHeight = activeRecommendation.getBoundingClientRect().height;
                recommendationContent.style.minHeight = `${activeHeight + 60}px`;
            }
        }

        const debouncedAdjustHeight = debounce(adjustHeight, 200);
        window.addEventListener('resize', debouncedAdjustHeight);
        adjustHeight();

        const cleanup = () => {
            window.removeEventListener('resize', debouncedAdjustHeight);
            dotsContainer.removeEventListener('click', handleDotClick);
            recommendationContent.removeEventListener('keydown', handleKeydown);
            recommendationContent.removeEventListener('touchstart', handleTouchStart);
            recommendationContent.removeEventListener('touchmove', handleTouchMove);
            recommendationContent.removeEventListener('touchend', handleTouchEnd);
            recommendationContent.removeEventListener('touchcancel', handleTouchCancel);
            clearInterval(autoplay);
        };
        window.addEventListener('unload', cleanup);

    } catch (error) {
        recommendationContent.innerHTML = '<p>Unable to load recommendations. Please try again later.</p>';
        console.error('Failed to load recommendations:', error);
    }
});