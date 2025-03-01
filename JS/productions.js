// Function to create a production card
function createProductionCard({ title, company, time, thumbnail, description }) {
    const card = Object.assign(document.createElement('div'), {
        className: 'production-subpanel'
    });

    const img = Object.assign(document.createElement('img'), {
        src: thumbnail,
        alt: `${title} thumbnail`,
        loading: 'lazy' // Optimize image loading
    });

    const contentContainer = Object.assign(document.createElement('div'), {
        className: 'production-content'
    });

    const detailsDiv = Object.assign(document.createElement('div'), {
        className: 'production-details'
    });

    const titleElem = Object.assign(document.createElement('h2'), {
        textContent: title
    });

    const companyElem = Object.assign(document.createElement('p'), {
        className: 'production-company', // Style via CSS
        textContent: company
    });

    const timeElem = Object.assign(document.createElement('p'), {
        className: 'production-time', // Style via CSS
        textContent: time
    });

    const descDiv = Object.assign(document.createElement('div'), {
        className: 'production-description'
    });

    const descElem = Object.assign(document.createElement('p'), {
        textContent: description
    });

    // Build the structure
    detailsDiv.append(titleElem, companyElem, timeElem);
    descDiv.appendChild(descElem);
    contentContainer.append(detailsDiv, descDiv);
    card.append(img, contentContainer);

    return card;
}

// Fetch and populate production cards
document.addEventListener('DOMContentLoaded', async () => {
    const productionsContainer = document.querySelector('.productions-subpanels');
    if (!productionsContainer) {
        console.error('Productions container not found');
        return;
    }

    try {
        const response = await fetch('../Config/productions.txt');
        if (!response.ok) throw new Error(`Network response failed: ${response.statusText}`);
        const text = await response.text();
        if (!text.trim()) throw new Error('Productions file is empty');

        const productions = text.split('---').map(prod => prod.trim()).filter(Boolean);
        const fragment = document.createDocumentFragment();

        productions.forEach((prod, index) => {
            const lines = prod.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
            if (lines.length === 5) {
                const productionData = {
                    title: lines[0],
                    company: lines[1],
                    time: lines[2],
                    thumbnail: lines[3],
                    description: lines[4]
                };
                const card = createProductionCard(productionData);
                fragment.appendChild(card);
            } else {
                console.warn(`Skipping malformed production at index ${index}: Expected 5 lines, got ${lines.length}`, lines);
            }
        });

        if (!fragment.children.length) {
            productionsContainer.innerHTML = '<p>No productions available at this time.</p>';
        } else {
            productionsContainer.appendChild(fragment);
        }
    } catch (error) {
        console.error('Failed to load productions:', error);
        productionsContainer.innerHTML = '<p>Unable to load productions. Please try again later.</p>';
    }
});