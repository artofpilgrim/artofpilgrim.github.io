document.addEventListener("DOMContentLoaded", async () => {
    const config = {
        articlesListPath: './Config/articles.json',
        articlesFolder: './Articles',
        cacheVersion: 'v4',
        snippetLength: 150,
        defaultThumbnail: './Resources/default-video-thumbnail.jpg'
    };

    const mainContainer = document.querySelector('.main-container');
    const articlesContainer = document.querySelector('.articles-container');
    const topContainer = document.querySelector('.top-container');
    const backToTopButton = document.getElementById('back-to-top');
    let articleListElement = null;
    let articles = [];

    if (!mainContainer || !articlesContainer || !topContainer || !backToTopButton) {
        console.error('Required elements not found');
        return;
    }

    const cacheFetch = async (url, key) => {
        console.log(`cacheFetch called with url: ${url}, key: ${key}`);
        const cached = localStorage.getItem(key);
        if (cached) {
            try {
                const data = JSON.parse(cached);
                console.log(`Cache hit for ${url}:`, data);
                return data;
            } catch (e) {
                console.warn(`Invalid cache for ${key}, refetching:`, e);
            }
        }
    
        try {
            const cacheBuster = new Date().getTime();
            const fetchUrl = `${url}?v=${cacheBuster}`;
            console.log(`Fetching ${fetchUrl}`);
            const response = await fetch(fetchUrl, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            console.log(`Fetch response status: ${response.status}`);
            if (!response.ok) {
                const statusText = await response.text();
                throw new Error(`Failed to load ${url}: ${response.status} - ${statusText}`);
            }
            const text = await response.text();
            console.log(`Raw response from ${url}: "${text}"`);
            const data = url.endsWith('.json') ? JSON.parse(text) : text;
            console.log(`Parsed data from ${url}:`, data);
    
            localStorage.setItem(key, JSON.stringify(data));
            console.log(`Cache updated for ${key}`);
            return data;
        } catch (error) {
            console.error(`Fetch error for ${url}:`, error.message);
            return url.endsWith('.json') ? [] : '';
        }
    };
    
    const loadArticles = async () => {
        console.log('Starting loadArticles');
        articlesContainer.innerHTML = '<div class="spinner"></div>';
        articleListElement = null; // Force re-render
        try {
            const cacheBuster = new Date().getTime();
            console.log(`Preparing to fetch with cacheBuster: ${cacheBuster}`);
            articles = await cacheFetch(`${config.articlesListPath}?v=${cacheBuster}`, `articles_list_${config.cacheVersion}`);
            console.log('Fetch completed, articles:', articles);
            if (!articles || !Array.isArray(articles) || !articles.length) {
                articlesContainer.innerHTML = '<p>No valid articles found in JSON. Check console.</p>';
                throw new Error('Empty or invalid articles list');
            }
    
            articles.sort((a, b) => new Date(b.date) - new Date(a.date));
            console.log(`Loaded and sorted ${articles.length} articles:`, articles.map(a => `${a.slug} (${a.date})`));
    
            await renderArticleList();
            console.log('renderArticleList completed');
            const urlParams = new URLSearchParams(window.location.search);
            const articleParam = urlParams.get('article');
            if (articleParam) {
                const article = articles.find(a => a.slug === articleParam);
                if (article) await showFullArticle(article);
                else console.warn(`Article not found for slug: ${articleParam}`);
            }
        } catch (error) {
            console.error('Critical error in loadArticles:', error);
            articlesContainer.innerHTML = '<p>Sorry, we couldn’t load the articles. Check console.</p>';
        }
    };

    const renderArticleList = async () => {
        console.log('Entering renderArticleList, articleListElement:', articleListElement);
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

        const cards = await Promise.all(articles.map(article => createArticleCard(article)));
        cards.forEach(card => {
            fragment.appendChild(card);

            card.addEventListener('click', async () => {
                const article = articles.find(a => a.slug === card.dataset.slug);
                await showFullArticle(article);
                history.pushState(null, '', `?article=${card.dataset.slug}`);
            });

            card.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const article = articles.find(a => a.slug === card.dataset.slug);
                    await showFullArticle(article);
                    history.pushState(null, '', `?article=${card.dataset.slug}`);
                }
            });
        });

        articleListElement.appendChild(fragment);
        articlesContainer.innerHTML = '';
        articlesContainer.appendChild(articleListElement);
        articlesContainer.classList.add('list-view');
        console.log('Article list rendered with', cards.length, 'cards');
    };

    const createArticleCard = async (article) => {
        const { slug, title, thumbnail, date, tags } = article;
        const { content, readingTime } = await loadArticleContent(slug);
        const card = document.createElement('article');
        card.className = 'article-card';
        card.tabIndex = 0;
        card.setAttribute('aria-label', `Article: ${title}, ${readingTime} minutes`);
        card.dataset.slug = slug;
    
        const snippet = getSnippet(content);
        const thumbnailUrl = thumbnail || config.defaultThumbnail;
        card.innerHTML = `
            <div class="article-preview">
                <img src="${thumbnailUrl}" alt="${title} thumbnail" class="article-thumbnail" loading="lazy" onerror="this.src='${config.defaultThumbnail}'">
                <div class="article-text">
                    <h2 class="article-title">${title}</h2>
                    <p class="article-snippet">${formatContent(snippet)}</p>
                    <p class="article-info">
                        <span class="published">Published: ${date}</span>
                        <span class="reading-time">Reading Time: ${readingTime} minutes</span>
                        <span class="tags">Tags: ${tags.map(tag => `<span>${tag}</span>`).join(' ')}</span>
                    </p>
                </div>
            </div>
        `;
        console.log(`Created card for ${slug}`);
        return card;
    };

    const getSnippet = (content) => {
        const firstParagraph = content.split(/\n\s*\n/)[0] || content;
        return firstParagraph.length > config.snippetLength 
            ? firstParagraph.substring(0, config.snippetLength).trim() + '...' 
            : firstParagraph;
    };

    const loadArticleContent = async (slug) => {
        const text = await cacheFetch(`${config.articlesFolder}/${slug}/article.txt`, `article_${slug}_${config.cacheVersion}`);
        const [, content] = parseArticleData(text || 'Untitled---No content');
        const readingTime = calculateReadingTime(content);
        return { content, readingTime };
    };

    const showFullArticle = async (article) => {
        articlesContainer.innerHTML = '<div class="spinner"></div>';
        const { slug, title } = article;
        const { content } = await loadArticleContent(slug);
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
        let output = '';
        let inList = false;
    
        paragraphs.forEach(paragraph => {
            const lines = paragraph.split('\n').map(line => line.trim());
            let listItems = [];
    
            lines.forEach(line => {
                if (line.startsWith('* ')) {
                    // Start or continue a bullet list
                    const itemText = line.slice(2); // Remove '* '
                    listItems.push(`<li>${processLine(itemText)}</li>`);
                    inList = true;
                } else {
                    // Close any open list and process the current line
                    if (inList && listItems.length > 0) {
                        output += `<ul>${listItems.join('')}</ul>`;
                        listItems = [];
                        inList = false;
                    }
                    const formattedLine = processLine(line);
                    if (formattedLine) {
                        output += `<p>${formattedLine}</p>`;
                    }
                }
            });
    
            // Close any remaining list at the end of the paragraph
            if (inList && listItems.length > 0) {
                output += `<ul>${listItems.join('')}</ul>`;
                listItems = [];
                inList = false;
            }
        });
    
        return output;
    };
    
    // Helper function to process individual lines (headers, media, links)
    const processLine = (line) => {
        if (!line) return '';
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
    
    window.addEventListener('scroll', throttle(() => {
        const scrollPosition = window.scrollY;
        console.log(`Scroll position: ${scrollPosition}`); // Debug scroll value
        backToTopButton.style.display = scrollPosition > 300 ? 'block' : 'none';
    }, 200));
    
    backToTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    await loadArticles();
});