/**
 * Listing Detail Page JavaScript
 * Manages listing details display and admin approval actions
 */

// Configuration initialization
function InitializeListingDetail() {
    const csrfToken = document.querySelector('[name="csrfmiddlewaretoken"]')?.value || '{{ csrf_token }}';
    const listingId = document.querySelector('[data-listing-id]')?.getAttribute('data-listing-id') || '{{ listing_id }}';
    
    window.ListingDetailConfig = {
        csrfToken: csrfToken,
        listingId: listingId,
        endpoints: {
            listing: `/api/products/listings/${listingId}/`,
            approve: `/api/products/listings/${listingId}/approve/`,
            reject: `/api/products/listings/${listingId}/reject/`
        }
    };

    console.log('[v0] Initializing listing detail for ID:', listingId);
    loadListingDetails();
}

/**
 * Go back to previous page
 */
function goBack() {
    window.history.back();
}

/**
 * API call wrapper with CSRF token
 */
async function callApi(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.ListingDetailConfig.csrfToken
        }
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        console.log('[v0] API Call:', options.method || 'GET', url);
        const response = await fetch(url, mergedOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API Error');
        }

        console.log('[v0] API Response:', data);
        return data;
    } catch (error) {
        console.error('[v0] API Error:', error);
        alert('Error: ' + error.message);
        throw error;
    }
}

/**
 * Load listing details from API
 */
async function loadListingDetails() {
    try {
        console.log('[v0] Loading listing details...');
        const response = await callApi(window.ListingDetailConfig.endpoints.listing);
        window.currentListing = response.data;
        console.log('[v0] Listing loaded:', window.currentListing);
        renderListingDetails();
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('contentContainer').style.display = 'block';
    } catch (error) {
        console.error('[v0] Failed to load listing:', error);
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.innerHTML = '<p>Failed to load listing details. Please try again.</p>';
        }
    }
}

/**
 * Render listing details on page
 */
function renderListingDetails() {
    const listing = window.currentListing;

    console.log('[v0] Rendering listing details for:', listing.listing_id);

    // Header
    const listingIdEl = document.getElementById('listingId');
    const statusBadgeEl = document.getElementById('statusBadge');
    
    if (listingIdEl) listingIdEl.textContent = listing.listing_id;
    if (statusBadgeEl) {
        statusBadgeEl.textContent = listing.status_display;
        statusBadgeEl.className = `status-badge badge-${listing.status}`;
    }

    // Product Info
    document.getElementById('productName').textContent = `${listing.brand_name} ${listing.model_name}`;
    document.getElementById('productBrand').textContent = `Brand: ${listing.brand_name}`;
    document.getElementById('productCategory').textContent = `Category: ${listing.category_display}`;

    // Listing Info
    document.getElementById('detailListingId').textContent = listing.listing_id;
    document.getElementById('totalUnits').textContent = listing.total_quantity;
    document.getElementById('availableUnits').textContent = listing.available_units_count;
    document.getElementById('detailStatus').textContent = listing.status_display;
    document.getElementById('createdDate').textContent = new Date(listing.created_at).toLocaleDateString();
    document.getElementById('updatedDate').textContent = new Date(listing.updated_at).toLocaleDateString();

    // Refurbisher Info
    document.getElementById('refurbisherName').textContent = listing.refurbisher_name;
    document.getElementById('refurbisherEmail').textContent = listing.refurbisher_name;
    document.getElementById('refurbisherPhone').textContent = 'N/A';

    // Admin Actions
    showAdminActions(listing);

    // Units
    renderUnits(listing.units);

    // Statistics
    calculateStatistics(listing.units);

    console.log('[v0] Rendering complete');
}

/**
 * Show admin actions based on listing status
 */
function showAdminActions(listing) {
    const adminActions = document.getElementById('adminActions');
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    const rejectionInfo = document.getElementById('rejectionInfo');

    if (!adminActions) return;

    if (listing.status === 'pending_approval') {
        console.log('[v0] Status is pending_approval - showing approve/reject buttons');
        adminActions.style.display = 'block';
        if (approveBtn) {
            approveBtn.style.display = 'block';
            approveBtn.style.width = '100%';
        }
        if (rejectBtn) {
            rejectBtn.style.display = 'block';
            rejectBtn.style.width = '100%';
        }
        if (rejectionInfo) rejectionInfo.style.display = 'none';
    } else if (listing.status === 'rejected') {
        console.log('[v0] Status is rejected - showing rejection reason');
        adminActions.style.display = 'block';
        if (approveBtn) approveBtn.style.display = 'none';
        if (rejectBtn) rejectBtn.style.display = 'none';
        if (rejectionInfo) {
            rejectionInfo.style.display = 'block';
            const reasonEl = document.getElementById('rejectionReasonText');
            if (reasonEl) {
                reasonEl.textContent = listing.rejection_reason || 'No reason provided';
            }
        }
    } else {
        adminActions.style.display = 'none';
    }
}

/**
 * Render units table
 */
function renderUnits(units) {
    const tbody = document.getElementById('unitsBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    console.log('[v0] Rendering units:', units.length);

    units.forEach(unit => {
        const row = document.createElement('tr');
        const availabilityClass = unit.is_sold ? 'sold' : 'available';
        const availabilityText = unit.is_sold ? 'Sold' : (unit.is_available ? 'Available' : 'Unavailable');
        const conditionClass = `condition-${unit.condition}`;

        const attributes = unit.attributes.map(a => `${a.attribute_name}: ${a.value}`).join(', ');

        row.innerHTML = `
            <td>${unit.unit_number}</td>
            <td><strong>₹${parseFloat(unit.price).toLocaleString('en-IN', {minimumFractionDigits: 0})}</strong></td>
            <td><span class="condition-badge ${conditionClass}">${unit.condition_display}</span></td>
            <td><span class="availability ${availabilityClass}">${availabilityText}</span></td>
            <td><small>${attributes || 'N/A'}</small></td>
        `;

        tbody.appendChild(row);
    });
}

/**
 * Calculate and display statistics
 */
function calculateStatistics(units) {
    if (units.length === 0) {
        document.getElementById('avgPrice').textContent = '-';
        document.getElementById('minPrice').textContent = '-';
        document.getElementById('maxPrice').textContent = '-';
        document.getElementById('soldUnits').textContent = '0';
        return;
    }

    const prices = units.map(u => parseFloat(u.price));
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const soldUnits = units.filter(u => u.is_sold).length;

    const formatPrice = (price) => `₹${price.toLocaleString('en-IN', {minimumFractionDigits: 0})}`;

    document.getElementById('avgPrice').textContent = formatPrice(avgPrice);
    document.getElementById('minPrice').textContent = formatPrice(minPrice);
    document.getElementById('maxPrice').textContent = formatPrice(maxPrice);
    document.getElementById('soldUnits').textContent = soldUnits;

    console.log('[v0] Statistics calculated:', { avgPrice, minPrice, maxPrice, soldUnits });
}

/**
 * Approve listing
 */
async function approveListing() {
    if (!confirm('Are you sure you want to approve this listing?')) {
        return;
    }

    try {
        console.log('[v0] Approving listing:', window.ListingDetailConfig.listingId);
        const response = await callApi(window.ListingDetailConfig.endpoints.approve, { method: 'POST' });
        window.currentListing = response.data;
        renderListingDetails();
        alert('Listing approved successfully!');
    } catch (error) {
        console.error('[v0] Failed to approve listing:', error);
    }
}

/**
 * Open rejection modal
 */
function openRejectModal() {
    const reasonInput = document.getElementById('rejectionReason');
    if (reasonInput) {
        reasonInput.value = '';
    }
    const modal = document.getElementById('rejectModal');
    if (modal) {
        modal.classList.add('active');
    }
    console.log('[v0] Rejection modal opened');
}

/**
 * Close rejection modal
 */
function closeRejectModal() {
    const modal = document.getElementById('rejectModal');
    if (modal) {
        modal.classList.remove('active');
    }
    console.log('[v0] Rejection modal closed');
}

/**
 * Confirm rejection
 */
async function confirmReject() {
    const reasonInput = document.getElementById('rejectionReason');
    const reason = reasonInput ? reasonInput.value.trim() : '';
    
    if (!reason) {
        alert('Please provide a rejection reason.');
        return;
    }

    try {
        console.log('[v0] Rejecting listing:', window.ListingDetailConfig.listingId);
        const response = await callApi(window.ListingDetailConfig.endpoints.reject, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
        window.currentListing = response.data;
        renderListingDetails();
        closeRejectModal();
        alert('Listing rejected successfully!');
    } catch (error) {
        console.error('[v0] Failed to reject listing:', error);
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', InitializeListingDetail);
} else {
    InitializeListingDetail();
}
