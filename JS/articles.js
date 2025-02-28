document.addEventListener("DOMContentLoaded", async () => {
    console.log('DOM loaded');

    const config = {
        articlesListPath: './Config/articles.json',
        articlesFolder: './Articles',
        snippetLength: 150,
        defaultThumbnail: './Resources/default-video-thumbnail.jpg'
    };

    const articlesContainer = document.querySelector('.articles-container');
    const backToTopButton = document.getElementById('back-to-top');
    let articles = [];

    if (!articlesContainer || !backToTopButton) {
        console.error('Required elements not found');
        return;
    }

    const loadArticles = async () => {
        console.log('Loading articles');
        articlesContainer.innerHTML = '<div class="spinner"></div>';

        try {
            const response = await fetch(config.articlesListPath);
            if (!response.ok) throw new Error(`Failed to fetch articles.json: ${response.status}`);
            articles = await response.json();
            console.log('Articles loaded:', articles);

            if (!Array.isArray(articles) || !articles.length) {
                articlesContainer.innerHTML = '<p>No articles found.</p>';
                return;
            }

            articles.sort((a, b) => new Date(b.date) - new Date(a.date));
            console.log('Sorted articles:', articles.map(a => `${a.slug} (${a.date})`));

            await renderArticleList();
        } catch (error) {
            console.error('Error loading articles:', error);
            articlesContainer.innerHTML = '<p>Failed to load articles. Check console.</p>';
        }
    };

    const renderArticleList = async () => {
        console.log('Rendering article list');
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
        console.log('List rendered');
    };

    const createArticleCard = async (article) => {
        const { slug, title, thumbnail, date, tags } = article;
        const { content, readingTime } = await loadArticleContent(slug);
        const card = document.createElement('article');
        card.className = 'article-card';
        card.tabIndex = 0;
        card.dataset.slug = slug;

        const snippet = getSnippet(content); // Use first bit of content for snippet
        const thumbnailUrl = thumbnail || config.defaultThumbnail;

        card.innerHTML = `
            <div class="article-preview">
                <img src="${thumbnailUrl}" alt="${title} thumbnail" class="article-thumbnail" loading="lazy" onerror="this.src='${config.defaultThumbnail}'">
                <div class="article-text">
                    <h2 class="article-title">${title}</h2>
                    <p class="article-snippet">${snippet}</p>
                    <p class="article-info">
                        <span class="published">Published: ${date}</span>
                        <span class="reading-time">Reading Time: ${readingTime} minutes</span>
                        <span class="tags">Tags: ${tags.map(tag => `<span>${tag}</span>`).join(' ')}</span>
                    </p>
                </div>
            </div>
        `;
        console.log(`Created card for ${slug} with reading time: ${readingTime} minutes`);
        return card;
    };

    const getSnippet = (content) => {
        const firstParagraph = content.split(/\n\s*\n/)[0] || content;
        return firstParagraph.length > config.snippetLength 
            ? firstParagraph.substring(0, config.snippetLength).trim() + '...' 
            : firstParagraph;
    };

    const loadArticleContent = async (slug) => {
        try {
            const response = await fetch(`${config.articlesFolder}/${slug}/article.txt`);
            if (!response.ok) throw new Error(`Failed to fetch ${slug}/article.txt: ${response.status}`);
            const text = await response.text();
            const [, content] = text.split('---');
            const readingTime = calculateReadingTime(content || 'No content');
            return { content, readingTime };
        } catch (error) {
            console.error(`Error fetching content for ${slug}:`, error);
            return { content: 'Error loading content', readingTime: 1 };
        }
    };

    const showFullArticle = async (article) => {
        console.log(`Showing full article: ${article.slug}`);
        articlesContainer.innerHTML = '<div class="spinner"></div>';

        try {
            const { content } = await loadArticleContent(article.slug);
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
                    listItems.push(`<li>${line.slice(2)}</li>`);
                    inList = true;
                } else {
                    if (inList && listItems.length) {
                        output += `<ul>${listItems.join('')}</ul>`;
                        listItems = [];
                        inList = false;
                    }
                    if (line.startsWith('## ')) output += `<h2>${line.slice(3)}</h2>`;
                    else if (line.startsWith('# ')) output += `<h1>${line.slice(2)}</h1>`;
                    else if (line) output += `<p>${line}</p>`;
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

    backToTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', () => {
        backToTopButton.style.display = window.scrollY > 300 ? 'block' : 'none';
    });

    await loadArticles();
});