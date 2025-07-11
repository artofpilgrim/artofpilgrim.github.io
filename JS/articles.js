document.addEventListener("DOMContentLoaded", async () => {
    const config = {
        articlesListPath: './Config/articles.json',
        articlesFolder: './Articles',
        snippetLength: 150,
        defaultThumbnail: './Resources/default-video-thumbnail.jpg'
    };

    const articlesContainer = document.querySelector('.articles-container');

    let articles = [];
    const contentCache = new Map();

    const loadArticles = async () => {
        articlesContainer.innerHTML = '<div class="spinner"></div>';

        try {
            const response = await fetch(config.articlesListPath);
            if (!response.ok) throw new Error(`Failed to fetch articles.json: ${response.status}`);
            articles = await response.json();

            if (!Array.isArray(articles) || !articles.length) {
                articlesContainer.innerHTML = '<p>No articles found.</p>';
                return;
            }

            articles.sort((a, b) => new Date(b.date) - new Date(a.date));

            await renderArticleList();
        } catch (error) {
            console.error('Error loading articles:', error);
            articlesContainer.innerHTML = '<p>Failed to load articles. Check console.</p>';
        }
    };

    const renderArticleList = async () => {
        const fragment = document.createDocumentFragment();

        const cards = await Promise.all(articles.map(article => createArticleCard(article)));
        cards.forEach(card => {
            fragment.appendChild(card);

            card.addEventListener('click', () => showFullArticle(articles.find(a => a.slug === card.dataset.slug)));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    showFullArticle(articles.find(a => a.slug === card.dataset.slug));
                }
            });
        });

        articlesContainer.innerHTML = '';
        articlesContainer.appendChild(fragment);
        articlesContainer.classList.add('list-view');
    };

    const createArticleCard = async (article) => {
        const { slug, title, thumbnail, date, tags } = article;
        const { content, readingTime } = await getArticleContent(slug);
        const card = document.createElement('article');
        card.className = 'article-card';
        card.tabIndex = 0;
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
        return card;
    };

    const getSnippet = (content) => {
        const firstParagraph = content.split(/\n\s*\n/)[0] || content;
        return firstParagraph.length > config.snippetLength 
            ? firstParagraph.substring(0, config.snippetLength).trim() + '...' 
            : firstParagraph;
    };

    const getArticleContent = async (slug) => {
        if (contentCache.has(slug)) {
            return contentCache.get(slug);
        }
        try {
            const response = await fetch(`${config.articlesFolder}/${slug}/article.txt`);
            if (!response.ok) throw new Error(`Failed to fetch ${slug}/article.txt: ${response.status}`);
            const text = await response.text();
            const [, content] = text.split('---');
            const readingTime = calculateReadingTime(content || 'No content');
            const result = { content, readingTime };
            contentCache.set(slug, result);
            return result;
        } catch (error) {
            console.error(`Error fetching content for ${slug}:`, error);
            return { content: 'Error loading content', readingTime: 1 };
        }
    };

    const showFullArticle = async (article) => {
        articlesContainer.innerHTML = '<div class="spinner"></div>';

        try {
            const { content } = await getArticleContent(article.slug);
            articlesContainer.innerHTML = `
                <div class="article-full-view">
                    <button class="back-button">Back to Articles</button>
                    <article class="article-content">
                        <h1>${article.title}</h1>
                        ${formatContent(content)}
                    </article>
                </div>
            `;
            articlesContainer.classList.remove('list-view');

            document.querySelector('.back-button').addEventListener('click', () => {
                renderArticleList();
            });
        } catch (error) {
            console.error('Error loading full article:', error);
            articlesContainer.innerHTML = '<p>Failed to load article.</p>';
        }
    };

    const calculateReadingTime = (content) => {
        const wordsPerMinute = 200;
        return Math.ceil(content.split(/\s+/).length / wordsPerMinute);
    };

    const formatContent = (content) => {
        const paragraphs = content.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        let output = '';
        let inList = false;
        let listItems = [];

        paragraphs.forEach(paragraph => {
            const lines = paragraph.split('\n').map(line => line.trim());
            lines.forEach(line => {
                if (line.startsWith('* ')) {
                    const itemText = line.slice(2);
                    listItems.push(`<li>${processLine(itemText)}</li>`);
                    inList = true;
                } else {
                    if (inList && listItems.length) {
                        output += `<ul>${listItems.join('')}</ul>`;
                        listItems = [];
                        inList = false;
                    }
                    const formattedLine = processLine(line);
                    if (formattedLine) output += `<p>${formattedLine}</p>`;
                }
            });
            if (inList && listItems.length) {
                output += `<ul>${listItems.join('')}</ul>`;
                listItems = [];
                inList = false;
            }
        });
        return output;
    };

    const processLine = (line) => {
        if (!line) return '';
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
        line = line.replace(/`(.*?)`/g, '<code>$1</code>');
        if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
        if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
        if (line.match(/(https?:\/\/[^\s]+)/g)) {
            return line.replace(/(https?:\/\/[^\s]+)/g, (url) => {
                if (url.match(/\.(mp4)$/)) return `<video controls><source src="${url}" type="video/mp4"></video>`;
                if (url.match(/\.(gif|jpg|jpeg|png)$/)) return `<img src="${url}" alt="Article image" loading="lazy" />`;
                if (url.match(/(youtube\.com|youtu\.be)/)) {
                    let videoId = url.split('v=')[1] || url.split('youtu.be/')[1];
                    if (videoId?.includes('&')) videoId = videoId.split('&')[0];
                    return `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                }
                return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
            });
        }
        return line;
    };

    await loadArticles();
});