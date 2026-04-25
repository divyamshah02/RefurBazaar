document.addEventListener("DOMContentLoaded", () => {
    fetchWishlist();
});

// Format Indian Rupee perfectly
function formatPrice(price) {
    return new Intl.NumberFormat('en-IN').format(price);
}

// Fetch Wishlist Items from Django API
async function fetchWishlist() {
    const grid = document.getElementById('wishlistGrid');
    const emptyState = document.getElementById('emptyWishlistState');
    const loader = document.getElementById('wishlistLoader');

    try {
        const response = await callApi('GET', '/cart/wishlist-api/');
        
        loader.style.display = 'none';

        if (response.success && response.data.items.length > 0) {
            grid.style.display = 'flex';
            emptyState.style.display = 'none';
            renderWishlistItems(response.data.items);
        } else {
            grid.style.display = 'none';
            emptyState.style.display = 'flex';
        }
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        loader.style.display = 'none';
        emptyState.style.display = 'flex';
    }
}

// Render the HTML cards
function renderWishlistItems(items) {
    const grid = document.getElementById('wishlistGrid');
    grid.innerHTML = ''; // Clear previous

    items.forEach(item => {
        const unit = item.listing_unit;
        
        // Use a placeholder if you don't have the image in the nested unit yet
        const imgUrl = unit.image || '/static/images/iPhone 16 Pro.png'; 
        
        const cardHTML = `
            <div class="col-6 col-md-4 col-lg-3" id="wishlist-item-${unit.id}">
                <div class="product-card h-100">
                    <button class="btn rounded-circle btn-remove-wishlist" 
                            onclick="removeFromWishlist(${unit.id})" 
                            title="Remove from Wishlist">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    
                    <div class="product-image text-center mb-3">
                        <img src="${imgUrl}" alt="${unit.model_name}" style="max-height: 160px; object-fit: contain;">
                    </div>
                    
                    <div class="product-info">
                        <h6 class="fw-bold text-truncate mb-1" title="${unit.brand_name} ${unit.model_name}">
                            ${unit.brand_name} ${unit.model_name}
                        </h6>
                        <div class="product-condition text-muted small mb-2 text-capitalize">
                            ${unit.condition} Condition
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <span class="current" style="color: #2A8C3C; font-size: 1.1rem; font-weight: 800;">
                                ₹${formatPrice(unit.price)}
                            </span>
                            <a href="${SHOP_URL}?product=${unit.id}" class="btn btn-sm rounded-pill px-3" style="background: #2A8C3C; color: white; font-weight: 600;">
                                View
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', cardHTML);
    });
}

// Remove an item and update UI instantly
async function removeFromWishlist(unitId) {
    // Optimistically remove the card from UI immediately for a snappy feel
    const cardElement = document.getElementById(`wishlist-item-${unitId}`);
    if (cardElement) {
        cardElement.style.display = 'none';
    }

    try {
        const response = await callApi('POST', '/cart/wishlist-api/toggle/', { listing_unit_id: unitId }, CSRF_TOKEN);
        
        if (response.success && response.data.action === "removed") {
            // Remove completely from DOM
            if (cardElement) cardElement.remove();
            
            // Check if grid is now empty
            const remainingItems = document.querySelectorAll('#wishlistGrid .col-6');
            if (remainingItems.length === 0) {
                document.getElementById('wishlistGrid').style.display = 'none';
                document.getElementById('emptyWishlistState').style.display = 'flex';
            }
        } else {
            // Revert UI if API failed
            if (cardElement) cardElement.style.display = 'block';
            alert("Could not remove item. Please try again.");
        }
    } catch (error) {
        console.error("Error removing item:", error);
        if (cardElement) cardElement.style.display = 'block';
    }
}