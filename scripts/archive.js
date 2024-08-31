const ITEMS_PER_PAGE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function getImageUrlsFromArchive(accountName, page = 1) {
    const apiUrl = `https://archive.org/advancedsearch.php?q=uploader:${accountName}&fl[]=identifier&fl[]=mediatype&output=json&rows=${ITEMS_PER_PAGE}&page=${page}`;
    try {
        const response = await fetchWithRetry(apiUrl);
        const data = await response.json();
        const imageItems = data.response.docs.filter(item => item.mediatype === 'image');
        const imageData = await Promise.all(imageItems.map(getItemDetails));
        return imageData.flat().filter(Boolean);
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

async function fetchWithRetry(url, retries = MAX_RETRIES) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response;
    } catch (error) {
        if (retries > 0) {
            console.log(`Retrying fetch for ${url}. Attempts left: ${retries - 1}`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return fetchWithRetry(url, retries - 1);
        } else {
            throw error;
        }
    }
}

async function getItemDetails(item) {
    const cacheKey = `item_${item.identifier}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        return JSON.parse(cachedData);
    }

    try {
        const metadataUrl = `https://archive.org/metadata/${item.identifier}`;
        const response = await fetchWithRetry(metadataUrl);
        const data = await response.json();
        const creator = data.metadata.creator || 'Unknown Creator';
        const license = data.metadata.licenseurl;
        const keywords = data.metadata.subject;

        const images = data.files
            .filter(file => file.name.toLowerCase().endsWith('.png') || file.name.toLowerCase().endsWith('.webp'))
            .map(file => ({
                url: `https://archive.org/download/${item.identifier}/${file.name}`,
                creator: creator,
                license: license,
                keywords: keywords,
                thumbnail: `https://archive.org/download/${item.identifier}/${file.name}?width=200`
            }));

        localStorage.setItem(cacheKey, JSON.stringify(images));
        return images;
    } catch (error) {
        console.error(`Error fetching details for ${item.identifier}:`, error);
        return null;
    }
}

function loadImages(imageData) {
    const assetLocation = document.querySelector("#assets-section .section-content");
    const groupedImages = imageData.reduce((acc, img) => {
        if (img) {
            acc[img.creator] = acc[img.creator] || [];
            acc[img.creator].push(img);
        }
        return acc;
    }, {});

    Object.entries(groupedImages).forEach(([creator, images]) => {
        let categoryContainer = document.querySelector(`.asset-category[data-creator="${creator}"]`);
        if (!categoryContainer) {
            categoryContainer = document.createElement('div');
            categoryContainer.className = "asset-category";
            categoryContainer.dataset.creator = creator;
            categoryContainer.innerHTML = `
                <h4 class="category-header">${creator}<span class="toggle-icon">▼</span></h4>
                <div class="category-content" style="display:none;"></div>
            `;
            assetLocation.appendChild(categoryContainer);
        }
        const contentDiv = categoryContainer.querySelector('.category-content');

        images.forEach(img => {
            let imgElement = document.createElement('img');
            imgElement.dataset.src = img.thumbnail;
            imgElement.alt = `Image by ${creator}`;
            imgElement.draggable = true;
            imgElement.dataset.fullSrc = img.url;
            imgElement.addEventListener('click', loadFullImage);
            imgElement.addEventListener('error', handleImageError);
            imgElement.style.width = '100%'; // Ensure the image takes full width of its container
            imgElement.style.height = 'auto'; // Maintain aspect ratio
            contentDiv.appendChild(imgElement);
        });
    });

    addToggleListeners();
    lazyLoadImages();
}

function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const fullSizeImg = new Image();
                fullSizeImg.onload = function () {
                    img.src = this.src;
                    img.style.opacity = 0;
                    setTimeout(() => {
                        img.style.transition = 'opacity 0.3s ease-in';
                        img.style.opacity = 1;
                    }, 50);
                };
                fullSizeImg.src = img.dataset.src;
                observer.unobserve(img);
            }
        });
    }, options);

    images.forEach(img => {
        // Set a low-quality placeholder
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
        img.style.background = '#0A0A1A';
        observer.observe(img);
    });
}

function loadFullImage(event) {
    const img = event.target;
    img.src = img.dataset.fullSrc;
}

function addToggleListeners() {
    document.querySelectorAll('.category-header').forEach(header => {
        if (!header.hasListener) {
            header.addEventListener('click', function () {
                this.classList.toggle('active');
                const content = this.nextElementSibling;
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
                const icon = this.querySelector('.toggle-icon');
                icon.textContent = icon.textContent === '▼' ? '▲' : '▼';
            });
            header.hasListener = true;
        }
    });
}

function handleImageError(event) {
    const img = event.target;
    console.error(`Failed to load image: ${img.src}`);

    if (img.src === img.dataset.fullSrc) {
        img.src = '../apple.jpg';
        img.alt = 'Image failed to load';
    } else {
        console.log(`Attempting to load full-size image: ${img.dataset.fullSrc}`);
        img.src = img.dataset.fullSrc;
    }
}

// Debounce function to limit the rate of function calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounced version of loadMoreImages
const debouncedLoadMoreImages = debounce(() => {
    if (!isLoading) {
        loadMoreImages();
    }
}, 250);

let isLoading = false;

async function loadMoreImages() {
    if (isLoading || allImagesLoaded) return;
    isLoading = true;
    showLoadingIndicator();

    try {
        const newImages = await getImageUrlsFromArchive(accountName, currentPage);
        if (newImages.length === 0) {
            allImagesLoaded = true;
            hideLoadMoreButton();
        } else {
            loadImages(newImages);
            currentPage++;
        }
    } catch (error) {
        console.error('Error loading more images:', error);
    } finally {
        isLoading = false;
        hideLoadingIndicator();
    }
}

function showLoadingIndicator() {
    document.getElementById('loading-indicator').style.display = 'flex';
}

function hideLoadingIndicator() {
    document.getElementById('loading-indicator').style.display = 'none';
}

// Usage
const accountName = 'jrbaines.04@gmail.com';
getImageUrlsFromArchive(accountName)
    .then(loadImages)
    .catch(error => console.error('Error:', error));

// Add scroll event listener for infinite scroll
window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        debouncedLoadMoreImages();
    }
});
