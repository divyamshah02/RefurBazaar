// Admin Orders Management
let csrfToken = '';
let ordersApiUrl = '';
let allOrders = [];

function InitializeAdminOrders(csrf, orders_url) {
    csrfToken = csrf;
    ordersApiUrl = orders_url;
    
    loadOrders();
    
    // Setup event listeners
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('paymentFilter').addEventListener('change', applyFilters);
}

async function loadOrders() {
    try {
        const [success, response] = await window.callApi('GET', ordersApiUrl, null, csrfToken);
        
        console.log('[v0] Orders API Response:', response);
        
        if (success && response.success && response.data) {
            allOrders = response.data;
            displayOrders(allOrders);
        } else {
            showError('Failed to load orders');
        }
    } catch (error) {
        console.error('[v0] Error loading orders:', error);
        showError('Failed to load orders');
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const paymentFilter = document.getElementById('paymentFilter').value;
    
    let filtered = allOrders;
    
    if (searchTerm) {
        filtered = filtered.filter(order => 
            order.order_id.toLowerCase().includes(searchTerm) ||
            (order.first_name && order.first_name.toLowerCase().includes(searchTerm)) ||
            (order.last_name && order.last_name.toLowerCase().includes(searchTerm)) ||
            (order.phone && order.phone.includes(searchTerm))
        );
    }
    
    if (statusFilter) {
        filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    if (paymentFilter) {
        if (paymentFilter === 'paid') {
            filtered = filtered.filter(order => order.payment_received === true);
        } else if (paymentFilter === 'pending') {
            filtered = filtered.filter(order => order.payment_received === false);
        }
    }
    
    displayOrders(filtered);
}

function displayOrders(orders) {
    const tbody = document.getElementById('ordersTable');
    
    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted">No orders found</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><strong>${order.order_id}</strong></td>
            <td>${order.first_name} ${order.last_name}</td>
            <td>${order.phone || 'N/A'}</td>
            <td>${order.items ? order.items.length : 0}</td>
            <td>₹${Number(order.total_amount).toLocaleString('en-IN')}</td>
            <td>
                <span class="badge ${order.payment_received ? 'bg-success' : 'bg-warning text-dark'}">
                    ${order.payment_received ? 'Paid' : 'Pending'}
                </span>
            </td>
            <td>
                <span class="badge ${getStatusBadgeClass(order.status)}">
                    ${order.status_display}
                </span>
            </td>
            <td>${formatDate(order.created_at)}</td>
            <td>
                <a href="/admin-order-detail/?order_id=${order.order_id}" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-eye"></i>
                </a>
            </td>
        </tr>
    `).join('');
}

function getStatusBadgeClass(status) {
    const statusClasses = {
        'pending': 'bg-warning text-dark',
        'processing': 'bg-info text-white',
        'shipped': 'bg-primary text-white',
        'delivered': 'bg-success text-white',
        'cancelled': 'bg-danger text-white'
    };
    return statusClasses[status] || 'bg-secondary text-white';
}

function getPaymentBadgeClass(status) {
    const statusClasses = {
        'paid': 'bg-success',
        'pending': 'bg-warning text-dark',
        'failed': 'bg-danger'
    };
    return statusClasses[status] || 'bg-secondary';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showError(message) {
    document.getElementById('ordersTable').innerHTML = `
        <tr>
            <td colspan="9" class="text-center text-danger">${message}</td>
        </tr>
    `;
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/refurbisher-logout/';
    }
}

// Export for HTML usage
window.InitializeAdminOrders = InitializeAdminOrders;
window.applyFilters = applyFilters;
window.logout = logout;
