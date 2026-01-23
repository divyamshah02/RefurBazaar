// Admin Dashboard Management
let csrfToken = '';
let statsApiUrl = '';
let ordersApiUrl = '';
let refurbishersApiUrl = '';

function InitializeAdminDashboard(csrf, stats_url, orders_url, refurbishers_url) {
    csrfToken = csrf;
    statsApiUrl = stats_url;
    ordersApiUrl = orders_url;
    refurbishersApiUrl = refurbishers_url;
    
    // Load dashboard data
    loadStats();
    loadRecentOrders();
    loadPendingRefurbishers();
}

async function loadStats() {
    try {
        const [success, response] = await window.callApi('GET', statsApiUrl, null, csrfToken);
        
        console.log('[v0] Stats API Response:', response);
        
        if (success && response.success && response.data) {
            const stats = response.data;
            document.getElementById('totalOrders').textContent = stats.total_orders || 0;
            document.getElementById('totalRefurbishers').textContent = stats.total_refurbishers || 0;
            document.getElementById('pendingRefurbishers').textContent = stats.pending_refurbishers || 0;
            document.getElementById('pendingCount').textContent = stats.pending_refurbishers || 0;
            document.getElementById('totalRevenue').textContent = `₹${Number(stats.total_revenue || 0).toLocaleString('en-IN')}`;
        }
    } catch (error) {
        console.error('[v0] Error loading stats:', error);
    }
}

async function loadRecentOrders() {
    try {
        const [success, response] = await window.callApi('GET', ordersApiUrl, null, csrfToken);
        
        console.log('[v0] Recent Orders API Response:', response);
        
        if (success && response.success && response.data) {
            const orders = response.data.slice(0, 5); // Show only 5 recent orders
            const tbody = document.getElementById('recentOrdersTable');
            
            if (orders.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted">No orders found</td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = orders.map(order => `
                <tr>
                    <td><strong>${order.order_id}</strong></td>
                    <td>${order.first_name} ${order.last_name}</td>
                    <td>₹${Number(order.total_amount).toLocaleString('en-IN')}</td>
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
    } catch (error) {
        console.error('[v0] Error loading recent orders:', error);
        document.getElementById('recentOrdersTable').innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">Failed to load orders</td>
            </tr>
        `;
    }
}

async function loadPendingRefurbishers() {
    try {
        const url = `${refurbishersApiUrl}?status=pending`;
        const [success, response] = await window.callApi('GET', url, null, csrfToken);
        
        console.log('[v0] Pending Refurbishers API Response:', response);
        
        if (success && response.success && response.data) {
            const refurbishers = response.data.slice(0, 5); // Show only 5 pending
            const tbody = document.getElementById('pendingRefurbishersTable');
            
            if (refurbishers.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted">No pending approvals</td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = refurbishers.map(ref => `
                <tr>
                    <td><strong>${ref.user.user_id}</strong></td>
                    <td>${ref.company_profile?.company_name || 'N/A'}</td>
                    <td>${ref.user.contact_number}</td>
                    <td>${formatDate(ref.user.created_at)}</td>
                    <td>
                        <a href="/admin-refurbisher-detail/?user_id=${ref.user.user_id}" class="btn btn-sm btn-outline-primary me-2">
                            <i class="fas fa-eye"></i> Review
                        </a>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('[v0] Error loading pending refurbishers:', error);
        document.getElementById('pendingRefurbishersTable').innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">Failed to load pending approvals</td>
            </tr>
        `;
    }
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

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/refurbisher-logout/';
    }
}

// Export for HTML usage
window.InitializeAdminDashboard = InitializeAdminDashboard;
