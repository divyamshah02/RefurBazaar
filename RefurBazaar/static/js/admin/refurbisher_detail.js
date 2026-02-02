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
        showError('User ID not provided');
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
    const user = data.user || {};
    const company = data.company_profile || {};
    const listings = data.listings || [];
    const orders = data.orders || [];
    
    // Check if profile is complete and not approved
    const isPendingApproval = company.is_profile_complete && !company.is_approved;
    
    console.log('[v0] Display Data - User:', user, 'Company:', company, 'Pending:', isPendingApproval);
    
    // Update header
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    document.getElementById('refurbisherTitle').textContent = `${fullName || 'Refurbisher'} Details`;
    document.getElementById('refurbisherSubtitle').textContent = company.company_name || user.user_id;
    
    // Show/hide approval buttons
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    const approvalAlert = document.getElementById('approvalAlert');
    
    if (isPendingApproval) {
        approveBtn.style.display = 'inline-block';
        rejectBtn.style.display = 'inline-block';
        approvalAlert.classList.add('show');
    } else {
        approveBtn.style.display = 'none';
        rejectBtn.style.display = 'none';
        approvalAlert.classList.remove('show');
    }
    
    // --- Personal Info Tab ---
    document.getElementById('userId').textContent = user.user_id || '-';
    document.getElementById('userName').textContent = fullName || '-';
    document.getElementById('userEmail').textContent = user.email || '-';
    document.getElementById('userPhone').textContent = formatPhoneNumber(user.contact_number || '-');
    document.getElementById('alternatePhone').textContent = user.alternate_phone ? formatPhoneNumber(user.alternate_phone) : '-';
    document.getElementById('joinedDate').textContent = formatDate(user.created_at);
    
    // Status badges
    document.getElementById('profileComplete').innerHTML = company.is_profile_complete 
        ? '<span class="badge badge-success">Complete</span>' 
        : '<span class="badge badge-warning">Incomplete</span>';
    
    document.getElementById('approvalStatus').innerHTML = company.is_approved 
        ? '<span class="badge badge-success">Active</span>' 
        : '<span class="badge badge-warning">Pending</span>';
    
    // --- Company Info Tab ---
    displayCompanyInfo(company);
    
    // --- Address Info Tab ---
    displayAddressInfo(company);
    
    // --- Documents Tab ---
    displayDocuments(company);
    
    // --- Bank Info Tab ---
    displayBankInfo(company);
    
    // --- Statistics ---
    document.getElementById('totalListings').textContent = listings.length;
    document.getElementById('totalOrders').textContent = orders.length;
    
    // Calculate total revenue from orders
    let totalRevenue = 0;
    orders.forEach(order => {
        totalRevenue += parseFloat(order.total_price) || 0;
    });
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
    
    // --- Listings Table ---
    displayListings(listings);
    
    // --- Orders Table ---
    displayOrders(orders);
}

function displayCompanyInfo(company) {
    const companyInfoBody = document.getElementById('companyInfoBody');
    
    if (!company || Object.keys(company).length === 0) {
        companyInfoBody.innerHTML = '<p class="text-muted">No company information available</p>';
        return;
    }
    
    companyInfoBody.innerHTML = `
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Company Name</div>
                <div class="info-value">${company.company_name || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Business Type</div>
                <div class="info-value">${company.business_type || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">GST Registration No.</div>
                <div class="info-value">${company.gst_registration_no || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Business License No.</div>
                <div class="info-value">${company.business_license || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Contact Person Name</div>
                <div class="info-value">${company.first_name ? company.first_name + ' ' + (company.last_name || '') : '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Contact Email</div>
                <div class="info-value">${company.email || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Contact Phone</div>
                <div class="info-value">${formatPhoneNumber(company.contact_number || '-')}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Alternate Contact</div>
                <div class="info-value">${company.alternate_contact_number ? formatPhoneNumber(company.alternate_contact_number) : '-'}</div>
            </div>
        </div>
    `;
}

function displayAddressInfo(company) {
    const addressInfoBody = document.getElementById('addressInfoBody');
    
    if (!company) {
        addressInfoBody.innerHTML = '<p class="text-muted">No address information available</p>';
        return;
    }
    
    addressInfoBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="mb-3"><i class="fas fa-map-pin me-2"></i>Business Address</h6>
                <div class="info-grid">
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <div class="info-label">Address Line 1</div>
                        <div class="info-value">${company.address_line_1 || '-'}</div>
                    </div>
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <div class="info-label">Address Line 2</div>
                        <div class="info-value">${company.address_line_2 || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">City</div>
                        <div class="info-value">${company.city || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">State</div>
                        <div class="info-value">${company.state || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Pincode</div>
                        <div class="info-value">${company.pincode || '-'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Country</div>
                        <div class="info-value">${company.country || '-'}</div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <h6 class="mb-3"><i class="fas fa-undo me-2"></i>Return Address</h6>
                <div class="info-grid">
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <div class="info-label">Return Address Line 1</div>
                        <div class="info-value">${company.return_address_line_1 || '-'}</div>
                    </div>
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <div class="info-label">Return Address Line 2</div>
                        <div class="info-value">${company.return_address_line_2 || '-'}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function displayDocuments(company) {
    const documentsBody = document.getElementById('documentsBody');
    
    if (!company) {
        documentsBody.innerHTML = '<p class="text-muted">No documents available</p>';
        return;
    }
    
    const documents = [
        { name: 'GST Certificate', url: company.gst_certificate, icon: 'fa-file-pdf' },
        { name: 'Business License', url: company.business_license_file, icon: 'fa-file-pdf' },
        { name: 'Identity Proof', url: company.identity_proof, icon: 'fa-id-card' },
        { name: 'Address Proof', url: company.address_proof, icon: 'fa-file-alt' }
    ];
    
    let documentsHTML = '';
    documents.forEach(doc => {
        const isUploaded = doc.url && doc.url.trim() !== '';
        documentsHTML += `
            <div class="document-item">
                <div class="document-name">
                    <i class="fas ${doc.icon}"></i>
                    <div>
                        <div style="font-weight: 500; color: #1f2937;">${doc.name}</div>
                        <div style="font-size: 12px; color: #9ca3af;">${isUploaded ? 'Uploaded' : 'Not uploaded'}</div>
                    </div>
                </div>
                ${isUploaded ? `
                    <a href="${doc.url}" target="_blank" class="btn btn-sm btn-outline-primary" style="background: transparent; border: 1px solid var(--primary); color: var(--primary);">
                        <i class="fas fa-download me-1"></i>Download
                    </a>
                ` : '<span class="document-status" style="color: #ef4444;">Missing</span>'}
            </div>
        `;
    });
    
    documentsBody.innerHTML = documentsHTML || '<p class="text-muted">No documents found</p>';
}

function displayBankInfo(company) {
    const bankInfoBody = document.getElementById('bankInfoBody');
    
    if (!company) {
        bankInfoBody.innerHTML = '<p class="text-muted">No bank information available</p>';
        return;
    }
    
    bankInfoBody.innerHTML = `
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Account Holder Name</div>
                <div class="info-value">${company.account_holder_name || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Bank Name</div>
                <div class="info-value">${company.bank_name || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Branch Name</div>
                <div class="info-value">${company.branch_name || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Account Number</div>
                <div class="info-value" style="letter-spacing: 1px; font-family: monospace;">${maskAccountNumber(company.account_number || '-')}</div>
            </div>
            <div class="info-item">
                <div class="info-label">IFSC Code</div>
                <div class="info-value" style="font-family: monospace; font-weight: 600;">${company.ifsc_code || '-'}</div>
            </div>
        </div>
    `;
}

function displayListings(listings) {
    const listingsTable = document.getElementById('listingsTable');
    
    if (!listings || listings.length === 0) {
        listingsTable.innerHTML = '<tr><td colspan="5" class="text-center text-muted"><i class="fas fa-inbox"></i> No listings found</td></tr>';
        return;
    }
    
    listingsTable.innerHTML = listings.map(listing => {
        const brandName = listing.model?.brand?.name || 'Unknown';
        const modelName = listing.model?.name || '';
        const productName = `${brandName} ${modelName}`.trim();
        const status = listing.is_active ? 'Active' : 'Inactive';
        const statusClass = listing.is_active ? 'badge-success' : 'badge-danger';
        
        return `
            <tr>
                <td><strong>${listing.id || listing.listing_id || 'N/A'}</strong></td>
                <td>${productName}</td>
                <td><strong>${listing.available_units || 0}</strong></td>
                <td><span class="badge ${statusClass}">${status}</span></td>
                <td>${formatDate(listing.created_at)}</td>
            </tr>
        `;
    }).join('');
}

function displayOrders(orders) {
    const ordersTable = document.getElementById('ordersTable');
    
    if (!orders || orders.length === 0) {
        ordersTable.innerHTML = '<tr><td colspan="5" class="text-center text-muted"><i class="fas fa-inbox"></i> No orders found</td></tr>';
        return;
    }
    
    ordersTable.innerHTML = orders.map(order => {
        const customerName = `${order.customer_name || order.first_name || 'N/A'} ${order.customer_last_name || order.last_name || ''}`.trim();
        const statusClass = getStatusBadgeClass(order.order_status);
        
        return `
            <tr>
                <td><strong>${order.order_id}</strong></td>
                <td>${customerName}</td>
                <td>₹${parseFloat(order.total_price || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                <td><span class="badge ${statusClass}">${order.order_status || 'Unknown'}</span></td>
                <td>${formatDate(order.created_at)}</td>
            </tr>
        `;
    }).join('');
}

async function approveRefurbisher() {
    if (!confirm('Are you sure you want to ACTIVATE this refurbisher? They will be able to add listings and start selling.')) {
        return;
    }
    
    try {
        console.log('[v0] Approving refurbisher:', userId);
        const [success, response] = await window.callApi('POST', approveApiUrl, { action: 'approve' }, csrfToken);
        
        console.log('[v0] Approve Response:', response);
        
        if (success && response.success) {
            alert('Refurbisher activated successfully!');
            loadRefurbisherDetail(); // Reload data
        } else {
            alert(response.error || 'Failed to activate refurbisher');
        }
    } catch (error) {
        console.error('[v0] Error approving refurbisher:', error);
        alert('Error activating refurbisher');
    }
}

async function rejectRefurbisher() {
    if (!confirm('Are you sure you want to REJECT this refurbisher? This will remove their approval status.')) {
        return;
    }
    
    try {
        console.log('[v0] Rejecting refurbisher:', userId);
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
        'pending': 'badge-warning',
        'processing': 'badge-info',
        'shipped': 'badge-primary',
        'delivered': 'badge-success',
        'cancelled': 'badge-danger'
    };
    return statusClasses[status] || 'badge-secondary';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        });
    } catch (e) {
        return '-';
    }
}

function formatPhoneNumber(phone) {
    if (!phone) return '-';
    const cleaned = phone.toString().replace(/\D/g, '').slice(-10);
    if (cleaned.length === 10) {
        return cleaned.replace(/(\d{5})(\d{5})/, '$1 $2');
    }
    return phone;
}

function maskAccountNumber(accountNum) {
    if (!accountNum || accountNum === '-') return accountNum;
    const str = accountNum.toString();
    if (str.length <= 4) return str;
    const masked = '*'.repeat(str.length - 4) + str.slice(-4);
    return masked;
}

function showError(message) {
    alert(message);
    console.error('[v0] Error:', message);
}

// Export functions to window
window.InitializeRefurbisherDetail = InitializeRefurbisherDetail;
window.approveRefurbisher = approveRefurbisher;
window.rejectRefurbisher = rejectRefurbisher;
