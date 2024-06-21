document.addEventListener("DOMContentLoaded", () => {
    fetch('../Config/recommendations.txt')
        .then(response => response.text())
        .then(text => {
            const recommendations = text.split('---').map(rec => rec.trim()).filter(rec => rec);
            const recommendationContent = document.querySelector('.recommendation-content');
            const dotsContainer = document.getElementById('recommendation-dots');
  
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
  
                recommendationContent.appendChild(recommendation);
  
                const dot = document.createElement("span");
                dot.classList.add("dot");
                if (index === 0) dot.classList.add("active");
                dot.dataset.index = index;
                dotsContainer.appendChild(dot);
  
                dot.addEventListener("click", () => showRecommendation(index));
            });
  
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
        })
        .catch(error => console.error('Failed to load recommendations:', error));
  });
  