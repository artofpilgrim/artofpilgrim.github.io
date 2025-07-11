document.addEventListener('DOMContentLoaded', () => {
    const thumbnailContainer = document.getElementById('thumbnail-container');
    const plusButton = document.getElementById('plus-button');
    const minusButton = document.getElementById('minus-button');

    // Retrieve and validate the saved minWidth from localStorage
    let minWidth = parseInt(localStorage.getItem('thumbnailMinWidth'));
    if (isNaN(minWidth) || minWidth < 100 || minWidth > 500) {
        minWidth = 250;
    }

    // Apply the initial size
    updateThumbnailSize();

    plusButton.addEventListener('click', () => {
        if (minWidth < 500) {
            minWidth += 50;
            updateThumbnailSize();
            localStorage.setItem('thumbnailMinWidth', minWidth);
        }
    });

    minusButton.addEventListener('click', () => {
        if (minWidth > 100) {
            minWidth -= 50;
            updateThumbnailSize();
            localStorage.setItem('thumbnailMinWidth', minWidth);
        }
    });

    // Add event listener for the 'r', '+', and '-' keys
    document.addEventListener('keydown', (event) => {
        if (event.key === 'r') {
            minWidth = 250;
            updateThumbnailSize();
            localStorage.setItem('thumbnailMinWidth', minWidth);
        } else if (event.key === '+' || event.key === '=') { // 'Equal' key for shift+'+' key on some keyboards
            if (minWidth < 500) {
                minWidth += 50;
                updateThumbnailSize();
                localStorage.setItem('thumbnailMinWidth', minWidth);
            }
        } else if (event.key === '-') {
            if (minWidth > 100) {
                minWidth -= 50;
                updateThumbnailSize();
                localStorage.setItem('thumbnailMinWidth', minWidth);
            }
        }
    });

    function updateThumbnailSize() {
        thumbnailContainer.style.gridTemplateColumns = `repeat(auto-fill, minmax(${minWidth}px, 1fr))`;
    }
});