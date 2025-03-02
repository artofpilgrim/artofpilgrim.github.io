// about.js
async function loadSummary(data) {
    const summaryElement = document.querySelector('.summary-panel p');
    if (!summaryElement) {
        console.error('Summary element not found');
        return;
    }

    if (!data.summary) {
        console.error('No summary data provided in JSON');
        summaryElement.textContent = 'Summary not available.';
        return;
    }

    summaryElement.textContent = data.summary;
}

async function loadRecommendations(data) {
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

    const throttle = (func, limit) => {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    };

    const recommendations = data.recommendations || [];
    if (!recommendations.length) {
        recommendationContent.innerHTML = '<p>No recommendations available.</p>';
        console.warn('No recommendations found in JSON');
        return;
    }

    const recommendationFragment = document.createDocumentFragment();
    const dotsFragment = document.createDocumentFragment();

    recommendations.forEach((rec, index) => {
        const recommendation = document.createElement('div');
        recommendation.className = 'recommendation';
        recommendation.setAttribute('aria-hidden', index !== 0);
        if (index === 0) recommendation.classList.add('active');
        recommendation.innerHTML = `
            <div class="recommendation-header">
                ${rec.avatar ? `<img src="${rec.avatar}" alt="${rec.name}'s avatar" class="recommendation-avatar" loading="lazy">` : ''}
                <div class="recommendation-details">
                    <h2>${rec.name || 'Anonymous'}</h2>
                    <h3>${rec.position || 'Unknown Position'}</h3>
                    <p class="recommendation-date">${rec.date || 'Unknown Date'}</p>
                </div>
            </div>
            <p class="recommendation-quote">"${rec.quote || 'No quote provided'}"</p>
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

    const handleDotClick = (event) => {
        if (event.target.classList.contains('dot')) {
            clearInterval(autoplay);
            const index = parseInt(event.target.dataset.index, 10);
            if (index > currentIndex) {
                showRecommendation(index, 'left');
            } else if (index < currentIndex) {
                showRecommendation(index, 'right');
            }
        }
    };

    const handleKeydown = (e) => {
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
            clearInterval(autoplay);
            showRecommendation(currentIndex - 1, 'right');
        } else if (e.key === 'ArrowRight' && currentIndex < recommendationsElements.length - 1) {
            clearInterval(autoplay);
            showRecommendation(currentIndex + 1, 'left');
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

    const handleTouchEnd = () => (isSwiping = false);
    const handleTouchCancel = () => (isSwiping = false);

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

    const debouncedAdjustHeight = throttle(adjustHeight, 200);
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
}

function loadSkillsAndSoftware(data) {
    const softwareContainer = document.querySelector('#software-panel .software-tag-container');
    const skillsContainer = document.querySelector('#skills-panel .software-tag-container');

    if (!softwareContainer || !skillsContainer) {
        console.error('One or more tag containers not found. Check HTML structure and IDs.');
        return;
    }

    const populateTags = (items, container) => {
        const fragment = document.createDocumentFragment();
        (items || []).forEach(item => {
            const span = document.createElement('span');
            span.className = 'software-tag';
            span.textContent = item;
            fragment.appendChild(span);
        });
        container.appendChild(fragment);
    };

    populateTags(data.software, softwareContainer);
    populateTags(data.skills, skillsContainer);
}

function createProductionCard({ title, company, time, thumbnail, description }) {
    const card = Object.assign(document.createElement('div'), { className: 'production-subpanel' });
    const img = Object.assign(document.createElement('img'), {
        src: thumbnail,
        alt: `${title} thumbnail`,
        loading: 'lazy'
    });
    const contentContainer = Object.assign(document.createElement('div'), { className: 'production-content' });
    const detailsDiv = Object.assign(document.createElement('div'), { className: 'production-details' });
    const titleElem = Object.assign(document.createElement('h2'), { textContent: title });
    const companyElem = Object.assign(document.createElement('p'), { className: 'production-company', textContent: company });
    const timeElem = Object.assign(document.createElement('p'), { className: 'production-time', textContent: time });
    const descDiv = Object.assign(document.createElement('div'), { className: 'production-description' });
    const descElem = Object.assign(document.createElement('p'), { textContent: description });

    detailsDiv.append(titleElem, companyElem, timeElem);
    descDiv.appendChild(descElem);
    contentContainer.append(detailsDiv, descDiv);
    card.append(img, contentContainer);

    return card;
}

async function loadProductions(data) {
    const productionsContainer = document.querySelector('.productions-subpanels');
    if (!productionsContainer) {
        console.error('Productions container not found');
        return;
    }

    const productions = data.productions || [];
    if (!productions.length) {
        productionsContainer.innerHTML = '<p>No productions available at this time.</p>';
        console.warn('No productions found in JSON');
        return;
    }

    const fragment = document.createDocumentFragment();
    productions.forEach((prod, index) => {
        if (!prod.title || !prod.company || !prod.time || !prod.thumbnail || !prod.description) {
            console.warn(`Skipping malformed production at index ${index}: Missing required fields`, prod);
            return;
        }
        const card = createProductionCard(prod);
        fragment.appendChild(card);
    });

    if (!fragment.children.length) {
        productionsContainer.innerHTML = '<p>No valid productions available.</p>';
    } else {
        productionsContainer.appendChild(fragment);
    }
}

// Fetch and process about.json
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('../Config/about.json');
        if (!response.ok) throw new Error(`Failed to fetch about.json: ${response.statusText}`);
        const data = await response.json();

        // Run all functions with the fetched data
        await Promise.all([
            loadSummary(data),
            loadRecommendations(data),
            loadSkillsAndSoftware(data),
            loadProductions(data)
        ]);
    } catch (error) {
        console.error('Failed to load about.json:', error);
        document.body.innerHTML += '<p>Unable to load about page content. Please try again later.</p>';
    }
});