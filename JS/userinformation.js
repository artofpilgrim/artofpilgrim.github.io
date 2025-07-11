// Configuration object for customization
const config = {
    containerSelector: '.top-container',
    socialIconMap: {
        'x.com': 'fa-brands fa-x-twitter',
        'facebook.com': 'fa-brands fa-square-facebook',
        'discord.com': 'fa-brands fa-discord',
        'discord.gg': 'fa-brands fa-discord',
        'dsc.gg': 'fa-brands fa-discord',
        'instagram.com': 'fa-brands fa-instagram',
        'youtube.com': 'fa-brands fa-youtube',
        'linkedin.com': 'fab fa-linkedin',
        'artstation.com': 'fa-brands fa-artstation',
        'github.com': 'fab fa-github',
        'wordpress.com': 'fab fa-wordpress',
        'vimeo.com': 'fab fa-vimeo',
        'behance.net': 'fab fa-behance',
        'playstation.com': 'fab fa-playstation',
        'xbox.com': 'fab fa-xbox',
        'vk.com': 'fab fa-vk',
        'steamcommunity.com': 'fab fa-steam',
        'tumblr.com': 'fab fa-tumblr',
        'threads.net': 'fab fa-threads',
        'patreon.com': 'fab fa-patreon',
        'twitch.tv': 'fab fa-twitch',
        'mixer.com': 'fab fa-mixer',
        'mastodon.social': 'fab fa-mastodon',
        'mailchimp.com': 'fab fa-mailchimp',
        'email': 'fas fa-envelope'
    }
};

// Sanitize text to prevent XSS by escaping HTML entities
function sanitizeText(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "/": '&#x2F;',
    };
    return text.replace(/[&<>"'/]/ig, (match) => map[match]);
}

// Sanitize URLs to prevent malicious protocols
function sanitizeUrl(url) {
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
            return '#';
        }
        return url;
    } catch {
        return '#';
    }
}

// Fetch user data with error handling
async function fetchUserData() {
    const basePath = getBasePath();
    try {
        const response = await fetch(basePath);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error loading user information:', error);
        displayError('Failed to load user information. Please try again later.');
        return null;
    }
}

// Calculate the base path dynamically based on the current URL
function getBasePath() {
    const currentPath = window.location.pathname;
    if (currentPath.includes('/Projects/')) {
        return '../../Config/userinformation.json';
    } else if (currentPath.includes('/HTML/')) {
        return '../Config/userinformation.json';
    } else {
        return 'Config/userinformation.json'; // Default case
    }
}

// Show error message in the UI
function displayError(message) {
    const container = document.querySelector(config.containerSelector);
    if (container) {
        const errorElement = document.createElement('p');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        container.appendChild(errorElement);
    }
}

// Create the user info panel DOM structure
function createUserInfoPanel(data) {
    const fragment = document.createDocumentFragment();
    const userInfoPanel = document.createElement('div');
    userInfoPanel.className = 'user-info-panel';

    // Profile Picture
    const img = document.createElement('img');
    img.src = sanitizeUrl(data.profilePicUrl);
    img.alt = 'Profile Picture';
    img.className = 'profile-pic';
    userInfoPanel.appendChild(img);

    // User Name as Link
    const userNameLink = document.createElement('a');
    userNameLink.href = '../../index.html';
    userNameLink.className = 'user-name-link';
    const userName = document.createElement('h1');
    userName.className = 'user-name';
    userName.textContent = sanitizeText(data.profileName);
    userNameLink.appendChild(userName);
    userInfoPanel.appendChild(userNameLink);

    // User Role
    const userRole = document.createElement('h2');
    userRole.textContent = sanitizeText(data.profileRole);
    userInfoPanel.appendChild(userRole);

    // Location
    const userLocationContainer = document.createElement('div');
    userLocationContainer.className = 'user-location-container';
    const locationIcon = document.createElement('span');
    locationIcon.className = 'material-symbols-outlined';
    locationIcon.textContent = 'near_me';
    userLocationContainer.appendChild(locationIcon);
    const userLocation = document.createElement('h2');
    userLocation.textContent = sanitizeText(data.location);
    userLocationContainer.appendChild(userLocation);
    userInfoPanel.appendChild(userLocationContainer);

    // Social Icons
    const socialIcons = document.createElement('div');
    socialIcons.className = 'social-icons';
    data.socials.forEach(social => {
        const socialType = Object.keys(config.socialIconMap).find(key => social.url.includes(key)) || 'email';
        const iconClass = config.socialIconMap[socialType];
        const rawUrl = socialType === 'email' ? `mailto:${social.url}` : social.url;
        const safeUrl = sanitizeUrl(rawUrl);
        if (iconClass) {
            const a = document.createElement('a');
            a.href = safeUrl;
            a.target = '_blank';
            a.setAttribute('aria-label', socialType); // Accessibility
            const icon = document.createElement('i');
            icon.className = iconClass;
            a.appendChild(icon);
            socialIcons.appendChild(a);
        }
    });
    userInfoPanel.appendChild(socialIcons);

    fragment.appendChild(userInfoPanel);
    return fragment;
}

// Main function to load and display user info
async function addUserInformation() {
    const data = await fetchUserData();
    if (!data) return;

    const container = document.querySelector(config.containerSelector);
    if (!container) {
        console.error('Container not found:', config.containerSelector);
        return;
    }

    const fragment = createUserInfoPanel(data);
    container.appendChild(fragment);
}

// Run when the document is ready
document.addEventListener('DOMContentLoaded', addUserInformation);