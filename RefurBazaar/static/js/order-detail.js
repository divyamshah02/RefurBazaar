let csrf_token = null;
let order_id = null;
let order_detail_url = null;
let order_api_base_url = "/order-api/";

// Order data
let orderData = null;
// The order-item id currently targeted by the return-request modal
let activeReturnItemId = null;

async function InitializeOrderDetail(
  csrfTokenParam,
  orderIdParam,
  orderDetailUrlParam,
  orderApiBaseUrlParam
) {
  csrf_token = csrfTokenParam;
  order_id = orderIdParam;
  order_detail_url = orderDetailUrlParam;
  if (orderApiBaseUrlParam) {
    order_api_base_url = orderApiBaseUrlParam;
  }

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

  // Tracking timeline + courier info
  populateTrackingTimeline();

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

// Ordered progression of the happy-path statuses shown in the timeline.
// "cancelled" is handled separately since it can interrupt the flow at any point.
const TRACKING_STEPS = [
  { key: "confirmed", label: "Order Confirmed", icon: "fa-check" },
  { key: "processing", label: "Processing", icon: "fa-box-open" },
  { key: "shipped", label: "Shipped", icon: "fa-truck" },
  { key: "delivered", label: "Delivered", icon: "fa-house" },
];

function populateTrackingTimeline() {
  const container = document.getElementById("tracking-timeline-container");
  const infoBox = document.getElementById("tracking-info-box");
  const emptyMessage = document.getElementById("tracking-empty-message");
  const cancelledMessage = document.getElementById("tracking-cancelled-message");
  if (!container) return;

  const status = orderData.status;

  if (status === "cancelled") {
    container.innerHTML = "";
    infoBox.style.display = "none";
    emptyMessage.style.display = "none";
    cancelledMessage.style.display = "block";
    return;
  }
  cancelledMessage.style.display = "none";

  // "pending" (awaiting payment) has no meaningful progress yet on the shipping timeline
  const currentIndex = TRACKING_STEPS.findIndex((step) => step.key === status);

  container.innerHTML = `
    <div class="tracking-timeline">
      ${TRACKING_STEPS.map((step, index) => {
        let stateClass = "";
        if (currentIndex === -1) {
          stateClass = "";
        } else if (index < currentIndex) {
          stateClass = "completed";
        } else if (index === currentIndex) {
          stateClass = "completed current";
        }

        const dateLabel =
          step.key === "delivered" && orderData.delivered_at && index <= currentIndex
            ? formatDate(orderData.delivered_at)
            : "";

        return `
          <div class="tracking-step ${stateClass}">
            <div class="tracking-step-line"></div>
            <div class="tracking-step-dot"><i class="fas ${step.icon}"></i></div>
            <div class="tracking-step-label">${step.label}</div>
            ${dateLabel ? `<div class="tracking-step-date">${dateLabel}</div>` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;

  const hasTrackingInfo = orderData.tracking_number || orderData.courier_name || orderData.tracking_url;
  if (hasTrackingInfo) {
    infoBox.style.display = "block";
    emptyMessage.style.display = "none";
    document.getElementById("tracking-courier-name").textContent = orderData.courier_name || "-";
    document.getElementById("tracking-number-value").textContent = orderData.tracking_number || "-";

    const trackingUrlLink = document.getElementById("tracking-url-link");
    if (orderData.tracking_url) {
      trackingUrlLink.href = orderData.tracking_url;
      trackingUrlLink.style.display = "inline-block";
    } else {
      trackingUrlLink.style.display = "none";
    }
  } else {
    infoBox.style.display = "none";
    emptyMessage.style.display = currentIndex === -1 || currentIndex < TRACKING_STEPS.length - 1 ? "block" : "none";
  }
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
                    ${item.has_extended_warranty ? `<br><small class="text-muted"><i class="fas fa-shield-alt me-1"></i>Extended Warranty included</small>` : ""}
                    <div class="order-item-actions">
                        ${getReturnActionMarkup(item)}
                    </div>
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

function getReturnActionMarkup(item) {
  const brandModel = `${item.brand_name} ${item.model_name}`.replace(/'/g, "&apos;");

  if (item.return_status === "requested") {
    return `<span class="return-status-badge" style="background: #FEF3C7; color: #92400E;"><i class="fas fa-clock me-1"></i>Return Requested</span>`
  }
  if (item.return_status === "approved") {
    return `<span class="return-status-badge" style="background: #DBEAFE; color: #1D4ED8;"><i class="fas fa-check-circle me-1"></i>Return Approved</span>`
  }
  if (item.return_status === "rejected") {
    return `<span class="return-status-badge" style="background: #FEE2E2; color: #B91C1C;"><i class="fas fa-times-circle me-1"></i>Return Rejected</span>`
  }
  if (item.return_status === "completed") {
    return `<span class="return-status-badge" style="background: #DCFCE7; color: #15803D;"><i class="fas fa-check-double me-1"></i>Return Completed</span>`
  }
  if (item.is_return_eligible) {
    return `<button type="button" class="btn btn-outline-primary btn-sm" onclick="openReturnRequestModal(${item.id}, '${brandModel}')">
              <i class="fas fa-undo me-1"></i>Request Return
            </button>`
  }
  return "";
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

  // Return request form
  const returnForm = document.getElementById("returnRequestForm");
  if (returnForm) {
    returnForm.addEventListener("submit", handleReturnRequestSubmit);
  }
}

function downloadInvoice() {
  // Implement invoice download functionality
  alert("Invoice download functionality will be implemented soon!");
}

function openReturnRequestModal(orderItemId, brandModel) {
  activeReturnItemId = orderItemId;

  const itemNameEl = document.getElementById("returnRequestItemName");
  if (itemNameEl) {
    itemNameEl.textContent = `Item: ${brandModel}`;
  }

  const reasonInput = document.getElementById("returnReasonInput");
  if (reasonInput) {
    reasonInput.value = "";
    reasonInput.classList.remove("is-invalid");
  }

  const modalEl = document.getElementById("returnRequestModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

async function handleReturnRequestSubmit(event) {
  event.preventDefault();

  if (!activeReturnItemId) return;

  const reasonInput = document.getElementById("returnReasonInput");
  const reason = reasonInput.value.trim();
  const submitBtn = document.getElementById("submitReturnRequestBtn");

  if (reason.length < 10) {
    reasonInput.classList.add("is-invalid");
    document.getElementById("returnReasonError").textContent = "Please describe the issue in at least 10 characters.";
    return;
  }
  reasonInput.classList.remove("is-invalid");

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const url = `${order_api_base_url}${activeReturnItemId}/request-return/`;
    const [success, result] = await callApi("POST", url, { reason }, csrf_token);

    if (success && result.success) {
      const modalEl = document.getElementById("returnRequestModal");
      bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      await loadOrderDetails();
    } else {
      const errorMessage =
        (result && result.error && typeof result.error === "object"
          ? Object.values(result.error).flat().join(" ")
          : result && result.error) || "Failed to submit return request.";
      reasonInput.classList.add("is-invalid");
      document.getElementById("returnReasonError").textContent = errorMessage;
    }
  } catch (error) {
    console.error("Error submitting return request:", error);
    reasonInput.classList.add("is-invalid");
    document.getElementById("returnReasonError").textContent = "Something went wrong. Please try again.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Request";
  }
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
