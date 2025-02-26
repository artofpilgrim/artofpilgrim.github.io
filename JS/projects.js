document.addEventListener('DOMContentLoaded', () => {
    let projects = [];

    const cacheFetch = async (url, key) => {
        const cached = localStorage.getItem(key);
        if (cached) return cached;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
        const text = await response.text();
        localStorage.setItem(key, text);
        return text;
    };

    const fetchProjects = async () => {
        const text = await cacheFetch('../../Config/projects.txt', 'projects_v1');
        return text.split('\n').map(line => line.trim()).filter(Boolean);
    };

    const fetchDescription = async () => {
        const descriptionContainer = document.getElementById('project-description');
        setContainerState(descriptionContainer, 'loading');
        try {
            const text = await cacheFetch('description.txt', `${window.location.pathname}_desc_v1`);
            const [title = 'Untitled', description = 'No description', tags = '', , htmlFileName = 'index.html'] = text.split('---').map(line => line.trim());
            document.getElementById('project-title').textContent = title;
            document.title = title;

            const formattedDescription = convertUrlsToLinks(description);
            const truncateLength = window.innerWidth < 600 ? 200 : 420;

            if (description.length > truncateLength) {
                const shortDescription = formattedDescription.substring(0, truncateLength);
                descriptionContainer.innerHTML = `${shortDescription}<span id="ellipsis">...</span><span id="full-description" class="full-description">${formattedDescription.substring(truncateLength)}</span><br><span id="toggle-description" tabindex="0">Read More</span>`;

                const toggleDescription = document.getElementById('toggle-description');
                const fullDescription = document.getElementById('full-description');
                const ellipsis = document.getElementById('ellipsis');

                const toggleHandler = () => {
                    const isVisible = fullDescription.classList.contains('visible');
                    fullDescription.classList.toggle('visible', !isVisible);
                    ellipsis.style.display = isVisible ? 'inline' : 'none';
                    toggleDescription.textContent = isVisible ? 'Read More' : 'Read Less';
                };

                toggleDescription.addEventListener('click', toggleHandler);
                toggleDescription.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleHandler();
                    }
                });
            } else {
                descriptionContainer.innerHTML = formattedDescription;
            }

            renderTags(tags);
        } catch (error) {
            descriptionContainer.innerHTML = '<p>Error loading description.</p>';
            console.error('Error loading project description:', error);
        }
    };

    const convertUrlsToLinks = (text) => {
        const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
        return text.replace(urlPattern, url => `<a href="${url}" target="_blank" class="link-button">${new URL(url).hostname}</a>`);
    };

    const renderTags = (tags) => {
        const tagsContainer = document.getElementById('project-tags');
        tags.split(',').map(tag => tag.trim()).forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.className = 'software-tag';
            tagElement.textContent = tag;
            tagsContainer.appendChild(tagElement);
        });
    };

    const loadMedia = async () => {
        const mediaContainer = document.getElementById('project-media');
        setContainerState(mediaContainer, 'loading');
        try {
            const text = await cacheFetch('media.txt', `${window.location.pathname}_media_v1`);
            const lines = text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
            const basePath = window.location.pathname.split('/').slice(0, -1).join('/') + '/';
            const fragment = document.createDocumentFragment();

            for (let i = 0; i < lines.length; i++) {
                let description = '';
                let urls = [lines[i]];

                if (i + 1 < lines.length && !lines[i + 1].match(/\.(jpeg|jpg|gif|png|mp4|webm|mview)$/) && !lines[i + 1].includes('youtube.com') && !lines[i + 1].includes('sketchfab.com') && !lines[i + 1].includes(' // ')) {
                    description = lines[++i];
                }

                if (lines[i].includes(' // ')) {
                    urls = lines[i].split(' // ').map(url => url.trim());
                }

                urls = urls.map(url => url.startsWith('http') ? url : basePath + url);
                if (description.includes('(marmoset viewer)')) urls = [`${urls[0]}.mview`];

                const mediaElement = createMediaElement(urls, description);
                if (mediaElement) fragment.appendChild(mediaElement);
            }

            mediaContainer.innerHTML = '';
            mediaContainer.appendChild(fragment);
        } catch (error) {
            mediaContainer.innerHTML = '<p>Error loading media.</p>';
            console.error('Error loading project media:', error);
        }
    };

    const createMediaElement = (urls, description) => {
        let mediaElement;
        if (urls[0].match(/\.(jpeg|jpg|gif|png)$/)) {
            mediaElement = createImageElement(urls);
        } else if (urls[0].match(/\.(mp4|webm)$/)) {
            mediaElement = createVideoElement(urls[0]);
        } else if (urls[0].includes('youtube.com')) {
            mediaElement = createYouTubeElement(urls[0]);
        } else if (urls[0].includes('sketchfab.com')) {
            mediaElement = createSketchfabElement(urls[0]);
        } else if (urls[0].match(/\.mview$/)) {
            mediaElement = createMarmosetViewerElement(urls[0]);
        }

        if (mediaElement && description) {
            const descElement = document.createElement('p');
            descElement.className = 'media-description';
            descElement.textContent = description;
            mediaElement.appendChild(descElement);
        }

        return mediaElement;
    };

    const createImageElement = (urls) => {
        const mediaElement = document.createElement('div');
        mediaElement.className = 'media-item';
        mediaElement.role = 'figure';

        const imgContainer = document.createElement('div');
        imgContainer.className = 'img-container';

        const imgElement1 = document.createElement('img');
        imgElement1.src = urls[0];
        imgElement1.className = 'image-1';
        imgElement1.alt = 'Primary image';
        imgElement1.loading = 'lazy';
        imgContainer.appendChild(imgElement1);

        if (urls[1]) {
            const imgElement2 = document.createElement('img');
            imgElement2.src = urls[1];
            imgElement2.className = 'image-2';
            imgElement2.alt = 'Secondary image';
            imgElement2.loading = 'lazy';
            imgContainer.appendChild(imgElement2);

            const sliderContainer = document.createElement('div');
            sliderContainer.className = 'slider-container';

            const sliderLine = document.createElement('div');
            sliderLine.className = 'slider-line';

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '0';
            slider.max = '100';
            slider.value = '50';
            slider.className = 'image-slider';
            slider.setAttribute('aria-label', 'Image comparison slider');
            slider.addEventListener('input', () => {
                const value = slider.value;
                imgElement2.style.clipPath = `inset(0 0 0 ${value}%)`;
                sliderLine.style.left = `calc(${value}% - 1px)`;
            });

            sliderContainer.appendChild(sliderLine);
            sliderContainer.appendChild(slider);
            mediaElement.appendChild(imgContainer);
            mediaElement.appendChild(sliderContainer);
        } else {
            mediaElement.appendChild(imgContainer);
        }

        return mediaElement;
    };

    const createVideoElement = (url) => {
        const mediaElement = document.createElement('div');
        mediaElement.className = 'media-item';
        mediaElement.role = 'figure';

        const videoElement = document.createElement('video');
        videoElement.src = url;
        videoElement.controls = true;
        videoElement.muted = true;
        videoElement.title = 'Video content';
        mediaElement.appendChild(videoElement);

        return mediaElement;
    };

    const createYouTubeElement = (url) => {
        const mediaElement = document.createElement('div');
        mediaElement.className = 'media-item responsive-iframe-container';
        mediaElement.role = 'figure';

        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${new URL(url).searchParams.get('v')}`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.loading = 'lazy';
        iframe.title = 'YouTube video';
        mediaElement.appendChild(iframe);

        return mediaElement;
    };

    const createSketchfabElement = (url) => {
        const mediaElement = document.createElement('div');
        mediaElement.className = 'media-item responsive-iframe-container';
        mediaElement.role = 'figure';

        const sketchfabId = url.split('/').pop().split('-').pop();
        const iframe = document.createElement('iframe');
        iframe.src = `https://sketchfab.com/models/${sketchfabId}/embed`;
        iframe.allow = 'autoplay; fullscreen; vr';
        iframe.allowFullscreen = true;
        iframe.loading = 'lazy';
        iframe.title = 'Sketchfab model';
        mediaElement.appendChild(iframe);

        return mediaElement;
    };

    const createMarmosetViewerElement = (url) => {
        const mediaElement = document.createElement('div');
        mediaElement.className = 'media-item marmoset-item';
        mediaElement.role = 'figure';

        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.allow = 'autoplay; fullscreen';
        iframe.allowFullscreen = true;
        iframe.loading = 'lazy';
        iframe.title = 'Marmoset Viewer';
        mediaElement.appendChild(iframe);

        return mediaElement;
    };

    const fetchStats = async () => {
        const statsContainer = document.getElementById('project-stats');
        setContainerState(statsContainer, 'loading');
        try {
            const text = await cacheFetch('stats.txt', `${window.location.pathname}_stats_v1`);
            const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
            const iconMap = {
                'Triangles': 'change_history',
                'Materials': 'texture',
                'Texture Size': 'straighten',
                'Texel Density': 'square_foot',
                'Target Engine': 'gamepad',
                'Workflow': 'brush',
                'Collaborators': 'groups'
            };
            const iconClassMap = {
                'Triangles': 'triangle-icon',
                'Materials': 'material-icon',
                'Texture Size': 'size-icon',
                'Texel Density': 'td-icon',
                'Target Engine': 'engine-icon',
                'Workflow': 'workflow-icon',
                'Collaborators': 'collab-icon'
            };

            const fragment = document.createDocumentFragment();
            lines.forEach(line => {
                let [key, value] = line.split(':').map(part => part.trim());
                let info = '';

                if (value?.includes('(') && value.includes(')')) {
                    info = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
                    value = value.substring(0, value.indexOf('(')).trim();
                }

                if (value) {
                    const statElement = document.createElement('div');
                    statElement.className = 'stat';
                    statElement.role = 'listitem';

                    const icon = iconMap[key];
                    if (icon) {
                        const iconElement = document.createElement('span');
                        iconElement.className = `material-icons stat-icon ${iconClassMap[key]}`;
                        iconElement.textContent = icon;
                        statElement.appendChild(iconElement);
                    }

                    const textElement = document.createElement('span');
                    textElement.innerHTML = `<strong>${key}:</strong> ${value}`;
                    statElement.appendChild(textElement);

                    if (info) {
                        const infoIcon = document.createElement('i');
                        infoIcon.className = 'fa-solid fa-circle-info stat-info-icon';
                        infoIcon.setAttribute('aria-label', `More info: ${info}`);

                        const tooltip = document.createElement('div');
                        tooltip.className = 'tooltip';
                        tooltip.textContent = info;

                        statElement.appendChild(infoIcon);
                        statElement.appendChild(tooltip);

                        infoIcon.addEventListener('mouseover', (event) => {
                            tooltip.style.display = 'block';
                            positionTooltip(event, tooltip);
                        });
                        infoIcon.addEventListener('mousemove', (event) => positionTooltip(event, tooltip));
                        infoIcon.addEventListener('mouseout', () => tooltip.style.display = 'none');
                    }

                    fragment.appendChild(statElement);
                }
            });

            statsContainer.innerHTML = '';
            statsContainer.appendChild(fragment);
        } catch (error) {
            statsContainer.innerHTML = '<p>Error loading stats.</p>';
            console.error('Error loading project stats:', error);
        }
    };

    const positionTooltip = (event, tooltip) => {
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let top = event.clientY - tooltipRect.height - 10;
        let left = event.clientX;

        if (top < 0) top = event.clientY + 10;
        if (left + tooltipRect.width > viewportWidth) left = viewportWidth - tooltipRect.width - 10;

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    };

    const navigateProjects = async (direction) => {
        const currentProject = window.location.pathname.split('/').slice(-2, -1)[0];
        const currentIndex = projects.indexOf(currentProject);

        if (currentIndex !== -1) {
            let newIndex = currentIndex + direction;
            if (newIndex < 0) newIndex = projects.length - 1;
            if (newIndex >= projects.length) newIndex = 0;

            const newProject = projects[newIndex];
            const text = await cacheFetch(`../${newProject}/description.txt`, `${newProject}_desc_v1`);
            const htmlFileName = text.split('---')[4]?.trim() || 'index.html';
            window.location.href = `../${newProject}/${htmlFileName}`;
        }
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

    const setContainerState = (container, state) => {
        container.innerHTML = state === 'loading' ? '<p>Loading...</p>' : '<p>Error loading content.</p>';
    };

    const mediaContainer = document.querySelector('.media-container');
    const backToTopButton = document.getElementById('back-to-top');

    mediaContainer.addEventListener('scroll', throttle(() => {
        backToTopButton.style.display = mediaContainer.scrollTop > 1000 ? 'block' : 'none';
    }, 200));

    backToTopButton.addEventListener('click', () => {
        mediaContainer.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            window.location.href = '../../index.html';
        } else if (event.key === 'ArrowLeft') {
            navigateProjects(-1);
        } else if (event.key === 'ArrowRight') {
            navigateProjects(1);
        } else if (event.key === 'ArrowUp') {
            mediaContainer.scrollBy({ top: -200, behavior: 'smooth' });
        } else if (event.key === 'ArrowDown') {
            mediaContainer.scrollBy({ top: 200, behavior: 'smooth' });
        }
    });

    const init = async () => {
        projects = await fetchProjects() || [];
        document.getElementById('prev-project').addEventListener('click', () => navigateProjects(-1));
        document.getElementById('next-project').addEventListener('click', () => navigateProjects(1));
        await Promise.all([fetchDescription(), loadMedia(), fetchStats()]);
    };

    init();
});