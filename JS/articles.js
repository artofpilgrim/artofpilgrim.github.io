document.addEventListener("DOMContentLoaded", async () => {
    const config = {
        articlesListPath: '../Config/articles.txt',
        articlesFolder: '../Articles',
        cacheVersion: 'v1',
        snippetLength: 150,
        defaultThumbnail: '../Resources/default-video-thumbnail.jpg' // Add a default video thumbnail image
    };

    const mainContainer = document.querySelector('.main-container');
    const articlesContainer = document.querySelector('.articles-container');
    const topContainer = document.querySelector('.top-container');
    const backToTopButton = document.getElementById('back-to-top');
    let articleListElement = null;
    let folders = [];

    if (!mainContainer || !articlesContainer || !topContainer || !backToTopButton) {
        console.error('Required elements not found');
        return;
    }

    const cacheFetch = async (url, key) => {
        const cached = localStorage.getItem(key);
        if (cached) {
            try {
                const data = JSON.parse(cached);
                console.log(`Cache hit for ${url}: "${data.text}"`);
                return data;
            } catch (e) {
                console.warn(`Invalid cache for ${key}, refetching:`, e);
            }
        }
        try {
            console.log(`Fetching ${url}`);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
            const text = await response.text();
            console.log(`Fetched ${url} with content: "${text}"`);
            const data = { text };
            localStorage.setItem(key, JSON.stringify(data));
            return data;
        } catch (error) {
            console.error(`Fetch error for ${url}:`, error);
            return { text: '' };
        }
    };

    const loadArticles = async () => {
        articlesContainer.innerHTML = '<div class="spinner"></div>';
        try {
            const { text } = await cacheFetch(config.articlesListPath, `articles_list_${config.cacheVersion}`);
            if (!text || !text.trim()) {
                articlesContainer.innerHTML = '<p>No articles available yet.</p>';
                throw new Error('Empty or invalid articles list');
            }
            folders = text.split('\n').map(folder => folder.trim()).filter(folder => folder && !folder.match(/^\s*$/));
            if (!folders.length) {
                articlesContainer.innerHTML = '<p>No valid articles found in articles.txt.</p>';
                throw new Error('No articles found after parsing');
            }

            await renderArticleList();
            const urlParams = new URLSearchParams(window.location.search);
            const articleParam = urlParams.get('article');
            if (articleParam && folders.includes(articleParam)) {
                showFullArticle(articleParam);
            }
        } catch (error) {
            articlesContainer.innerHTML = '<p>Sorry, we couldn’t load the articles.</p>';
            console.error('Error loading articles:', error);
        }
    };

    const renderArticleList = async () => {
        if (articleListElement) {
            console.log('Restoring cached article list');
            articlesContainer.innerHTML = '';
            articlesContainer.appendChild(articleListElement);
            articlesContainer.classList.add('list-view');
            return;
        }

        console.log('Rendering new article list');
        articleListElement = document.createElement('div');
        articleListElement.className = 'article-list';
        const fragment = document.createDocumentFragment();

        const cards = await Promise.all(folders.map(folder => createArticleCard(folder)));
        cards.forEach(card => {
            fragment.appendChild(card);

            card.addEventListener('click', () => {
                showFullArticle(card.dataset.folder);
                history.pushState(null, '', `?article=${card.dataset.folder}`);
            });

            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    showFullArticle(card.dataset.folder);
                    history.pushState(null, '', `?article=${card.dataset.folder}`);
                }
            });
        });

        articleListElement.appendChild(fragment);
        articlesContainer.innerHTML = '';
        articlesContainer.appendChild(articleListElement);
        articlesContainer.classList.add('list-view');
        console.log('Article list rendered with', cards.length, 'cards');
    };

    const createArticleCard = async (folder) => {
        const { title, content, readingTime, thumbnail } = await loadArticleContent(folder);
        const card = document.createElement('article');
        card.className = 'article-card';
        card.tabIndex = 0;
        card.setAttribute('aria-label', `Article: ${title}, ${readingTime} minutes`);
        card.dataset.folder = folder;

        const snippet = getSnippet(content);
        card.innerHTML = `
            <div class="article-preview">
                ${thumbnail ? `<img src="${thumbnail}" alt="${title} thumbnail" class="article-thumbnail" loading="lazy">` : '<div class="article-thumbnail-placeholder"></div>'}
                <div class="article-text">
                    <h2 class="article-title">${title}</h2>
                    <p class="article-snippet">${formatContent(snippet)}</p>
                    <p class="article-info">Reading Time: ${readingTime} minutes</p>
                </div>
            </div>
        `;
        console.log(`Created card for ${folder}`);
        return card;
    };

    const getSnippet = (content) => {
        const firstParagraph = content.split(/\n\s*\n/)[0] || content;
        return firstParagraph.length > config.snippetLength 
            ? firstParagraph.substring(0, config.snippetLength).trim() + '...' 
            : firstParagraph;
    };

    const loadArticleContent = async (folder) => {
        const { text } = await cacheFetch(`${config.articlesFolder}/${folder}/article.txt`, `article_${folder}_${config.cacheVersion}`);
        const [title, content] = parseArticleData(text || '');
        const readingTime = calculateReadingTime(content);
        const thumbnail = extractThumbnail(content);
        return { title, content, readingTime, thumbnail };
    };

    const extractThumbnail = (content) => {
        const lines = content.split('\n');
        for (const line of lines) {
            const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
            if (urlMatch) {
                const url = urlMatch[0];
                if (url.match(/\.(gif|jpg|jpeg|png)$/)) return url;
                if (url.match(/\.(mp4)$/)) return config.defaultThumbnail; // Use placeholder for MP4
                if (url.match(/(youtube\.com|youtu\.be)/)) {
                    let videoId = url.split('v=')[1] || url.split('youtu.be/')[1];
                    if (videoId?.includes('&')) videoId = videoId.split('&')[0];
                    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                }
            }
        }
        return config.defaultThumbnail; // Fallback if no media
    };

    const showFullArticle = async (folder) => {
        articlesContainer.innerHTML = '<div class="spinner"></div>';
        const { title, content } = await loadArticleContent(folder);
        articlesContainer.innerHTML = `
            <div class="article-full-view">
                <button class="back-button">Back to Articles</button>
                <article class="article-content">
                    <h1>${title}</h1>
                    ${formatContent(content)}
                </article>
            </div>
        `;
        articlesContainer.classList.remove('list-view');
        articlesContainer.scrollTop = 0;

        const backButton = articlesContainer.querySelector('.back-button');
        backButton.addEventListener('click', () => {
            renderArticleList();
            history.pushState(null, '', 'articles.html');
        });
        console.log(`Showing full article: ${title}`);
    };

    const parseArticleData = (data) => {
        const parts = data.split('---');
        return [parts[0]?.trim() || 'Untitled', parts.slice(1).join('---').trim() || 'No content'];
    };

    const calculateReadingTime = (content) => {
        const wordsPerMinute = 200;
        return Math.ceil(content.split(/\s+/).length / wordsPerMinute);
    };

    const formatContent = (content) => {
        const paragraphs = content.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        return paragraphs.map(paragraph => {
            const lines = paragraph.split('\n').map(line => line.trim());
            const formattedLines = lines.map(line => {
                if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
                if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
                if (line.match(/(https?:\/\/[^\s]+)/g)) {
                    return line.replace(/(https?:\/\/[^\s]+)/g, (url) => {
                        if (url.match(/\.(mp4)$/)) return `<video controls><source src="${url}" type="video/mp4"></video>`;
                        if (url.match(/\.(gif|jpg|jpeg|png)$/)) return `<img src="${url}" alt="Article image" loading="lazy" />`;
                        if (url.match(/(youtube\.com|youtu\.be)/)) {
                            let videoId = url.split('v=')[1] || url.split('youtu.be/')[1];
                            if (videoId?.includes('&')) videoId = videoId.split('&')[0];
                            return `<iframe width="100%" height="auto" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                        }
                        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
                    });
                }
                return line;
            }).join(' ');
            return `<p>${formattedLines}</p>`;
        }).join('');
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

    articlesContainer.addEventListener('scroll', throttle(() => {
        backToTopButton.style.display = articlesContainer.scrollTop > 300 ? 'block' : 'none';
    }, 200));

    backToTopButton.addEventListener('click', () => {
        articlesContainer.scrollTo({ top: 0, behavior: 'smooth' });
    });

    await loadArticles();
});