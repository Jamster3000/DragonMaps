const ITEMS_PER_PAGE = 50;
let currentPage = 1;

async function getImageUrlsFromArchive(accountName, page = 1) {
    const apiUrl = `https://archive.org/advancedsearch.php?q=uploader:${accountName}&fl[]=identifier&fl[]=mediatype&output=json&rows=${ITEMS_PER_PAGE}&page=${page}`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        const imageItems = data.response.docs.filter(item => item.mediatype === 'image');
        const imageData = await Promise.all(imageItems.map(getItemDetails));
        return imageData.flat();
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

async function getItemDetails(item) {
    const cacheKey = `item_${item.identifier}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        return JSON.parse(cachedData);
    }

    const metadataUrl = `https://archive.org/metadata/${item.identifier}`;
    const response = await fetch(metadataUrl);
    const data = await response.json();
    const creator = data.metadata.creator || 'Unknown Creator';
    const images = data.files
        .filter(file => ['PNG', 'JPEG', 'GIF'].includes(file.format))
        .map(file => ({
            url: `https://archive.org/download/${item.identifier}/${file.name}`,
            creator: creator,
            thumbnail: `https://archive.org/download/${item.identifier}/${file.name}&width=200` // Thumbnail URL
        }));

    localStorage.setItem(cacheKey, JSON.stringify(images));
    return images;
}

function loadImages(imageData) {
    const assetLocation = document.querySelector("#assets-section .section-content");
    const groupedImages = imageData.reduce((acc, img) => {
        acc[img.creator] = acc[img.creator] || [];
        acc[img.creator].push(img);
        return acc;
    }, {});

    Object.entries(groupedImages).forEach(([creator, images]) => {
        let categoryContainer = document.createElement('div');
        categoryContainer.className = "asset-category";
        categoryContainer.innerHTML = `
            <h4 class="category-header">${creator}<span class="toggle-icon">▼</span></h4>
            <div class="category-content" style="display:none;"></div>
        `;
        const contentDiv = categoryContainer.querySelector('.category-content');

        images.forEach(img => {
            let imgElement = document.createElement('img');
            imgElement.src = img.thumbnail;
            imgElement.alt = `Image by ${creator}`;
            imgElement.dataset.fullSrc = img.url;
            imgElement.addEventListener('click', loadFullImage);
            contentDiv.appendChild(imgElement);
        });

        assetLocation.appendChild(categoryContainer);
    });

    addToggleListeners();
}

function loadFullImage(event) {
    const img = event.target;
    img.src = img.dataset.fullSrc;
}

function addToggleListeners() {
    document.querySelectorAll('.category-header').forEach(header => {
        header.addEventListener('click', function () {
            this.classList.toggle('active');
            const content = this.nextElementSibling;
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
            const icon = this.querySelector('.toggle-icon');
            icon.textContent = icon.textContent === '▼' ? '▲' : '▼';
        });
    });
}

function loadMoreImages() {
    currentPage++;
    getImageUrlsFromArchive(accountName, currentPage)
        .then(loadImages)
        .catch(error => console.error('Error:', error));
}

// Usage
const accountName = 'jrbaines.04@gmail.com';
getImageUrlsFromArchive(accountName)
    .then(loadImages)
    .catch(error => console.error('Error:', error));

// Add scroll event listener for infinite scroll
window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        loadMoreImages();
    }
});