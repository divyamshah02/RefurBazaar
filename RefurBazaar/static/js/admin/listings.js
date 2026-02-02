/**
 * Listings Admin Management JavaScript
 * Manages the listings list page with filtering, search, and admin actions
 */

// Configuration initialization
function InitializeListingsAdmin() {
    const csrfToken = document.querySelector('[name="csrfmiddlewaretoken"]')?.value || '{{ csrf_token }}';
    
    window.ListingsConfig = {
        csrfToken: csrfToken,
        apiBaseUrl: '/api/products',
        endpoints: {
            listings: '/api/products/listings/',
            approve: (id) => `/api/products/listings/${id}/approve/`,
            reject: (id) => `/api/products/listings/${id}/reject/`
        }
    };

    // Initialize event listeners
    setupEventListeners();
    
    // Load initial data
    loadListings();
}

/**
 * Setup event listeners for filters and search
 */
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterListings, 300));
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', filterListings);
    }
}

/**
 * Debounce helper function
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * API call wrapper with CSRF token
 */
async function callApi(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.ListingsConfig.csrfToken
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
        const response = await fetch(url, mergedOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API Error');
        }

        return data;
    } catch (error) {
        console.error('[v0] API Error:', error);
        showNotification('Error: ' + error.message, 'error');
        throw error;
    }
}

/**
 * Load listings from API
 */
async function loadListings() {
    try {
        console.log('[v0] Loading listings...');
        showLoading(true);
        
        const response = await callApi(window.ListingsConfig.endpoints.listings);
        window.allListings = response.data || [];
        
        console.log('[v0] Loaded listings:', window.allListings.length);
        updateStats();
        filterListings();
        showLoading(false);
    } catch (error) {
        console.error('[v0] Failed to load listings:', error);
        showLoading(false);
    }
}

/**
 * Update statistics display
 */
function updateStats() {
    const stats = {
        total: window.allListings.length,
        active: window.allListings.filter(l => l.status === 'active').length,
        pending: window.allListings.filter(l => l.status === 'pending_approval').length,
        rejected: window.allListings.filter(l => l.status === 'rejected').length
    };

    const totalEl = document.getElementById('totalCount');
    const activeEl = document.getElementById('activeCount');
    const pendingEl = document.getElementById('pendingCount');
    const rejectedEl = document.getElementById('rejectedCount');

    if (totalEl) totalEl.textContent = stats.total;
    if (activeEl) activeEl.textContent = stats.active;
    if (pendingEl) pendingEl.textContent = stats.pending;
    if (rejectedEl) rejectedEl.textContent = stats.rejected;

    console.log('[v0] Stats updated:', stats);
}

/**
 * Filter listings based on search and status
 */
function filterListings() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const statusValue = statusFilter ? statusFilter.value : '';

    const filtered = window.allListings.filter(listing => {
        const matchesSearch = !searchTerm || 
            listing.listing_id.toLowerCase().includes(searchTerm) ||
            listing.model_name.toLowerCase().includes(searchTerm) ||
            listing.refurbisher_name.toLowerCase().includes(searchTerm);

        const matchesStatus = !statusValue || listing.status === statusValue;

        return matchesSearch && matchesStatus;
    });

    console.log('[v0] Filtered listings:', filtered.length);
    renderListings(filtered);
}

/**
 * Render listings table
 */
function renderListings(listings) {
    const table = document.getElementById('listingsTable');
    const tbody = document.getElementById('listingsBody');
    const emptyState = document.getElementById('emptyState');

    if (!tbody) {
        console.error('[v0] Listings table body not found');
        return;
    }

    tbody.innerHTML = '';

    if (listings.length === 0) {
        if (table) table.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (table) table.style.display = 'table';
    if (emptyState) emptyState.style.display = 'none';

    listings.forEach(listing => {
        const row = createListingRow(listing);
        tbody.appendChild(row);
    });

    console.log('[v0] Rendered listings:', listings.length);
}

/**
 * Create table row for listing
 */
function createListingRow(listing) {
    const row = document.createElement('tr');
    const createdDate = new Date(listing.created_at).toLocaleDateString();
    const statusBadgeClass = `badge-${listing.status}`;

    row.innerHTML = `
        <td>
            <a href="/admin/listings/${listing.id}/" class="listing-id">
                ${listing.listing_id}
            </a>
        </td>
        <td>
            <div>
                <strong>${listing.brand_name} ${listing.model_name}</strong>
                <br>
                <small style="color: #999;">${listing.category_display}</small>
            </div>
        </td>
        <td>
            <div class="refurbisher-info">
                <div class="avatar">${listing.refurbisher_name.charAt(0).toUpperCase()}</div>
                <div>${listing.refurbisher_name}</div>
            </div>
        </td>
        <td>
            <strong>${listing.total_quantity}</strong> units<br>
            <small style="color: #999;">${listing.available_units_count} available</small>
        </td>
        <td>
            <span class="badge ${statusBadgeClass}">${listing.status_display}</span>
        </td>
        <td>${createdDate}</td>
        <td>
            <div class="actions">
                <a href="/admin/listings/${listing.id}/" class="btn btn-view">
                    <i class="fas fa-eye"></i> View
                </a>
                ${listing.status === 'pending_approval' ? `
                    <button class="btn btn-approve" onclick="approveListing(${listing.id})">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-reject" onclick="openRejectModal(${listing.id})">
                        <i class="fas fa-times"></i> Reject
                    </button>
                ` : ''}
            </div>
        </td>
    `;

    return row;
}

/**
 * Approve listing
 */
async function approveListing(listingId) {
    if (!confirm('Are you sure you want to approve this listing?')) {
        return;
    }

    try {
        console.log('[v0] Approving listing:', listingId);
        await callApi(window.ListingsConfig.endpoints.approve(listingId), { method: 'POST' });
        showNotification('Listing approved successfully!', 'success');
        loadListings();
    } catch (error) {
        console.error('[v0] Failed to approve listing:', error);
    }
}

/**
 * Open rejection modal
 */
function openRejectModal(listingId) {
    window.currentRejectListingId = listingId;
    const reasonInput = document.getElementById('rejectionReason');
    if (reasonInput) {
        reasonInput.value = '';
    }
    const modal = document.getElementById('rejectModal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Close rejection modal
 */
function closeRejectModal() {
    const modal = document.getElementById('rejectModal');
    if (modal) {
        modal.classList.remove('active');
    }
    window.currentRejectListingId = null;
}

/**
 * Confirm rejection
 */
async function confirmReject() {
    if (!window.currentRejectListingId) return;

    const reasonInput = document.getElementById('rejectionReason');
    const reason = reasonInput ? reasonInput.value.trim() : '';
    
    if (!reason) {
        alert('Please provide a rejection reason.');
        return;
    }

    try {
        console.log('[v0] Rejecting listing:', window.currentRejectListingId);
        await callApi(window.ListingsConfig.endpoints.reject(window.currentRejectListingId), {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
        showNotification('Listing rejected successfully!', 'success');
        closeRejectModal();
        loadListings();
    } catch (error) {
        console.error('[v0] Failed to reject listing:', error);
    }
}

/**
 * Show/hide loading state
 */
function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    const table = document.getElementById('listingsTable');
    const emptyState = document.getElementById('emptyState');

    if (loadingState) loadingState.style.display = show ? 'block' : 'none';
    if (table && !show) table.style.display = 'table';
    if (emptyState && !show) emptyState.style.display = 'none';
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    console.log(`[v0] ${type.toUpperCase()}: ${message}`);
    // You can integrate with a toast library here
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', InitializeListingsAdmin);
} else {
    InitializeListingsAdmin();
}
