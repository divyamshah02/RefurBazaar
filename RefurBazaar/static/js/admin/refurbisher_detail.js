// Admin Refurbisher Detail Management
let csrfToken = '';
let detailApiUrl = '';
let approveApiUrl = '';
let userId = '';
let refurbisherData = null;

function InitializeRefurbisherDetail(csrf, detail_url, approve_url, user_id) {
    csrfToken = csrf;
    detailApiUrl = detail_url;
    approveApiUrl = approve_url;
    userId = user_id;
    
    console.log('[v0] Initializing Refurbisher Detail');
    console.log('[v0] Detail URL:', detailApiUrl);
    console.log('[v0] Approve URL:', approveApiUrl);
    console.log('[v0] User ID:', userId);
    
    if (!userId) {
        alert('User ID not provided');
        return;
    }
    
    loadRefurbisherDetail();
}

async function loadRefurbisherDetail() {
    try {
        const [success, response] = await window.callApi('GET', detailApiUrl, null, csrfToken);
        
        console.log('[v0] Refurbisher Detail API Response:', response);
        
        if (success && response.success && response.data) {
            refurbisherData = response.data;
            displayRefurbisherDetail(refurbisherData);
        } else {
            showError(response.error || 'Failed to load refurbisher details');
        }
    } catch (error) {
        console.error('[v0] Error loading refurbisher detail:', error);
        showError('Failed to load refurbisher details');
    }
}

function displayRefurbisherDetail(data) {
    const user = data.user;
    const company = data.company_profile;
    const listings = data.listings || [];
    const orders = data.orders || [];
    
    // Update title
    document.getElementById('refurbisherTitle').textContent = `${user.first_name} ${user.last_name} - Refurbisher Details`;
    
    // Show approval buttons and alert if not approved yet
    if (company && company.is_profile_complete && !company.is_approved) {
        document.getElementById('approvalActions').style.display = 'block';
        document.getElementById('approvalAlert').style.display = 'block';
    } else {
        document.getElementById('approvalActions').style.display = 'none';
        document.getElementById('approvalAlert').style.display = 'none';
    }
    
    // Update basic info
    document.getElementById('userId').textContent = user.user_id;
    document.getElementById('userName').textContent = `${user.first_name} ${user.last_name}`;
    document.getElementById('userEmail').textContent = user.email || 'N/A';
    document.getElementById('userPhone').textContent = user.contact_number;
    document.getElementById('joinedDate').textContent = formatDate(user.created_at);
    document.getElementById('approvalStatus').innerHTML = company?.is_approved 
        ? '<span class="badge bg-success">Approved</span>' 
        : '<span class="badge bg-warning text-dark">Pending</span>';
    document.getElementById('profileComplete').innerHTML = company?.is_profile_complete 
        ? '<span class="badge bg-success">Yes</span>' 
        : '<span class="badge bg-warning text-dark">No</span>';
    
    // Company Info
    const companyInfo = document.getElementById('companyInfo');
    if (company) {
        companyInfo.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Company Name:</strong> ${company.company_name || 'N/A'}</p>
                    <p><strong>GST Number:</strong> ${company.gst_number || 'N/A'}</p>
                    <p><strong>Business Type:</strong> ${company.business_type || 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Company Address:</strong> ${company.company_address || 'N/A'}</p>
                    <p><strong>Bank Account:</strong> ${company.bank_account_number || 'N/A'}</p>
                    <p><strong>IFSC Code:</strong> ${company.ifsc_code || 'N/A'}</p>
                </div>
            </div>
        `;
    } else {
        companyInfo.innerHTML = '<p class="text-muted">No company information available</p>';
    }
    
    // Documents
    const documentsSection = document.getElementById('documentsSection');
    if (company) {
        documentsSection.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <p><strong>GST Document:</strong> ${company.gst_document ? `<a href="${company.gst_document}" target="_blank">View</a>` : 'Not uploaded'}</p>
                    <p><strong>PAN Card:</strong> ${company.pan_card ? `<a href="${company.pan_card}" target="_blank">View</a>` : 'Not uploaded'}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Trade License:</strong> ${company.trade_license ? `<a href="${company.trade_license}" target="_blank">View</a>` : 'Not uploaded'}</p>
                    <p><strong>Address Proof:</strong> ${company.address_proof ? `<a href="${company.address_proof}" target="_blank">View</a>` : 'Not uploaded'}</p>
                </div>
            </div>
        `;
    } else {
        documentsSection.innerHTML = '<p class="text-muted">No documents available</p>';
    }
    
    // Stats
    document.getElementById('totalListings').textContent = listings.length;
    document.getElementById('totalOrders').textContent = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
    
    // Listings table
    const listingsTable = document.getElementById('listingsTable');
    if (listings.length > 0) {
        listingsTable.innerHTML = listings.map(listing => `
            <tr>
                <td>${listing.listing_id || 'N/A'}</td>
                <td>${listing.model?.brand?.name || 'N/A'} ${listing.model?.name || ''}</td>
                <td>${listing.available_units || 0}</td>
                <td><span class="badge ${listing.is_active ? 'bg-success' : 'bg-danger'}">${listing.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>${formatDate(listing.created_at)}</td>
            </tr>
        `).join('');
    } else {
        listingsTable.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No listings found</td></tr>';
    }
    
    // Orders table
    const ordersTable = document.getElementById('ordersTable');
    if (orders.length > 0) {
        ordersTable.innerHTML = orders.map(order => `
            <tr>
                <td><strong>${order.order_id}</strong></td>
                <td>${order.first_name} ${order.last_name}</td>
                <td>₹${Number(order.total_amount).toLocaleString('en-IN')}</td>
                <td><span class="badge ${getStatusBadgeClass(order.status)}">${order.status_display}</span></td>
                <td>${formatDate(order.created_at)}</td>
            </tr>
        `).join('');
    } else {
        ordersTable.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No orders found</td></tr>';
    }
}

async function approveRefurbisher() {
    if (!confirm('Are you sure you want to APPROVE this refurbisher? They will be able to add listings and receive orders.')) {
        return;
    }
    
    try {
        const [success, response] = await window.callApi('POST', approveApiUrl, { action: 'approve' }, csrfToken);
        
        console.log('[v0] Approve Response:', response);
        
        if (success && response.success) {
            alert('Refurbisher approved successfully!');
            loadRefurbisherDetail(); // Reload data
        } else {
            alert(response.error || 'Failed to approve refurbisher');
        }
    } catch (error) {
        console.error('[v0] Error approving refurbisher:', error);
        alert('Error approving refurbisher');
    }
}

async function rejectRefurbisher() {
    if (!confirm('Are you sure you want to REJECT this refurbisher? This will remove their approval status.')) {
        return;
    }
    
    try {
        const [success, response] = await window.callApi('POST', approveApiUrl, { action: 'reject' }, csrfToken);
        
        console.log('[v0] Reject Response:', response);
        
        if (success && response.success) {
            alert('Refurbisher rejected');
            loadRefurbisherDetail(); // Reload data
        } else {
            alert(response.error || 'Failed to reject refurbisher');
        }
    } catch (error) {
        console.error('[v0] Error rejecting refurbisher:', error);
        alert('Error rejecting refurbisher');
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
        month: 'long', 
        day: 'numeric'
    });
}

function showError(message) {
    alert(message);
    console.error('[v0] Error:', message);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/refurbisher-logout/';
    }
}

window.InitializeRefurbisherDetail = InitializeRefurbisherDetail;
window.approveRefurbisher = approveRefurbisher;
window.rejectRefurbisher = rejectRefurbisher;
window.logout = logout;

