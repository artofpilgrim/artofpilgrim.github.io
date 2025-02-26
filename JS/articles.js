document.addEventListener("DOMContentLoaded", async () => {
    const configFilePath = './Config/articles.txt';
    const articlesFolder = './Articles';
    const leftColumn = document.querySelector('.left-column');
    const rightColumn = document.querySelector('.right-column');
    const topContainer = document.querySelector('.top-container');
    const backToTopButton = document.getElementById('back-to-top');
    const articleCache = new Map(); // In-memory cache for article data

    // Load and display the article list
    const loadArticles = async () => {
        leftColumn.innerHTML = '<p>Loading articles...</p>'; // Loading state
        try {
            const response = await fetch(configFilePath);
            if (!response.ok) throw new Error(`Failed to fetch article list: ${response.status}`);
            const text = await response.text();
            const folders = text.split('\n').map(folder => folder.trim()).filter(Boolean);
            if (!folders.length) throw new Error('No articles found');

            leftColumn.innerHTML = ''; // Clear loading state
            const urlParams = new URLSearchParams(window.location.search);
            const articleParam = urlParams.get('article');

            for (const folder of folders) {
                const panel = await createArticlePanel(folder);
                leftColumn.appendChild(panel);

                // Auto-select article from URL or first article
                if (articleParam === folder || (!articleParam && !document.querySelector('.article-panel.selected'))) {
                    panel.classList.add('selected');
                    await displayArticleFromFolder(folder);
                    if (!articleParam) history.replaceState(null, '', `?article=${folder}`);
                }

                panel.addEventListener('click', async () => {
                    document.querySelectorAll('.article-panel').forEach(p => p.classList.remove('selected'));
                    panel.classList.add('selected');
                    await displayArticleFromFolder(folder);
                    history.pushState(null, '', `?article=${folder}`);
                });

                // Add keyboard support
                panel.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        panel.click();
                    }
                });
            }

            // Handle invalid URL param
            if (articleParam && !folders.includes(articleParam)) {
                rightColumn.innerHTML = `<p>Article "${articleParam}" not found. Showing the first article instead.</p>`;
                await displayArticleFromFolder(folders[0]);
            }
        } catch (error) {
            leftColumn.innerHTML = '<p>Sorry, we couldn’t load the articles. Please try again later.</p>';
            console.error('Error loading articles:', error);
        }
    };

    // Fetch and parse article data lazily
    const loadArticleContent = async (folder) => {
        if (articleCache.has(folder)) return articleCache.get(folder);
        try {
            const response = await fetch(`${articlesFolder}/${folder}/article.txt`);
            if (!response.ok) throw new Error(`Failed to load ${folder}: ${response.status}`);
            const articleData = await response.text();
            const [title, content] = parseArticleData(articleData);
            const readingTime = calculateReadingTime(content);
            articleCache.set(folder, { title, content, readingTime });
            return { title, content, readingTime };
        } catch (error) {
            console.error(`Error loading article ${folder}:`, error);
            return { title: 'Error', content: `Failed to load article: ${error.message}`, readingTime: 0 };
        }
    };

    // Parse article data (title and content)
    const parseArticleData = (data) => {
        const parts = data.split('---');
        const title = parts[0]?.trim() || 'Untitled';
        const content = parts.slice(1).join('---').trim() || 'No content available';
        return [title, content];
    };

    // Create an article panel
    const createArticlePanel = async (folder) => {
        const { title, readingTime } = await loadArticleContent(folder);
        const panel = document.createElement('div');
        panel.className = 'article-panel';
        panel.role = 'button';
        panel.tabIndex = 0; // Make focusable
        panel.dataset.folder = folder;
        panel.innerHTML = `
            <h2 class="article-title">${title}</h2>
            <p class="article-info">Reading Time: ${readingTime} minutes</p>
        `;
        return panel;
    };

    // Format content with media embedding and basic Markdown support
    const formatContent = (content) => {
        const paragraphs = content.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        return paragraphs.map(paragraph => {
            const lines = paragraph.split('\n').map(line => line.trim());
            const formattedLines = lines.map(line => {
                if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
                if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
                if (line.match(/(https?:\/\/[^\s]+)/g)) {
                    return line.replace(/(https?:\/\/[^\s]+)/g, (url) => {
                        if (url.match(/\.(mp4)$/)) {
                            return `<video controls><source src="${url}" type="video/mp4">Your browser does not support video.</video>`;
                        } else if (url.match(/\.(gif|jpg|jpeg|png)$/)) {
                            return `<img src="${url}" alt="Article image" loading="lazy" />`;
                        } else if (url.match(/(youtube\.com|youtu\.be)/)) {
                            let videoId = url.split('v=')[1] || url.split('youtu.be/')[1];
                            if (videoId?.includes('&')) videoId = videoId.split('&')[0];
                            return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                        }
                        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
                    });
                }
                return line;
            }).join(' ');
            return `<p>${formattedLines}</p>`;
        }).join('');
        // Optional: Use `marked` for full Markdown: return marked(content);
        // Optional: Sanitize with `sanitize-html`: return sanitizeHtml(formattedContent);
    };

    // Calculate reading time
    const calculateReadingTime = (content) => {
        const wordsPerMinute = 200;
        const textLength = content.split(/\s+/).length;
        return Math.ceil(textLength / wordsPerMinute);
    };

    // Display a single article
    const displayArticleFromFolder = async (folder) => {
        rightColumn.innerHTML = '<p>Loading article...</p>'; // Loading state
        const { title, content } = await loadArticleContent(folder);
        rightColumn.innerHTML = `
            <div class="article-content">
                <h1>${title}</h1>
                <div>${formatContent(content)}</div>
            </div>
        `;
        rightColumn.scrollTop = 0;
        backToTopButton.style.display = 'none';
    };

    // Handle shrinking header based on right-column scroll
    const handleRightColumnScroll = () => {
        if (rightColumn.scrollTop > 50) {
            topContainer.classList.add('shrink');
        } else {
            topContainer.classList.remove('shrink');
        }
        backToTopButton.style.display = rightColumn.scrollTop > 300 ? 'block' : 'none';
    };

    // Smooth scroll to top
    backToTopButton.addEventListener('click', () => {
        rightColumn.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Attach scroll listener
    rightColumn.addEventListener('scroll', handleRightColumnScroll);

    // Initialize articles
    await loadArticles();
});