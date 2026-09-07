// Refurbisher Order Detail Management
let orderData = null;
let verifyModal = null;
let rejectModal = null;


function InitializeRefurbisherOrderDetail(csrfToken, orderId, orderDetailUrl, verifyItemUrl, itemActionUrl) {
    window.csrfToken = csrfToken;
    window.orderId = orderId;
    window.orderDetailUrl = orderDetailUrl;
    window.verifyItemUrl = verifyItemUrl;
    window.itemActionUrl = itemActionUrl;
    
    // Initialize modals
    verifyModal = new bootstrap.Modal(document.getElementById('verifyDeviceModal'));
    rejectModal = new bootstrap.Modal(document.getElementById('rejectItemModal'));
    
    loadOrderDetail();
    setupEventListeners();
}

function setupEventListeners() {
    // Handle photo selection and preview
    document.getElementById('devicePhotos').addEventListener('change', handlePhotoSelection);
    
    // Submit verification
    document.getElementById('submitVerification').addEventListener('click', submitVerification);
    
    // Submit rejection
    document.getElementById('submitRejection').addEventListener('click', submitRejection);
}

function handlePhotoSelection(e) {
    const files = Array.from(e.target.files);
    const container = document.getElementById('photoPreviewContainer');
    
    // Limit to 5 photos
    if (files.length > 5) {
        alert('Maximum 5 photos allowed');
        e.target.value = '';
        return;
    }
    
    container.innerHTML = '';
    
    files.forEach((file, index) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const preview = document.createElement('div');
                preview.className = 'position-relative';
                preview.innerHTML = `
                    <img src="${event.target.result}" class="rounded" style="width: 100px; height: 100px; object-fit: cover;">
                    <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 remove-preview" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                container.appendChild(preview);
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Add click handlers for remove buttons
    setTimeout(() => {
        container.querySelectorAll('.remove-preview').forEach(btn => {
            btn.addEventListener('click', function() {
                const input = document.getElementById('devicePhotos');
                const dt = new DataTransfer();
                const files = Array.from(input.files);
                const index = parseInt(this.getAttribute('data-index'));
                
                files.forEach((file, i) => {
                    if (i !== index) dt.items.add(file);
                });
                
                input.files = dt.files;
                handlePhotoSelection({ target: input });
            });
        });
    }, 100);
}

async function loadOrderDetail() {
    try {
        const [success, response] = await callApi('GET', window.orderDetailUrl, null, window.csrfToken);
        
        console.log('Order Detail API Response:', response);
        
        if (success && response.success && response.data) {
            orderData = response.data;
            displayOrderDetail();
        } else {
            showError('Failed to load order details.');
        }
    } catch (error) {
        console.error('Error loading order detail:', error);
        showError('Failed to load order details. Please try again.');
    }
}

function displayOrderDetail() {
    document.getElementById('loadingState').classList.add('d-none');
    document.getElementById('orderContent').classList.remove('d-none');
    
    // Order header
    document.getElementById('orderIdDisplay').textContent = `Order #${orderData.order_number || orderData.order_id}`;
    document.getElementById('orderStatusBadge').innerHTML = getOrderStatusBadge(orderData);
    
    // Customer information
    document.getElementById('customerName').textContent = `${orderData.first_name} ${orderData.last_name}`;
    document.getElementById('customerEmail').textContent = orderData.email;
    document.getElementById('customerPhone').textContent = orderData.phone;
    document.getElementById('shippingAddress').innerHTML = `
        ${orderData.shipping_address}<br>
        ${orderData.shipping_city}, ${orderData.shipping_state} ${orderData.shipping_pincode}
    `;
    
    // Order items
    displayOrderItems();
    
    // Order summary
    const yourSubtotal = orderData.items.reduce((sum, item) => sum + parseFloat(item.price_at_purchase), 0);
    document.getElementById('yourSubtotal').textContent = `₹${yourSubtotal.toFixed(2)}`;
    document.getElementById('orderDate').textContent = formatDate(orderData.created_at);
    document.getElementById('paymentStatus').innerHTML = orderData.payment_received 
        ? '<span class="badge bg-success">Paid</span>' 
        : '<span class="badge bg-warning">Pending</span>';
}

function displayOrderItems() {
    const container = document.getElementById('orderItemsContainer');
    
    container.innerHTML = orderData.items.map((item, index) => `
        <div class="card mb-3" data-item-id="${item.id}">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-2">
                        <img src="${item.product_image || '/static/images/placeholder-product.jpg'}" 
                             alt="${item.brand_name} ${item.model_name}" 
                             class="img-fluid rounded" style="max-height: 100px;">
                    </div>
                    <div class="col-md-6">
                        <h5 class="mb-1">${item.brand_name} ${item.model_name}</h5>
                        <p class="text-muted mb-1">
                            <small>Unit #${item.listing_unit.unit_number} | Condition: ${item.condition_at_purchase}</small>
                        </p>
                        <p class="mb-1"><strong>Price:</strong> ₹${parseFloat(item.price_at_purchase).toFixed(2)}</p>
                        ${getFulfillmentStatusBadge(item)}
                        
                        ${item.device_imei ? `
                            <div class="mt-2">
                                <p class="mb-1"><strong>IMEI:</strong> ${item.device_imei}</p>
                                ${item.verification_notes ? `<p class="text-muted small mb-0">${item.verification_notes}</p>` : ''}
                            </div>
                        ` : ''}
                        
                        ${item.device_photos && item.device_photos.length > 0 ? `
                            <div class="mt-2">
                                <strong>Device Photos:</strong>
                                <div class="d-flex gap-2 mt-1">
                                    ${item.device_photos.map(photo => `
                                        <a href="${photo.photo_url}" target="_blank" class="text-decoration-none">
                                            <img src="${photo.photo_url}" alt="Device" class="rounded" style="width: 50px; height: 50px; object-fit: cover;">
                                        </a>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${item.rejection_reason ? `
                            <div class="alert alert-danger mt-2 mb-0">
                                <strong>Rejection Reason:</strong> ${item.rejection_reason}
                            </div>
                        ` : ''}
                    </div>
                    <div class="col-md-4 text-end">
                        ${getItemActions(item)}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add event listeners for action buttons
    setupItemActionListeners();
}

function getItemActions(item) {
    if (item.fulfillment_status === 'rejected') {
        return '<span class="text-danger"><i class="fas fa-times-circle me-1"></i>Rejected</span>';
    }
    
    if (item.fulfillment_status === 'delivered') {
        return '<span class="text-success"><i class="fas fa-check-circle me-1"></i>Delivered</span>';
    }
    
    if (item.fulfillment_status === 'packed') {
        return '<span class="text-primary"><i class="fas fa-box me-1"></i>Packed</span>';
    }
    
    let actions = '';
    
    if (item.fulfillment_status === 'pending') {
        actions += `
            <button class="btn btn-primary btn-sm mb-2 w-100 verify-device-btn" data-item-id="${item.id}">
                <i class="fas fa-check-circle me-2"></i>Verify Device
            </button>
        `;
    }
    
    if (item.fulfillment_status === 'device_verified') {
        actions += `
            <button class="btn btn-success btn-sm mb-2 w-100 pack-item-btn" data-item-id="${item.id}">
                <i class="fas fa-box me-2"></i>Mark as Packed
            </button>
        `;
    }
    
    if (item.fulfillment_status !== 'packed' && item.fulfillment_status !== 'shipped') {
        actions += `
            <button class="btn btn-outline-danger btn-sm w-100 reject-item-btn" data-item-id="${item.id}">
                <i class="fas fa-times-circle me-2"></i>Reject Item
            </button>
        `;
    }
    
    return actions;
}

function setupItemActionListeners() {
    // Verify device buttons
    document.querySelectorAll('.verify-device-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-item-id');
            openVerifyModal(itemId);
        });
    });
    
    // Pack item buttons
    document.querySelectorAll('.pack-item-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-item-id');
            packItem(itemId);
        });
    });
    
    // Reject item buttons
    document.querySelectorAll('.reject-item-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-item-id');
            openRejectModal(itemId);
        });
    });
}

function openVerifyModal(itemId) {
    document.getElementById('verifyItemId').value = itemId;
    document.getElementById('deviceIMEI').value = '';
    document.getElementById('verificationNotes').value = '';
    document.getElementById('devicePhotos').value = '';
    document.getElementById('photoPreviewContainer').innerHTML = '';
    
    verifyModal.show();
}



async function submitVerification() {
    const itemId = document.getElementById('verifyItemId').value;
    const deviceIMEI = document.getElementById('deviceIMEI').value.trim();
    const verificationNotes = document.getElementById('verificationNotes').value.trim();
    const photosInput = document.getElementById('devicePhotos');
    
    if (!deviceIMEI) {
        alert('Please enter IMEI or identification number');
        return;
    }
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('device_imei', deviceIMEI);
    formData.append('verification_notes', verificationNotes);
    
    // Add photos
    const files = photosInput.files;
    for (let i = 0; i < files.length; i++) {
        formData.append('device_photos', files[i]);
    }
    
    try {
        const url = window.verifyItemUrl.replace('{item_id}', itemId);
        
        // Use fetch directly for FormData upload
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-CSRFToken': window.csrfToken
            },
            body: formData
        });
        
        const data = await response.json();
        
        console.log('Verify Device API Response:', data);
        
        if (response.ok && data.success) {
            verifyModal.hide();
            showSuccess('Device verified successfully!');
            loadOrderDetail(); // Reload to show updated data
        } else {
            alert('Failed to verify device: ' + JSON.stringify(data.error));
        }
    } catch (error) {
        console.error('Error verifying device:', error);
        alert('Failed to verify device. Please try again.');
    }
}

async function packItem(itemId) {
    if (!confirm('Are you sure you want to mark this item as packed?')) {
        return;
    }
    
    try {
        const url = window.itemActionUrl.replace('{item_id}', itemId);
        const [success, response] = await callApi('POST', url, { action: 'pack' }, window.csrfToken);
        
        console.log('Pack Item API Response:', response);
        
        if (success && response.success) {
            showSuccess('Item marked as packed!');
            loadOrderDetail();
        } else {
            alert('Failed to pack item: ' + JSON.stringify(response.error));
        }
    } catch (error) {
        console.error('Error packing item:', error);
        alert('Failed to pack item. Please try again.');
    }
}

function openRejectModal(itemId) {
    document.getElementById('rejectItemId').value = itemId;
    document.getElementById('rejectionReason').value = '';
    rejectModal.show();
}

async function submitRejection() {
    const itemId = document.getElementById('rejectItemId').value;
    const rejectionReason = document.getElementById('rejectionReason').value.trim();
    
    if (!rejectionReason) {
        alert('Please provide a reason for rejection');
        return;
    }
    
    try {
        const url = window.itemActionUrl.replace('{item_id}', itemId);
        const [success, response] = await callApi('POST', url, {
            action: 'reject',
            rejection_reason: rejectionReason
        }, window.csrfToken);
        
        console.log('Reject Item API Response:', response);
        
        if (success && response.success) {
            rejectModal.hide();
            showSuccess('Item rejected successfully!');
            loadOrderDetail();
        } else {
            alert('Failed to reject item: ' + JSON.stringify(response.error));
        }
    } catch (error) {
        console.error('Error rejecting item:', error);
        alert('Failed to reject item. Please try again.');
    }
}

function getFulfillmentStatusBadge(item) {
    const statusMap = {
        'pending': '<span class="badge bg-secondary">Pending Verification</span>',
        'device_verified': '<span class="badge bg-warning">Device Verified</span>',
        'packed': '<span class="badge bg-primary">Packed</span>',
        'shipped': '<span class="badge bg-info">Shipped</span>',
        'delivered': '<span class="badge bg-success">Delivered</span>',
        'rejected': '<span class="badge bg-danger">Rejected</span>'
    };
    
    return statusMap[item.fulfillment_status] || '<span class="badge bg-secondary">Unknown</span>';
}

function getOrderStatusBadge(order) {
    const statusMap = {
        'pending': '<i class="fas fa-clock me-1"></i>Pending',
        'confirmed': '<i class="fas fa-check me-1"></i>Confirmed',
        'processing': '<i class="fas fa-cog me-1"></i>Processing',
        'shipped': '<i class="fas fa-shipping-fast me-1"></i>Shipped',
        'delivered': '<i class="fas fa-check-circle me-1"></i>Delivered',
        'cancelled': '<i class="fas fa-times-circle me-1"></i>Cancelled'
    };
    
    return statusMap[order.status] || order.status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function showError(message) {
    document.getElementById('loadingState').innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i>${message}
        </div>
    `;
}

function showSuccess(message) {
    // Create temporary success alert
    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    alert.style.zIndex = '9999';
    alert.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

// Export for use in HTML
window.InitializeRefurbisherOrderDetail = InitializeRefurbisherOrderDetail;
