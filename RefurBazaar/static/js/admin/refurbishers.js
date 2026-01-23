// Admin Refurbishers Management
let csrfToken = '';
let apiUrl = '';
let allData = [];

function InitializeAdminRefurbishers(csrf, url) {
    csrfToken = csrf;
    apiUrl = url;
    
    console.log('[v0] Initializing Admin Refurbishers');
    console.log('[v0] API URL:', apiUrl);
    
    loadData();
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
}

async function loadData() {
    try {
        const [success, response] = await window.callApi('GET', apiUrl, null, csrfToken);
        
        console.log('[v0] Refurbishers API Response:', response);
        
        if (success && response.success && response.data) {
            allData = response.data;
            displayData(allData);
        } else {
            showError('Failed to load refurbishers');
        }
    } catch (error) {
        console.error('[v0] Error loading refurbishers:', error);
        showError('Failed to load refurbishers');
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filtered = allData;
    
    if (searchTerm) {
        filtered = filtered.filter(ref => 
            ref.user_id.toLowerCase().includes(searchTerm) ||
            (ref.first_name && ref.first_name.toLowerCase().includes(searchTerm)) ||
            (ref.last_name && ref.last_name.toLowerCase().includes(searchTerm)) ||
            (ref.company_profile?.company_name && ref.company_profile.company_name.toLowerCase().includes(searchTerm)) ||
            (ref.contact_number && ref.contact_number.includes(searchTerm))
        );
    }
    
    if (statusFilter) {
        if (statusFilter === 'approved') {
            filtered = filtered.filter(ref => ref.company_profile?.is_approved === true);
        } else if (statusFilter === 'pending') {
            filtered = filtered.filter(ref => 
                ref.company_profile?.is_profile_complete === true && 
                ref.company_profile?.is_approved === false
            );
        }
    }
    
    displayData(filtered);
}

function displayData(refurbishers) {
    const tbody = document.getElementById('refurbishersTable');
    
    if (refurbishers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No refurbishers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = refurbishers.map(ref => `
        <tr>
            <td><strong>${ref.user_id}</strong></td>
            <td>${ref.first_name} ${ref.last_name}</td>
            <td>${ref.company_profile?.company_name || 'N/A'}</td>
            <td>${ref.contact_number}</td>
            <td>${ref.stats?.total_listings || 0}</td>
            <td>${ref.stats?.total_sales || 0}</td>
            <td>
                <span class="badge ${ref.company_profile?.is_approved ? 'bg-success' : 'bg-warning text-dark'}">
                    ${ref.company_profile?.is_approved ? 'Approved' : 'Pending'}
                </span>
            </td>
            <td>
                <a href="/admin-refurbisher-detail/?user_id=${ref.user_id}" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-eye"></i> View
                </a>
            </td>
        </tr>
    `).join('');
}

function showError(message) {
    document.getElementById('refurbishersTable').innerHTML = `
        <tr>
            <td colspan="8" class="text-center text-danger">${message}</td>
        </tr>
    `;
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/refurbisher-logout/';
    }
}

window.InitializeAdminRefurbishers = InitializeAdminRefurbishers;
window.applyFilters = applyFilters;
window.logout = logout;

// Assuming callApi is a function declared elsewhere in the codebase
// window.callApi = function(method, url, data, csrfToken) {
//     // Implementation of callApi
// };
