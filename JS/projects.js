document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded');

    const config = {
        projectsListPath: '../../Config/projects.json',
        basePath: window.location.pathname.split('/').slice(0, -1).join('/') + '/',
        mediaThreshold: 1000,
    };

    let projects = [];

    const fetchData = async (url, errorMessage, retries = 1) => {
        for (let i = 0; i <= retries; i++) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`${errorMessage}: ${response.status}`);
                return url.endsWith('.json') ? await response.json() : await response.text();
            } catch (error) {
                if (i === retries) {
                    console.error(error);
                    return null;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    };

    const fetchProjects = async () => {
        const data = await fetchData(config.projectsListPath, 'Failed to fetch projects');
        return data?.projects || [];
    };

    const fetchProjectData = async () => {
        const currentProject = window.location.pathname.split('/').slice(-2, -1)[0];
        const projectData = await fetchData(`${config.basePath}project.json`, 'Failed to fetch project data');
        if (projectData) {
            renderDescription(projectData);
            renderStats(projectData.stats);
            setupLazyMedia(projectData.media);
        }
    };

    const renderDescription = (projectData) => {
        const { title, description, tags } = projectData;
        document.getElementById('project-title').textContent = title;
        document.title = title;
        const formattedDesc = convertUrlsToLinks(description);
        const container = document.getElementById('project-description');
        container.innerHTML = formattedDesc;
        renderTags(tags);
    };

    const convertUrlsToLinks = (text) => {
        const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
        return text.replace(urlPattern, url => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="link-button">${new URL(url).hostname}</a>`);
    };

    const renderTags = (tags) => {
        const container = document.getElementById('project-tags');
        const fragment = document.createDocumentFragment();
        tags.forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.className = 'software-tag';
            tagElement.textContent = tag;
            fragment.appendChild(tagElement);
        });
        container.innerHTML = '';
        container.appendChild(fragment);
    };

    const setupLazyMedia = (mediaArray) => {
        const container = document.getElementById('project-media');
        container.innerHTML = '<div class="spinner"></div>';
        if (!mediaArray || !mediaArray.length) {
            container.innerHTML = '<p>No media available.</p>';
            return;
        }
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    renderMedia(mediaArray);
                    obs.unobserve(entry.target);
                }
            });
        }, { rootMargin: `${config.mediaThreshold}px` });
        observer.observe(container);
    };

    const renderMedia = (mediaArray) => {
        const container = document.getElementById('project-media');
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();
        mediaArray.forEach(mediaItem => {
            const mediaElement = createMediaElement(mediaItem);
            if (mediaElement) fragment.appendChild(mediaElement);
        });
        container.appendChild(fragment);
    };

    const createMediaElement = (mediaItem) => {
        const { type, url, urls, description } = mediaItem;
        const mediaElement = document.createElement('div');
        mediaElement.className = 'media-item';
        mediaElement.role = 'figure';
        switch (type) {
            case 'image':
                const img = document.createElement('img');
                img.src = url;
                img.alt = description || '';
                img.loading = 'lazy';
                mediaElement.appendChild(img);
                break;
                case 'image-comparison':
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'img-container';
                    const img1 = document.createElement('img');
                    img1.src = urls[0];
                    img1.className = 'image-1';
                    img1.alt = 'Primary image';
                    img1.loading = 'lazy';
                    imgContainer.appendChild(img1);
                    const img2 = document.createElement('img');
                    img2.src = urls[1];
                    img2.className = 'image-2';
                    img2.alt = 'Secondary image';
                    img2.loading = 'lazy';
                    imgContainer.appendChild(img2);
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

                    // Set initial styles directly
                    img2.style.clipPath = `inset(0 0 0 50%)`;
                    sliderLine.style.left = `calc(50% - 1px)`;

                    let rafId;
                    slider.addEventListener('input', () => {
                        if (rafId) cancelAnimationFrame(rafId); // Cancel previous frame to avoid buildup
                        rafId = requestAnimationFrame(() => {
                        img2.style.clipPath = `inset(0 0 0 ${slider.value}%)`;
                        sliderLine.style.left = `calc(${slider.value}% - 1px)`;
                        });
                    });

                    sliderContainer.appendChild(sliderLine);
                    sliderContainer.appendChild(slider);
                    mediaElement.appendChild(imgContainer);
                    mediaElement.appendChild(sliderContainer);
                    break;
            case 'video':
                const video = document.createElement('video');
                video.src = url;
                video.controls = true;
                video.muted = true;
                video.title = 'Video content';
                video.loading = 'lazy';
                mediaElement.appendChild(video);
                break;
            case 'youtube':
                mediaElement.className += ' responsive-iframe-container';
                const iframe = document.createElement('iframe');
                const videoId = new URL(url).searchParams.get('v');
                iframe.src = `https://www.youtube.com/embed/${videoId}`;
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                iframe.allowFullscreen = true;
                iframe.loading = 'lazy';
                iframe.title = 'YouTube video';
                mediaElement.appendChild(iframe);
                break;
            case 'sketchfab':
                mediaElement.className += ' responsive-iframe-container';
                const sketchfabId = url.split('/').pop().split('-').pop();
                const sketchfabIframe = document.createElement('iframe');
                sketchfabIframe.src = `https://sketchfab.com/models/${sketchfabId}/embed`;
                sketchfabIframe.allow = 'autoplay; fullscreen; vr';
                sketchfabIframe.allowFullscreen = true;
                sketchfabIframe.loading = 'lazy';
                sketchfabIframe.title = 'Sketchfab model';
                mediaElement.appendChild(sketchfabIframe);
                break;
            case 'mview':
                mediaElement.className += ' marmoset-item';
                const mviewIframe = document.createElement('iframe');
                mviewIframe.src = url;
                mviewIframe.allow = 'autoplay; fullscreen';
                mviewIframe.allowFullscreen = true;
                mviewIframe.loading = 'lazy';
                mviewIframe.title = 'Marmoset Viewer';
                mediaElement.appendChild(mviewIframe);
                break;
            default:
                return null;
        }
        if (description) {
            const descElement = document.createElement('p');
            descElement.className = 'media-description';
            descElement.textContent = description;
            mediaElement.appendChild(descElement);
        }
        return mediaElement;
    };

    const renderStats = (stats) => {
        const container = document.getElementById('project-stats');
        if (!stats) {
            container.innerHTML = '<p>No stats available.</p>';
            return;
        }
        const fragment = document.createDocumentFragment();
        const iconMap = {
            'Triangles': 'change_history',
            'Materials': 'texture',
            'Texture Size': 'straighten',
            'Texel Density': 'square_foot',
            'Target Engine': 'gamepad',
            'Workflow': 'brush',
            'Collaborators': 'groups'
        };
        Object.keys(stats).forEach(key => {
            let value = stats[key];
            let info = '';
            if (typeof value === 'object' && value.info) {
                info = value.info;
                value = value.value;
            }
            const statElement = document.createElement('div');
            statElement.className = 'stat';
            statElement.role = 'listitem';
            statElement.innerHTML = `
                ${iconMap[key] ? `<span class="material-icons stat-icon">${iconMap[key]}</span>` : ''}
                <span><strong>${key}:</strong> ${value}</span>
                ${info ? '<i class="fa-solid fa-circle-info stat-info-icon" aria-label="More info"></i><div class="tooltip" style="display: none;">' + info + '</div>' : ''}
            `;
            if (info) {
                const infoIcon = statElement.querySelector('.stat-info-icon');
                const tooltip = statElement.querySelector('.tooltip');
                infoIcon.addEventListener('mouseover', (e) => {
                    tooltip.style.display = 'block';
                    positionTooltip(e, tooltip);
                });
                infoIcon.addEventListener('mousemove', (e) => positionTooltip(e, tooltip));
                infoIcon.addEventListener('mouseout', () => tooltip.style.display = 'none');
                infoIcon.addEventListener('focus', (e) => {
                    tooltip.style.display = 'block';
                    positionTooltip(e, tooltip);
                });
                infoIcon.addEventListener('blur', () => tooltip.style.display = 'none');
            }
            fragment.appendChild(statElement);
        });
        container.innerHTML = '';
        container.appendChild(fragment);
    };

    const positionTooltip = (event, tooltip) => {
        const rect = tooltip.getBoundingClientRect();
    
        // Calculate preferred top position (above the cursor)
        let top = event.clientY - rect.height - 10;
    
        // If it doesn’t fit above, place it below
        if (top < 0) {
            top = event.clientY + 10;
        }
    
        // Ensure it doesn’t overflow the bottom
        if (top + rect.height > window.innerHeight) {
            top = window.innerHeight - rect.height;
        }
    
        // Ensure top is not negative (e.g., if tooltip is taller than window)
        if (top < 0) {
            top = 0;
        }
    
        // Calculate left position
        let left = event.clientX;
    
        // Ensure it doesn’t overflow the right
        if (left + rect.width > window.innerWidth) {
            left = window.innerWidth - rect.width;
        }
    
        // Ensure it doesn’t overflow the left
        if (left < 0) {
            left = 0;
        }
    
        // Apply the calculated position
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    };

    const navigateProjects = async (direction) => {
        const currentProject = window.location.pathname.split('/').slice(-2, -1)[0];
        const currentIndex = projects.findIndex(p => p === currentProject);
        if (currentIndex === -1) return;
        const newIndex = (currentIndex + direction + projects.length) % projects.length;
        const newProject = projects[newIndex];
        const projectData = await fetchData(`../${newProject}/project.json`, `Failed to fetch ${newProject} data`);
        const htmlFileName = projectData.htmlFileName || 'index.html';
        window.location.href = `../${newProject}/` + htmlFileName;
    };

    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    const setupEventListeners = () => {
        const mediaContainer = document.querySelector('.media-container');
        const backToTopButton = document.getElementById('back-to-top');
        mediaContainer.addEventListener('scroll', () => {
            backToTopButton.style.display = mediaContainer.scrollTop > 1000 ? 'block' : 'none';
        });
        backToTopButton.addEventListener('click', () => {
            mediaContainer.scrollTo({ top: 0, behavior: 'smooth' });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') window.location.href = '../../index.html';
            else if (e.key === 'ArrowLeft') navigateProjects(-1);
            else if (e.key === 'ArrowRight') navigateProjects(1);
            else if (e.key === 'ArrowUp') mediaContainer.scrollBy({ top: -200, behavior: 'smooth' });
            else if (e.key === 'ArrowDown') mediaContainer.scrollBy({ top: 200, behavior: 'smooth' });
        });
        document.getElementById('prev-project')?.addEventListener('click', () => navigateProjects(-1));
        document.getElementById('next-project')?.addEventListener('click', () => navigateProjects(1));
    };

    const init = async () => {
        projects = await fetchProjects();
        console.log('Fetched projects:', projects); // Add this line
        if (!projects.length) console.warn('No projects found');
        setupEventListeners();
        await fetchProjectData();
    };

    init();
});