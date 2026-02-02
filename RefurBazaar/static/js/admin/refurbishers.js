// Admin Refurbishers Management
let csrfToken = '';
let apiUrl = '';
let allData = [];
let filteredData = [];

function InitializeAdminRefurbishers(csrf, url) {
    csrfToken = csrf;
    apiUrl = url;
    
    console.log('[v0] Initializing Admin Refurbishers');
    console.log('[v0] API URL:', apiUrl);
    
    loadData();
    
    // Add event listeners for real-time filtering
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
}

async function loadData() {
    try {
        console.log('[v0] Loading refurbishers data...');
        const [success, response] = await window.callApi('GET', apiUrl, null, csrfToken);
        
        console.log('[v0] Refurbishers API Response:', response);
        
        if (success && response.success && response.data) {
            allData = response.data;
            filteredData = [...allData];
            updateStatistics();
            displayData(allData);
        } else {
            showError(response.error || 'Failed to load refurbishers');
        }
    } catch (error) {
        console.error('[v0] Error loading refurbishers:', error);
        showError('Failed to load refurbishers. Please try again.');
    }
}

function updateStatistics() {
    if (!allData || allData.length === 0) {
        document.getElementById('totalRefurbishers').textContent = '0';
        document.getElementById('approvedRefurbishers').textContent = '0';
        document.getElementById('pendingRefurbishers').textContent = '0';
        return;
    }

    const total = allData.length;
    const approved = allData.filter(ref => ref.company_profile?.is_approved).length;
    const pending = allData.filter(ref => 
        ref.company_profile?.is_profile_complete && !ref.company_profile?.is_approved
    ).length;

    console.log('[v0] Statistics - Total:', total, 'Approved:', approved, 'Pending:', pending);

    document.getElementById('totalRefurbishers').textContent = total;
    document.getElementById('approvedRefurbishers').textContent = approved;
    document.getElementById('pendingRefurbishers').textContent = pending;
}

function applyFilters() {
    console.log('[v0] Applying filters...');
    
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredData = allData.filter(ref => {
        // Search filter
        if (searchTerm) {
            const searchableFields = [
                ref.user_id || '',
                ref.first_name || '',
                ref.last_name || '',
                ref.email || '',
                ref.contact_number || '',
                ref.company_profile?.company_name || '',
                ref.company_profile?.gst_registration_no || ''
            ];
            
            const matches = searchableFields.some(field => 
                field.toString().toLowerCase().includes(searchTerm)
            );
            
            if (!matches) return false;
        }
        
        // Status filter
        if (statusFilter) {
            if (statusFilter === 'approved') {
                return ref.company_profile?.is_approved === true;
            } else if (statusFilter === 'pending') {
                return ref.company_profile?.is_profile_complete && !ref.company_profile?.is_approved;
            } else if (statusFilter === 'incomplete') {
                return !ref.company_profile?.is_profile_complete;
            }
        }
        
        return true;
    });
    
    console.log('[v0] Filtered results:', filteredData.length);
    displayData(filteredData);
}

function displayData(refurbishers) {
    console.log('[v0] Displaying refurbishers:', refurbishers.length);
    
    const tbody = document.getElementById('refurbishersTable');
    
    if (!refurbishers || refurbishers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <p>No refurbishers found matching your criteria</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = refurbishers.map(ref => {
        const fullName = `${ref.first_name || ''} ${ref.last_name || ''}`.trim() || 'N/A';
        const userInitials = getInitials(fullName);
        const companyName = ref.company_profile?.company_name || 'N/A';
        const contactPhone = formatPhoneNumber(ref.contact_number || '-');
        const totalListings = ref.stats?.total_listings || 0;
        const totalSales = ref.stats?.total_sales || 0;
        
        // Determine status
        let statusBadge = '';
        let statusClass = '';
        if (ref.company_profile?.is_approved) {
            statusBadge = '<span class="badge badge-success"><span class="status-dot active"></span>Active</span>';
            statusClass = 'badge-success';
        } else if (ref.company_profile?.is_profile_complete) {
            statusBadge = '<span class="badge badge-warning"><span class="status-dot pending"></span>Pending</span>';
            statusClass = 'badge-warning';
        } else {
            statusBadge = '<span class="badge badge-info"><span class="status-dot" style="background-color: #9ca3af;"></span>Incomplete</span>';
            statusClass = 'badge-info';
        }
        
        const actionButtons = `
            <div class="action-buttons">
                <a href="/admin-refurbisher-detail/?user_id=${ref.user_id}" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-eye"></i>View Details
                </a>
            </div>
        `;
        
        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar">${userInitials}</div>
                        <div class="user-info">
                            <div class="user-name">${fullName}</div>
                            <div class="user-id">${ref.user_id}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div>
                        <div class="company-name">${companyName}</div>
                        <div class="company-type">${ref.company_profile?.business_type || 'N/A'}</div>
                    </div>
                </td>
                <td>
                    <div style="font-size: 13px;">
                        <div>${contactPhone}</div>
                        <div style="color: #9ca3af; font-size: 12px;">${ref.email || 'N/A'}</div>
                    </div>
                </td>
                <td>
                    <strong>${totalListings}</strong>
                </td>
                <td>
                    <strong>${totalSales}</strong>
                </td>
                <td>
                    ${statusBadge}
                </td>
                <td>
                    ${actionButtons}
                </td>
            </tr>
        `;
    }).join('');
}

function formatPhoneNumber(phone) {
    if (!phone || phone === '-') return '-';
    const cleaned = phone.toString().replace(/\D/g, '').slice(-10);
    if (cleaned.length === 10) {
        return cleaned.replace(/(\d{5})(\d{5})/, '+91 $1 $2');
    }
    return phone;
}

function getInitials(name) {
    if (!name) return 'R';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

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

function showError(message) {
    const tbody = document.getElementById('refurbishersTable');
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle" style="color: #ef4444;"></i>
                    <p style="color: #ef4444;">${message}</p>
                </div>
            </td>
        </tr>
    `;
    console.error('[v0] Error:', message);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/admin-logout/';
    }
}

// Export functions to window
window.InitializeAdminRefurbishers = InitializeAdminRefurbishers;
window.applyFilters = applyFilters;
window.logout = logout;
