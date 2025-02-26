// Config for icon types
const iconTypes = {
    multipleImages: 'fa-solid fa-layer-group',
    video: 'fa-solid fa-video',
    youtube: 'fa-brands fa-youtube',
    sketchfab: 'fa-solid fa-cube'
};

// Create a thumbnail with overlay icons
function createThumbnail(src, alt, galleryPageUrl, hasMultipleImages, hasVideo, hasYouTube, hasSketchfab) {
    const thumbnailLink = document.createElement('a');
    thumbnailLink.href = galleryPageUrl;
    thumbnailLink.role = 'link';
    thumbnailLink.tabIndex = 0;

    const thumbnailDiv = document.createElement('div');
    thumbnailDiv.classList.add('thumbnail');

    const thumbnailImg = document.createElement('img');
    thumbnailImg.src = src;
    thumbnailImg.alt = alt; // Reverted to original alt usage
    thumbnailImg.loading = 'lazy';

    const thumbnailTitle = document.createElement('div');
    thumbnailTitle.classList.add('thumbnail-title');
    thumbnailTitle.innerText = alt; // Reverted to innerText to match your original

    // Add overlay icons
    let iconIndex = 0;
    const addOverlayIcon = (className) => {
        const icon = document.createElement('i');
        icon.className = `${className} overlay-icon`;
        icon.style.left = `${10 + iconIndex * 25}px`; // Adjusted spacing to prevent overlap
        thumbnailDiv.appendChild(icon);
        iconIndex++;
    };

    if (hasMultipleImages) addOverlayIcon(iconTypes.multipleImages);
    if (hasVideo) addOverlayIcon(iconTypes.video);
    if (hasYouTube) addOverlayIcon(iconTypes.youtube);
    if (hasSketchfab) addOverlayIcon(iconTypes.sketchfab);

    thumbnailDiv.appendChild(thumbnailImg);
    thumbnailDiv.appendChild(thumbnailTitle);
    thumbnailLink.appendChild(thumbnailDiv);

    thumbnailLink.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            thumbnailLink.click();
        }
    });

    return thumbnailLink;
}

// Fetch and parse project data
function fetchProjectData(projectName) {
    const descriptionPath = `../Projects/${projectName}/description.txt`;
    const mediaPath = `../Projects/${projectName}/media.txt`;

    return Promise.all([
        fetch(descriptionPath).then(response => {
            if (!response.ok) throw new Error(`Failed to load description for ${projectName}`);
            return response.text();
        }),
        fetch(mediaPath).then(response => {
            if (!response.ok) throw new Error(`Failed to load media for ${projectName}`);
            return response.text();
        })
    ])
    .then(([descriptionText, mediaText]) => {
        const [title, description, tags, thumbnailUrl, htmlFileName] = descriptionText.split('---').map(line => line.trim());
        const galleryPageUrl = descriptionPath.replace('description.txt', htmlFileName);

        const mediaLines = mediaText.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
        const hasMultipleImages = mediaLines.filter(line => /\.(jpeg|jpg|gif|png)$/i.test(line)).length > 1;
        const hasVideo = mediaLines.some(line => /\.(mp4)$/i.test(line));
        const hasYouTube = mediaLines.some(line => /youtube\.com|youtu\.be/i.test(line));
        const hasSketchfab = mediaLines.some(line => /sketchfab\.com/i.test(line));

        const bannerImageLine = mediaLines.find(line => line.endsWith('*'));
        const bannerImageUrl = bannerImageLine ? bannerImageLine.replace('*', '').trim() : null;

        return { src: thumbnailUrl, alt: title, galleryPageUrl, hasMultipleImages, hasVideo, hasYouTube, hasSketchfab, bannerImageUrl };
    })
    .catch(error => {
        console.error(`Error loading project data for ${projectName}:`, error);
        return null; // Return null for failed projects
    });
}

// Fetch projects list
function fetchProjects() {
    return fetch('../Config/projects.txt')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load projects');
            return response.text();
        })
        .then(text => text.split('\n').map(line => line.trim()).filter(Boolean))
        .catch(error => {
            document.getElementById('thumbnail-container').innerHTML = '<p>Failed to load projects. Please try again later.</p>';
            console.error('Error loading projects:', error);
            return [];
        });
}

// Main execution
const thumbnailContainer = document.getElementById('thumbnail-container');
thumbnailContainer.innerHTML = '<p>Loading projects...</p>';

fetchProjects().then(projects => {
    if (!projects.length) return;

    const fragment = document.createDocumentFragment();
    let bannerImageSet = false;

    const projectPromises = projects.map(projectName =>
        fetchProjectData(projectName).then(artwork => {
            if (!artwork) return; // Skip failed projects

            const thumbnail = createThumbnail(
                artwork.src,
                artwork.alt,
                artwork.galleryPageUrl,
                artwork.hasMultipleImages,
                artwork.hasVideo,
                artwork.hasYouTube,
                artwork.hasSketchfab
            );
            fragment.appendChild(thumbnail);

            if (!bannerImageSet && artwork.bannerImageUrl) {
                document.querySelector('.top-container').style.backgroundImage = `url(${artwork.bannerImageUrl})`;
                bannerImageSet = true;
            }
        })
    );

    Promise.all(projectPromises).then(() => {
        thumbnailContainer.innerHTML = ''; // Clear loading state
        thumbnailContainer.appendChild(fragment);
        if (!bannerImageSet) {
            document.querySelector('.top-container').style.backgroundImage = 'url(../default-banner.jpg)'; // Fallback
        }
    });
});