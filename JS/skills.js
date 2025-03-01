function addSkillsAndSoftware() {
    // Select containers using the new IDs
    const softwareContainer = document.querySelector('#software-panel .software-tag-container');
    const skillsContainer = document.querySelector('#skills-panel .software-tag-container');

    // Check if containers exist to avoid errors
    if (!softwareContainer || !skillsContainer) {
        console.error('One or more tag containers not found. Check HTML structure and IDs.');
        return;
    }

    const fetchAndPopulate = async (url, container) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
            const text = await response.text();
            const itemsArray = text.split('\n').map(item => item.trim()).filter(item => item);

            // Create a document fragment to batch DOM manipulations
            const fragment = document.createDocumentFragment();

            // Populate the tags
            itemsArray.forEach(item => {
                const span = document.createElement("span");
                span.className = "software-tag";
                span.textContent = item;
                fragment.appendChild(span);
            });

            // Append the fragment to the container
            container.appendChild(fragment);
        } catch (error) {
            console.error(`Failed to load ${url}:`, error);
        }
    };

    // Fetch and populate software and skills data
    fetchAndPopulate('../Config/software.txt', softwareContainer);
    fetchAndPopulate('../Config/skills.txt', skillsContainer);
}

document.addEventListener("DOMContentLoaded", addSkillsAndSoftware);