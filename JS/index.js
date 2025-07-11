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
        const spacing = 20;
        icon.style.left = `${10 + iconIndex * spacing}px`;
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

function fetchProjectData(projectName) {
    const projectJsonPath = `../Projects/${projectName}/project.json`;
    return fetch(projectJsonPath)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load project.json for ${projectName}: ${response.status}`);
            return response.json();
        })
        .then(projectData => {
            const { title, thumbnail, htmlFileName, media, bannerImageUrl } = projectData;
            const hasMultipleImages = media.filter(item => item.type === 'image').length > 1;
            const hasVideo = media.some(item => item.type === 'video');
            const hasYouTube = media.some(item => item.type === 'youtube');
            const hasSketchfab = media.some(item => item.type === 'sketchfab');

            return {
                src: thumbnail || '../default-thumbnail.jpg',
                alt: title,
                galleryPageUrl: `../Projects/${projectName}/${htmlFileName || 'index.html'}`,
                hasMultipleImages,
                hasVideo,
                hasYouTube,
                hasSketchfab,
                bannerImageUrl
            };
        })
        .catch(error => {
            console.error(`Error loading project data for ${projectName}:`, error);
            return null;
        });
}

function fetchProjects() {
    const projectsJsonPath = '../Config/projects.json';
    return fetch(projectsJsonPath)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load projects.json: ${response.status}`);
            return response.json();
        })
        .then(data => data.projects || [])
        .catch(error => {
            console.error('Error loading projects:', error);
            thumbnailContainer.innerHTML = '<p>Failed to load projects. Please try again later.</p>';
            return [];
        });
}

const thumbnailContainer = document.getElementById('thumbnail-container');
if (!thumbnailContainer) {
    console.error('Thumbnail container not found');
} else {
    // Add spinner HTML instead of plain text
    thumbnailContainer.innerHTML = `
        <div class="spinner-container">
            <div class="spinner"></div>
        </div>
    `;

    fetchProjects().then(projects => {
        if (!projects.length) return;

        const fragment = document.createDocumentFragment();
        let bannerImageSet = false;

        // Create an array to store thumbnails in order
        const thumbnails = new Array(projects.length);

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
                thumbnails[index] = thumbnail; // Store at the correct index

                if (!bannerImageSet && artwork.bannerImageUrl) {
                    document.querySelector('.top-container').style.backgroundImage = `url(${artwork.bannerImageUrl})`;
                    bannerImageSet = true;
                }
            })
        );

        Promise.all(projectPromises).then(() => {
            // Append thumbnails in the correct order
            thumbnails.forEach(thumbnail => {
                if (thumbnail) {
                    fragment.appendChild(thumbnail);
                }
            });

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