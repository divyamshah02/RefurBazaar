// Admin Order Detail Management
let csrfToken = '';
let orderDetailUrl = '';
let updateStatusUrl = '';
let currentOrder = null;

function InitializeOrderDetail(csrf, detail_url, status_url) {
    csrfToken = csrf;
    orderDetailUrl = detail_url;
    updateStatusUrl = status_url;
    
    loadOrderDetail();
}

async function loadOrderDetail() {
    try {
        const [success, response] = await window.callApi('GET', orderDetailUrl, null, csrfToken);
        
        console.log('[v0] Order Detail Response:', response);
        
        if (success && response.success && response.data) {
            currentOrder = response.data;
            displayOrderDetail(currentOrder);
        } else {
            alert('Failed to load order details');
        }
    } catch (error) {
        console.error('[v0] Error loading order:', error);
        alert('Error loading order details');
    }
}

function displayOrderDetail(order) {
    // Update title and order ID
    document.getElementById('orderTitle').textContent = `Order ${order.order_id}`;
    document.getElementById('orderId').textContent = order.order_id;
    document.getElementById('orderDate').textContent = formatDate(order.created_at);
    
    // Customer Info
    document.getElementById('customerName').textContent = `${order.first_name} ${order.last_name}`;
    document.getElementById('customerEmail').textContent = order.email || 'N/A';
    document.getElementById('customerPhone').textContent = order.phone || 'N/A';
    
    // Shipping Address
    const shippingAddr = `${order.shipping_address}, ${order.shipping_city}, ${order.shipping_state} - ${order.shipping_pincode}`;
    document.getElementById('shippingAddress').textContent = shippingAddr;
    
    // Payment Info
    document.getElementById('paymentMethod').innerHTML = `<span class="badge bg-info">${order.payment_method_display}</span>`;
    document.getElementById('paymentStatus').innerHTML = `<span class="badge ${order.payment_received ? 'bg-success' : 'bg-warning'}">${order.payment_received ? 'Paid' : 'Pending'}</span>`;
    
    // Order Status
    document.getElementById('orderStatusSelect').value = order.status;
    
    // Order Summary
    document.getElementById('subtotal').textContent = `₹${Number(order.subtotal_amount).toLocaleString('en-IN')}`;
    document.getElementById('taxAmount').textContent = `₹${Number(order.tax_amount).toLocaleString('en-IN')}`;
    document.getElementById('deliveryCharge').textContent = `₹${Number(order.delivery_charge).toLocaleString('en-IN')}`;
    document.getElementById('discountAmount').textContent = `-₹${Number(order.discount_amount).toLocaleString('en-IN')}`;
    document.getElementById('totalAmount').textContent = `₹${Number(order.total_amount).toLocaleString('en-IN')}`;
    
    // Payment Details (if Razorpay)
    if (order.payment_method === 'razorpay' && order.razorpay_order_id) {
        document.getElementById('paymentInfoCard').style.display = 'block';
        document.getElementById('razorpayOrderId').textContent = order.razorpay_order_id || 'N/A';
        document.getElementById('razorpayPaymentId').textContent = order.razorpay_payment_id || 'N/A';
    }
    
    // Display Order Items
    displayOrderItems(order.items || []);
}

function displayOrderItems(items) {
    const tbody = document.getElementById('orderItemsTable');
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No items found</td></tr>';
        return;
    }
    
    tbody.innerHTML = items.map(item => `
        <tr>
            <td>
                <strong>${item.brand_name} ${item.model_name}</strong><br>
                <small class="text-muted">Unit #${item.listing_unit.unit_number}</small>
            </td>
            <td>${item.refurbisher_name}</td>
            <td><span class="badge bg-secondary">${item.condition_at_purchase}</span></td>
            <td>₹${Number(item.price_at_purchase).toLocaleString('en-IN')}</td>
            <td><span class="badge ${getFulfillmentBadgeClass(item.fulfillment_status)}">${item.fulfillment_status_display}</span></td>
        </tr>
    `).join('');
}

async function updateOrderStatus() {
    const newStatus = document.getElementById('orderStatusSelect').value;
    
    if (!confirm(`Are you sure you want to change order status to "${newStatus}"?`)) {
        return;
    }
    
    try {
        const [success, response] = await window.callApi('POST', updateStatusUrl, { status: newStatus }, csrfToken);
        
        if (success && response.success) {
            alert('Order status updated successfully');
            loadOrderDetail(); // Reload to get updated data
        } else {
            alert(response.error || 'Failed to update order status');
        }
    } catch (error) {
        console.error('[v0] Error updating status:', error);
        alert('Error updating order status');
    }
}

function getFulfillmentBadgeClass(status) {
    const classes = {
        'pending': 'bg-warning text-dark',
        'device_verified': 'bg-info',
        'packed': 'bg-primary',
        'shipped': 'bg-success',
        'delivered': 'bg-success',
        'rejected': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Export for HTML usage
window.InitializeOrderDetail = InitializeOrderDetail;
window.updateOrderStatus = updateOrderStatus;
