const fs = require('fs').promises;
const path = require('path');

async function generateArticlesJson() {
    const configDir = 'F:/artofpilgrim.github.io/Config';
    const articlesDir = 'F:/artofpilgrim.github.io/Articles';
    const outputPath = path.join(configDir, 'articles.json');

    try {
        // Dynamically get all folders in Articles directory
        const articlesList = (await fs.readdir(articlesDir, { withFileTypes: true }))
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        // Load existing articles.json if it exists
        let existingArticles = [];
        try {
            const existingData = await fs.readFile(outputPath, 'utf8');
            existingArticles = JSON.parse(existingData);
        } catch (err) {
            console.log('No existing articles.json found, starting fresh');
        }

        const jsonData = [];
        const seenSlugs = new Set();

        for (const folder of articlesList) {
            if (seenSlugs.has(folder)) continue; // Skip duplicates
            seenSlugs.add(folder);

            const txtPath = path.join(articlesDir, folder, 'article.txt');
            try {
                const content = await fs.readFile(txtPath, 'utf8');
                const [title, body] = content.split('---');
                const thumbnailMatch = body.match(/(https?:\/\/[^\s]+)/);
                const thumbnail = thumbnailMatch 
                    ? (thumbnailMatch[0].match(/\.(mp4)$/) ? '../Resources/default-video-thumbnail.jpg' : thumbnailMatch[0])
                    : '../Resources/default-video-thumbnail.jpg';

                // Check if this article already exists in the JSON
                const existingArticle = existingArticles.find(a => a.slug === folder);
                const date = existingArticle?.date || new Date().toISOString().split('T')[0]; // Use existing date or current date

                jsonData.push({
                    slug: folder,
                    title: title.trim(),
                    thumbnail: thumbnail,
                    date: date, // Preserve existing date or set new one
                    tags: inferTags(folder)
                });
            } catch (err) {
                console.warn(`Skipping ${folder}: article.txt not found or unreadable - ${err.message}`);
            }
        }

        await fs.writeFile(outputPath, JSON.stringify(jsonData, null, 2));
        console.log('Generated articles.json with', jsonData.length, 'articles');
    } catch (error) {
        console.error('Error generating articles.json:', error);
    }
}

function inferTags(slug) {
    const tagMap = {
        'BlueprintsBlender': ['blender', 'tutorial'],
        'BakingLods': ['3d', 'optimization'],
        'PureRef': ['tools', 'reference']
    };
    return tagMap[slug] || ['general'];
}

generateArticlesJson();