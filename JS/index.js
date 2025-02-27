const iconTypes = {
    multipleImages: 'fa-solid fa-layer-group',
    video: 'fa-solid fa-video',
    youtube: 'fa-brands fa-youtube',
    sketchfab: 'fa-solid fa-cube'
};

function createThumbnail(src, alt, galleryPageUrl, hasMultipleImages, hasVideo, hasYouTube, hasSketchfab, index) {
    const thumbnailLink = document.createElement('a');
    thumbnailLink.href = galleryPageUrl;
    thumbnailLink.role = 'link';
    thumbnailLink.tabIndex = 0;
    thumbnailLink.setAttribute('aria-label', `View ${alt} project`);

    const thumbnailDiv = document.createElement('div');
    thumbnailDiv.classList.add('thumbnail');
    thumbnailDiv.style.animationDelay = `${index * 0.1}s`;

    const thumbnailImg = document.createElement('img');
    thumbnailImg.src = src;
    thumbnailImg.alt = `${alt} thumbnail`;
    thumbnailImg.loading = 'lazy';

    const thumbnailTitle = document.createElement('div');
    thumbnailTitle.classList.add('thumbnail-title');
    thumbnailTitle.textContent = alt;

    let iconIndex = 0;
    const addOverlayIcon = (className) => {
        const icon = document.createElement('i');
        icon.className = `${className} overlay-icon`;
        const spacing = 20; // Reduced from 25px to fit within 200px
        icon.style.left = `${10 + iconIndex * spacing}px`; // Inline style for reliability
        thumbnailDiv.appendChild(icon);
        console.log(`Added ${className} at index ${iconIndex}, left: ${icon.style.left}`); // Debugging
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

const cacheFetch = async (url, key) => {
    const cached = localStorage.getItem(key);
    if (cached) return cached;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    const text = await response.text();
    localStorage.setItem(key, text);
    return text;
};

function fetchProjectData(projectName) {
    const descriptionPath = `../Projects/${projectName}/description.txt`;
    const mediaPath = `../Projects/${projectName}/media.txt`;

    return Promise.all([
        cacheFetch(descriptionPath, `${projectName}_desc_v1`).catch(error => {
            throw new Error(`Failed to load description for ${projectName}: ${error.message}`);
        }),
        cacheFetch(mediaPath, `${projectName}_media_v1`).catch(error => {
            throw new Error(`Failed to load media for ${projectName}: ${error.message}`);
        })
    ])
    .then(([descriptionText, mediaText]) => {
        const [title = 'Untitled', description = '', tags = '', thumbnailUrl = '../default-thumbnail.jpg', htmlFileName = 'index.html'] = descriptionText.split('---').map(line => line.trim());
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
        return null;
    });
}

function fetchProjects() {
    return cacheFetch('../Config/projects.txt', 'projects_v1')
        .then(text => text.split('\n').map(line => line.trim()).filter(Boolean))
        .catch(error => {
            thumbnailContainer.innerHTML = '<p>Failed to load projects. Please try again later.</p>';
            console.error('Error loading projects:', error);
            return [];
        });
}

const thumbnailContainer = document.getElementById('thumbnail-container');
if (!thumbnailContainer) {
    console.error('Thumbnail container not found');
} else {
    thumbnailContainer.innerHTML = '<p>Loading projects...</p>';

    fetchProjects().then(projects => {
        if (!projects.length) return;

        const fragment = document.createDocumentFragment();
        let bannerImageSet = false;

        const projectPromises = projects.map((projectName, index) =>
            fetchProjectData(projectName).then(artwork => {
                if (!artwork) {
                    console.warn(`Skipping project ${projectName} due to fetch error`);
                    return;
                }

                const thumbnail = createThumbnail(
                    artwork.src,
                    artwork.alt,
                    artwork.galleryPageUrl,
                    artwork.hasMultipleImages,
                    artwork.hasVideo,
                    artwork.hasYouTube,
                    artwork.hasSketchfab,
                    index
                );
                fragment.appendChild(thumbnail);

                if (!bannerImageSet && artwork.bannerImageUrl) {
                    document.querySelector('.top-container').style.backgroundImage = `url(${artwork.bannerImageUrl})`;
                    bannerImageSet = true;
                }
            })
        );

        Promise.all(projectPromises).then(() => {
            thumbnailContainer.innerHTML = '';
            thumbnailContainer.appendChild(fragment);
            if (!bannerImageSet) {
                document.querySelector('.top-container').style.backgroundImage = 'url(../default-banner.jpg)';
            }
            const announcer = document.getElementById('thumbnail-announcer');
            if (announcer) announcer.textContent = `Loaded ${projects.length} projects`;
        });
    });
}