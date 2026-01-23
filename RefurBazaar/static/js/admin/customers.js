// Admin Customers Management
let csrfToken = '';
let customersApiUrl = '';
let allCustomers = [];

function InitializeAdminCustomers(csrf, customers_url) {
    csrfToken = csrf;
    customersApiUrl = customers_url;
    
    console.log('[v0] Initializing Admin Customers');
    console.log('[v0] Customers URL:', customersApiUrl);
    
    loadCustomers();
    
    // Setup event listener
    document.getElementById('searchInput').addEventListener('input', applySearch);
}

async function loadCustomers() {
    try {
        const [success, response] = await window.callApi('GET', customersApiUrl, null, csrfToken);
        
        console.log('[v0] Customers API Response:', response);
        
        if (success && response.success && response.data) {
            allCustomers = response.data;
            displayCustomers(allCustomers);
        } else {
            showError('Failed to load customers');
        }
    } catch (error) {
        console.error('[v0] Error loading customers:', error);
        showError('Failed to load customers');
    }
}

function applySearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        displayCustomers(allCustomers);
        return;
    }
    
    const filtered = allCustomers.filter(customer => 
        (customer.first_name && customer.first_name.toLowerCase().includes(searchTerm)) ||
        (customer.last_name && customer.last_name.toLowerCase().includes(searchTerm)) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
        (customer.contact_number && customer.contact_number.includes(searchTerm)) ||
        (customer.user_id && customer.user_id.toLowerCase().includes(searchTerm))
    );
    
    displayCustomers(filtered);
}

function displayCustomers(customers) {
    const tbody = document.getElementById('customersTable');
    
    if (customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">No customers found</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = customers.map(customer => `
        <tr>
            <td><strong>${customer.user_id}</strong></td>
            <td>${customer.first_name} ${customer.last_name}</td>
            <td>${customer.email || 'N/A'}</td>
            <td>${customer.contact_number}</td>
            <td>${customer.stats?.total_orders || 0}</td>
            <td>₹${Number(customer.stats?.total_spent || 0).toLocaleString('en-IN')}</td>
            <td>${formatDate(customer.created_at)}</td>
            <td>
                <span class="badge ${customer.active_user ? 'bg-success' : 'bg-danger'}">
                    ${customer.active_user ? 'Active' : 'Inactive'}
                </span>
            </td>
        </tr>
    `).join('');
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

function showError(message) {
    const tbody = document.getElementById('customersTable');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center text-danger">${message}</td>
        </tr>
    `;
}

window.InitializeAdminCustomers = InitializeAdminCustomers;
window.applySearch = applySearch;
