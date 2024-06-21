document.addEventListener("DOMContentLoaded", async () => {
    const recommendationContent = document.querySelector('.recommendation-content');
    const dotsContainer = document.getElementById('recommendation-dots');

    if (!recommendationContent || !dotsContainer) {
        console.error('Recommendation content or dots container not found');
        return;
    }

    try {
        const response = await fetch('../Config/recommendations.txt');
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const text = await response.text();
        const recommendations = text.split('---').map(rec => rec.trim()).filter(rec => rec);

        const recommendationFragment = document.createDocumentFragment();
        const dotsFragment = document.createDocumentFragment();

        recommendations.forEach((rec, index) => {
            const lines = rec.split('\n').map(line => line.trim()).filter(line => line);
            const hasAvatar = lines[1].startsWith('http');
            const name = lines[0];
            const avatar = hasAvatar ? lines[1] : '';
            const position = hasAvatar ? lines[2] : lines[1];
            const date = hasAvatar ? lines[3] : lines[2];
            const quote = hasAvatar ? lines[4] : lines[3];

            const recommendation = document.createElement("div");
            recommendation.className = "recommendation";
            if (index === 0) recommendation.classList.add("active");

            recommendation.innerHTML = `
                <div class="recommendation-header">
                    ${avatar ? `<img src="${avatar}" alt="${name}" class="recommendation-avatar">` : ''}
                    <div class="recommendation-details">
                        <h2>${name}</h2>
                        <h3>${position}</h3>
                        <p class="recommendation-date">${date}</p>
                    </div>
                </div>
                <p class="recommendation-quote">"${quote}"</p>
            `;

            recommendationFragment.appendChild(recommendation);

            const dot = document.createElement("span");
            dot.classList.add("dot");
            if (index === 0) dot.classList.add("active");
            dot.dataset.index = index;
            dotsFragment.appendChild(dot);
        });

        recommendationContent.appendChild(recommendationFragment);
        dotsContainer.appendChild(dotsFragment);

        const recommendationsElements = document.querySelectorAll(".recommendation");
        const dots = document.querySelectorAll(".dot");

        function showRecommendation(index) {
            recommendationsElements.forEach((rec, i) => {
                rec.classList.toggle("active", i === index);
            });
            dots.forEach((dot, i) => {
                dot.classList.toggle("active", i === index);
            });
        }

        dotsContainer.addEventListener("click", (event) => {
            if (event.target.classList.contains('dot')) {
                const index = parseInt(event.target.dataset.index, 10);
                showRecommendation(index);
            }
        });

    } catch (error) {
        console.error('Failed to load recommendations:', error);
    }
});
