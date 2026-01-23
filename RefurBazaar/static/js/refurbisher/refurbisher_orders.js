// Refurbisher Orders Management
let ordersData = [];
let filteredOrders = [];
let currentFilter = 'all';

function InitializeRefurbisherOrders(csrfToken, ordersApiUrl) {
    window.csrfToken = csrfToken;
    window.ordersApiUrl = ordersApiUrl;
    
    loadOrders();
    setupEventListeners();
}

function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('[data-filter]').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('[data-filter]').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.getAttribute('data-filter');
            filterOrders();
        });
    });
}

async function loadOrders() {
    try {
        const [success, response] = await window.callApi('GET', window.ordersApiUrl, null, window.csrfToken);
        
        console.log('[v0] Orders API Response:', response);
        
        if (success && response.success && response.data) {
            ordersData = response.data;
            filteredOrders = ordersData;
            displayOrders();
            updateStats();
        } else {
            // Check for profile validation errors
            if (window.handleApiError && window.handleApiError(response)) {
                return;
            }
            showEmptyState();
        }
    } catch (error) {
        console.error('[v0] Error loading orders:', error);
        showError('Failed to load orders. Please try again.');
    }
}

function filterOrders() {
    if (currentFilter === 'all') {
        filteredOrders = ordersData;
    } else {
        filteredOrders = ordersData.filter(order => {
            return order.items.some(item => {
                if (currentFilter === 'pending') {
                    return item.fulfillment_status === 'pending' || item.fulfillment_status === 'device_verified';
                } else if (currentFilter === 'packed') {
                    return item.fulfillment_status === 'packed';
                } else if (currentFilter === 'delivered') {
                    return item.fulfillment_status === 'delivered';
                }
                return false;
            });
        });
    }
    
    displayOrders();
}

function displayOrders() {
    const ordersContainer = document.getElementById('ordersContainer');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const ordersTable = document.getElementById('ordersTable');
    const tableBody = document.getElementById('ordersTableBody');
    
    loadingState.classList.add('d-none');
    
    if (filteredOrders.length === 0) {
        emptyState.classList.remove('d-none');
        ordersTable.classList.add('d-none');
        return;
    }
    
    emptyState.classList.add('d-none');
    ordersTable.classList.remove('d-none');
    
    tableBody.innerHTML = filteredOrders.map(order => `
        <tr>
            <td>
                <strong>#${order.order_number || order.order_id}</strong><br>
                <small class="text-muted">${order.order_id}</small>
            </td>
            <td>${formatDate(order.created_at)}</td>
            <td>
                <strong>${order.first_name} ${order.last_name}</strong><br>
                <small class="text-muted">${order.phone}</small>
            </td>
            <td>${order.items.length} item${order.items.length > 1 ? 's' : ''}</td>
            <td>
                <strong>₹${parseFloat(getRefurbisherTotal(order.items)).toFixed(2)}</strong>
            </td>
            <td>${getOrderStatusBadge(order)}</td>
            <td>
                <a href="/refurbisher-order-detail/?order_id=${order.order_id}" class="btn btn-sm btn-primary">
                    View Details
                </a>
            </td>
        </tr>
    `).join('');
}

function getRefurbisherTotal(items) {
    return items.reduce((sum, item) => sum + parseFloat(item.price_at_purchase), 0);
}

function getOrderStatusBadge(order) {
    const statusCounts = {
        pending: 0,
        device_verified: 0,
        packed: 0,
        shipped: 0,
        delivered: 0,
        rejected: 0
    };
    
    order.items.forEach(item => {
        statusCounts[item.fulfillment_status] = (statusCounts[item.fulfillment_status] || 0) + 1;
    });
    
    // Determine overall status
    if (statusCounts.rejected > 0) {
        return '<span class="badge bg-danger">Rejected</span>';
    } else if (statusCounts.delivered === order.items.length) {
        return '<span class="badge bg-success">Delivered</span>';
    } else if (statusCounts.shipped > 0) {
        return '<span class="badge bg-info">Shipped</span>';
    } else if (statusCounts.packed > 0) {
        return '<span class="badge bg-primary">Packed</span>';
    } else if (statusCounts.device_verified > 0) {
        return '<span class="badge bg-warning">Verified</span>';
    } else {
        return '<span class="badge bg-secondary">Pending</span>';
    }
}

function updateStats() {
    const stats = {
        total: ordersData.length,
        pending: 0,
        packed: 0,
        delivered: 0
    };
    
    ordersData.forEach(order => {
        order.items.forEach(item => {
            if (item.fulfillment_status === 'pending' || item.fulfillment_status === 'device_verified') {
                stats.pending++;
            } else if (item.fulfillment_status === 'packed') {
                stats.packed++;
            } else if (item.fulfillment_status === 'delivered') {
                stats.delivered++;
            }
        });
    });
    
    document.getElementById('totalOrders').textContent = stats.total;
    document.getElementById('pendingOrders').textContent = stats.pending;
    document.getElementById('packedOrders').textContent = stats.packed;
    document.getElementById('deliveredOrders').textContent = stats.delivered;
}

function showEmptyState() {
    document.getElementById('loadingState').classList.add('d-none');
    document.getElementById('emptyState').classList.remove('d-none');
    document.getElementById('ordersTable').classList.add('d-none');
}

function showError(message) {
    const ordersContainer = document.getElementById('ordersContainer');
    ordersContainer.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i>${message}
        </div>
    `;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Export for use in HTML
window.InitializeRefurbisherOrders = InitializeRefurbisherOrders;
