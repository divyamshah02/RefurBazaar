let csrf_token = null;
let order_id = null;
let order_detail_url = null;

// Order data
let orderData = null;

async function InitializeOrderDetail(
  csrfTokenParam,
  orderIdParam,
  orderDetailUrlParam
) {
  csrf_token = csrfTokenParam;
  order_id = orderIdParam;
  order_detail_url = orderDetailUrlParam;

  try {
    // Load order details
    await loadOrderDetails();

    // Initialize event listeners
    initializeEventListeners();
  } catch (error) {
    console.error("Error initializing order detail:", error);
    alert("Error loading order details.");
  }
}

async function loadOrderDetails() {
  try {
    const [success, result] = await callApi("GET", order_detail_url);

    if (success && result.success) {
      orderData = result.data;
      populateOrderDetails();
    } else {
      throw new Error(result.error || "Failed to load order details");
    }
  } catch (error) {
    console.error("Error loading order details:", error);
    alert("Error loading order details.");
  }
}

function populateOrderDetails() {
  if (!orderData) return;

  // Update page title and header
  document.getElementById("order-id").textContent = orderData.order_id;

  // Order basic information
  document.getElementById("order-date").textContent = formatDate(orderData.created_at);

  // Payment information
  document.getElementById("payment-method").textContent = getPaymentMethodText(orderData.payment_method);
  
  const paymentStatusBadge = document.getElementById("payment-status-badge");
  if (orderData.payment_received) {
    paymentStatusBadge.textContent = "Paid";
    paymentStatusBadge.className = "badge bg-success";
  } else {
    paymentStatusBadge.textContent = "Pending";
    paymentStatusBadge.className = "badge bg-warning";
  }
  
  document.getElementById("total-amount").textContent = `₹${parseFloat(orderData.total_amount).toFixed(2)}`;

  // Order status
  updateOrderStatus(orderData.status);

  // Populate order items
  populateOrderItems();

  // Populate addresses
  populateAddresses();

  // Populate order summary
  populateOrderSummary();
}

function updateOrderStatus(status) {
  const statusBadge = document.getElementById("order-status-badge");
  const statusConfig = getStatusConfig(status);

  statusBadge.textContent = statusConfig.text;
  statusBadge.className = `badge fs-5 px-4 py-2 ${statusConfig.class}`;
  statusBadge.style.borderRadius = "50px";
}

function getStatusConfig(status) {
  const configs = {
    pending: { text: "Pending Payment", class: "bg-warning" },
    confirmed: { text: "Confirmed", class: "bg-primary" },
    processing: { text: "Processing", class: "bg-info" },
    shipped: { text: "Shipped", class: "bg-success" },
    delivered: { text: "Delivered", class: "bg-success" },
    cancelled: { text: "Cancelled", class: "bg-danger" },
  };
  return configs[status] || { text: status, class: "bg-secondary" };
}

function populateOrderItems() {
  const container = document.getElementById("order-items-container");

  if (!orderData.items || orderData.items.length === 0) {
    container.innerHTML = '<p class="text-muted">No items found.</p>';
    return;
  }

  container.innerHTML = orderData.items
    .map(
      (item) => `
        <div class="order-item">
            <div class="row align-items-center">
                <div class="col-md-2">
                    <img src="${item.product_image || "/static/images/placeholder-product.jpg"}" 
                         alt="${item.model_name}" class="product-image img-fluid">
                </div>
                <div class="col-md-6">
                    <h6 class="mb-1">${item.brand_name} ${item.model_name}</h6>
                    <small class="text-muted">Condition: ${item.condition_at_purchase}</small><br>
                    <small class="text-muted">Seller: ${item.refurbisher_name}</small>
                </div>
                <div class="col-md-4 text-md-end">
                    <strong style="font-size: 1.1rem;">₹${parseFloat(item.price_at_purchase).toFixed(2)}</strong>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

function populateAddresses() {
  // Shipping address
  const shippingContainer = document.getElementById("shipping-address");
  shippingContainer.innerHTML = `
        <p class="mb-1"><strong>${orderData.first_name} ${orderData.last_name}</strong></p>
        <p class="mb-1">${orderData.shipping_address}</p>
        <p class="mb-1">${orderData.shipping_city}, ${orderData.shipping_state} - ${orderData.shipping_pincode}</p>
        <p class="mb-0">Phone: ${orderData.phone}</p>
    `;
}

function populateOrderSummary() {
  const subtotal = parseFloat(orderData.subtotal_amount);
  const deliveryCharges = parseFloat(orderData.delivery_charge || 0);
  const tax = parseFloat(orderData.tax_amount || 0);
  const total = parseFloat(orderData.total_amount);

  document.getElementById("summary-subtotal").textContent = `₹${subtotal.toFixed(2)}`;
  document.getElementById("summary-delivery").textContent =
    deliveryCharges === 0 ? "Free" : `₹${deliveryCharges.toFixed(2)}`;
  document.getElementById("summary-tax").textContent = `₹${tax.toFixed(2)}`;
  document.getElementById("summary-total").textContent = `₹${total.toFixed(2)}`;
}

function initializeEventListeners() {
  // Download invoice button
  document.getElementById("download-invoice-btn").addEventListener("click", downloadInvoice);
}

function downloadInvoice() {
  // Implement invoice download functionality
  alert("Invoice download functionality will be implemented soon!");
}

// Utility functions
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString("en-US", options);
}

function getPaymentMethodText(method) {
  const methods = {
    cod: "Cash on Delivery",
    razorpay: "Online Payment (Razorpay)",
  };
  return methods[method] || method;
}
