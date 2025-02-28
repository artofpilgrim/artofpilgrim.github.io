const fs = require('fs');
const path = require('path');

const projectsDir = process.argv[2];
if (!projectsDir) {
    console.error('Please provide the path to the projects directory as an argument.');
    process.exit(1);
}

fs.readdir(projectsDir, (err, dirs) => {
    if (err) {
        console.error(err);
        return;
    }
    dirs.forEach(dir => {
        const projectPath = path.join(projectsDir, dir);
        if (fs.statSync(projectPath).isDirectory()) {
            const descriptionPath = path.join(projectPath, 'description.txt');
            const mediaPath = path.join(projectPath, 'media.txt');
            const statsPath = path.join(projectPath, 'stats.txt');
            if (fs.existsSync(descriptionPath) && fs.existsSync(mediaPath) && fs.existsSync(statsPath)) {
                const descriptionText = fs.readFileSync(descriptionPath, 'utf8');
                const mediaText = fs.readFileSync(mediaPath, 'utf8');
                const statsText = fs.readFileSync(statsPath, 'utf8');
                const projectData = parseProjectData(dir, descriptionText, mediaText, statsText);
                const jsonPath = path.join(projectPath, 'project.json');
                fs.writeFile(jsonPath, JSON.stringify(projectData, null, 2), (err) => {
                    if (err) {
                        console.error(`Error writing ${jsonPath}:`, err);
                    } else {
                        console.log(`Written ${jsonPath}`);
                    }
                });
            } else {
                console.log(`Skipping ${dir} as it's missing some files.`);
            }
        }
    });
});

function parseProjectData(dir, descriptionText, mediaText, statsText) {
    const parts = descriptionText.split('---').map(part => part.trim());
    const title = parts[0];
    const description = parts[1];
    const tags = parts[2].split(',').map(tag => tag.trim());
    const htmlFileName = parts[4] || 'index.html';
    const mediaArray = parseMedia(mediaText);
    const stats = parseStats(statsText);
    return {
        title,
        description,
        tags,
        htmlFileName,
        media: mediaArray,
        stats
    };
}

function parseMedia(mediaText) {
    const lines = mediaText.split('\n').map(line => line.trim()).filter(line => line);
    const mediaItems = [];
    for (let i = 0; i < lines.length; i++) {
        let urls = [lines[i]];
        let description = '';
        if (lines[i].includes(' // ')) {
            urls = lines[i].split(' // ').map(url => url.trim());
            if (i + 1 < lines.length && !isUrl(lines[i + 1])) {
                description = lines[++i];
            }
            mediaItems.push({
                type: 'image-comparison',
                urls,
                description
            });
        } else if (isUrl(lines[i])) {
            if (i + 1 < lines.length && !isUrl(lines[i + 1])) {
                description = lines[++i];
            }
            const type = determineType(urls[0]);
            if (description.includes('(marmose viewer)')) {
                urls[0] += '.mview';
                type = 'mview';
            }
            if (type === 'image-comparison') {
                if (urls.length > 1) {
                    mediaItems.push({
                        type: 'image-comparison',
                        urls,
                        description
                    });
                } else {
                    mediaItems.push({
                        type,
                        url: urls[0],
                        description
                    });
                }
            } else {
                mediaItems.push({
                    type,
                    url: urls[0],
                    description
                });
            }
        }
    }
    return mediaItems;
}

function isUrl(line) {
    return line.startsWith('http') || line.match(/^[a-z0-9]+$/i);
}

function determineType(url) {
    if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
        return 'image';
    } else if (url.match(/\.(mp4|webm)$/i)) {
        return 'video';
    } else if (url.includes('youtube.com')) {
        return 'youtube';
    } else if (url.includes('sketchfab.com')) {
        return 'sketchfab';
    } else if (url.match(/\.mview$/i)) {
        return 'mview';
    } else {
        return 'unknown';
    }
}

function parseStats(statsText) {
    const stats = {};
    const lines = statsText.split('\n').map(line => line.trim()).filter(line => line);
    lines.forEach(line => {
        const [key, valueStr] = line.split(':').map(part => part.trim());
        let value = valueStr;
        let info = '';
        if (valueStr.includes('(') && valueStr.includes(')')) {
            info = valueStr.substring(valueStr.indexOf('(') + 1, valueStr.indexOf(')'));
            value = valueStr.substring(0, valueStr.indexOf('(')).trim();
        }
        if (info) {
            stats[key] = { value, info };
        } else {
            stats[key] = value;
        }
    });
    return stats;
}