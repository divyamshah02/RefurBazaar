let csrf_token = null;
let profile_url = null;
let update_profile_url = null;
let orders_url = null;
let addresses_url = null;

// User data
let userData = null;
let userOrders = [];
let userAddresses = [];


async function InitializeAccount(
  csrfTokenParam,
  profileUrlParam,
  updateProfileUrlParam,
  ordersUrlParam,
  addressesUrlParam
) {
  csrf_token = csrfTokenParam;
  profile_url = profileUrlParam;
  update_profile_url = updateProfileUrlParam;
  orders_url = ordersUrlParam;
  addresses_url = addressesUrlParam;

  try {
    // Check if user is logged in first
    const loginCheck = await checkUserLoginStatus();
    if (!loginCheck) {
      showOTPLoginModal();
      return;
    }

    // Load user profile data
    await loadUserProfile();

    // Initialize event listeners
    initializeEventListeners();

    // Load initial section (profile)
    showSection("profile");
  } catch (error) {
    console.error("Error initializing account:", error);
    alert("Error loading account data.");
  }
}

// OTP Login Functions
let currentOtpId = null;

async function checkUserLoginStatus() {
  try {
    const [success, result] = await callApi("GET", "/user-api/user-detail-api/");
    return success && result.success && !result.user_not_logged_in;
  } catch (error) {
    console.error("Error checking login status:", error);
    return false;
  }
}

function showOTPLoginModal() {
  const modal = new bootstrap.Modal(document.getElementById("otpLoginModal"));
  modal.show();
}

async function sendOTP() {
  const mobileNumber = document.getElementById("mobileNumber").value.trim();

  if (!mobileNumber || mobileNumber.length !== 10 || !/^\d+$/.test(mobileNumber)) {
    document.getElementById("mobileNumber").classList.add("is-invalid");
    document.getElementById("mobileError").textContent = "Please enter a valid 10-digit mobile number";
    return;
  }

  document.getElementById("mobileNumber").classList.remove("is-invalid");
  document.getElementById("sendOtpLoader").style.display = "inline-block";
  document.getElementById("sendOtpText").textContent = "Sending...";

  try {
    const [success, result] = await callApi(
      "POST",
      "/user-api/otp-api/",
      {
        mobile: mobileNumber,
      },
      csrf_token
    );

    if (success && result.success) {
      currentOtpId = result.data.otp_id;
      document.getElementById("displayMobile").textContent = mobileNumber;
      document.getElementById("mobile-input-section").style.display = "none";
      document.getElementById("otp-input-section").style.display = "block";
      alert("OTP sent successfully!");
    } else {
      throw new Error(result.error || "Failed to send OTP");
    }
  } catch (error) {
    console.error("Error sending OTP:", error);
    alert("Error sending OTP. Please try again.");
  } finally {
    document.getElementById("sendOtpLoader").style.display = "none";
    document.getElementById("sendOtpText").textContent = "Send OTP";
  }
}

async function verifyOTP() {
  const otpCode = document.getElementById("otpCode").value.trim();

  if (!otpCode || otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
    document.getElementById("otpCode").classList.add("is-invalid");
    document.getElementById("otpError").textContent = "Please enter a valid 6-digit OTP";
    return;
  }

  document.getElementById("otpCode").classList.remove("is-invalid");
  document.getElementById("verifyOtpLoader").style.display = "inline-block";
  document.getElementById("verifyOtpText").textContent = "Verifying...";

  try {
    const [success, result] = await callApi(
      "PUT",
      `/user-api/otp-api/${currentOtpId}/`,
      {
        otp: otpCode,
        role: "customer"
      },
      csrf_token
    );

    if (success && result.success && result.data.otp_verified) {
      alert("Login successful!");

      // Close modal and reload page
      bootstrap.Modal.getInstance(document.getElementById("otpLoginModal")).hide();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      const message = result.data?.message || "Invalid OTP";
      document.getElementById("otpCode").classList.add("is-invalid");
      document.getElementById("otpError").textContent = message;
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    alert("Error verifying OTP. Please try again.");
  } finally {
    document.getElementById("verifyOtpLoader").style.display = "none";
    document.getElementById("verifyOtpText").textContent = "Verify OTP";
  }
}

function goBackToMobile() {
  document.getElementById("otp-input-section").style.display = "none";
  document.getElementById("mobile-input-section").style.display = "block";
  document.getElementById("otpCode").value = "";
  document.getElementById("otpCode").classList.remove("is-invalid");
}

async function loadUserProfile() {
  try {
    const [success, result] = await callApi("GET", profile_url);

    if (success && result.success) {
      userData = result.data.user || {};
      populateProfileForm();
    } else {
      throw new Error(result.error || "Failed to load profile");
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    alert("Error loading profile data.");
  }
}

function populateProfileForm() {
  if (!userData) return;

  // Populate profile form fields
  if (userData.first_name) document.getElementById("firstName").value = userData.first_name;
  if (userData.last_name) document.getElementById("lastName").value = userData.last_name;
  if (userData.email) document.getElementById("email").value = userData.email;
  if (userData.contact_number) document.getElementById("phone").value = userData.contact_number;
}

async function loadUserOrders() {
  try {
    const [success, result] = await callApi("GET", orders_url);

    if (success && result.success) {
      userOrders = result.data || [];
      renderOrders();
    } else {
      throw new Error(result.error || "Failed to load orders");
    }
  } catch (error) {
    console.error("Error loading orders:", error);
    alert("Error loading orders.");
  }
}

function renderOrders() {
  const ordersContainer = document.getElementById("orders-list");

  if (!userOrders || userOrders.length === 0) {
    ordersContainer.innerHTML = `
      <div class="text-center py-5">
        <i class="fas fa-shopping-bag fa-3x text-muted mb-3"></i>
        <h5>No orders found</h5>
        <p class="text-muted">You haven't placed any orders yet.</p>
        <a href="/shop/" class="btn btn-primary">Start Shopping</a>
      </div>
    `;
    return;
  }

  ordersContainer.innerHTML = userOrders
    .map(
      (order) => `
    <div class="card order-card mb-3">
      <div class="card-body">
        <div class="row align-items-center">
          <div class="col-md-3">
            <h6 class="mb-1 fw-bold">Order #${order.order_id}</h6>
            <small class="text-muted">${formatDate(order.created_at)}</small>
          </div>
          <div class="col-md-2">
            <span class="badge status-badge ${getStatusBadgeClass(order.status)}">${getStatusText(order.status)}</span>
          </div>
          <div class="col-md-2">
            <strong style="font-size: 1.1rem;">₹${parseFloat(order.total_amount).toFixed(2)}</strong>
          </div>
          <div class="col-md-2">
            <small class="text-muted">${order.payment_method === "cod" ? "Cash on Delivery" : "Online Payment"}</small>
          </div>
          <div class="col-md-3 text-end">
            <a href="/order-detail/?order_id=${order.order_id}" class="btn btn-outline-primary btn-sm">
              <i class="fas fa-eye me-1"></i>View Details
            </a>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

async function loadUserAddresses() {
  try {
    // For now, using empty array since Address API needs to be implemented
    userAddresses = [];
    renderAddresses();
  } catch (error) {
    console.error("Error loading addresses:", error);
    alert("Error loading addresses.");
  }
}

function renderAddresses() {
  const addressesContainer = document.getElementById("addresses-list");

  if (!userAddresses || userAddresses.length === 0) {
    addressesContainer.innerHTML = `
      <div class="col-12">
        <div class="text-center py-5">
          <i class="fas fa-map-marker-alt fa-3x text-muted mb-3"></i>
          <h5>No addresses found</h5>
          <p class="text-muted">Add your first delivery address.</p>
          <button class="btn btn-primary" onclick="showAddAddressModal()">Add Address</button>
        </div>
      </div>
    `;
    return;
  }

  addressesContainer.innerHTML = userAddresses
    .map(
      (address) => `
    <div class="col-md-6">
      <div class="card address-card h-100">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h6 class="mb-0 fw-bold">${address.address_name || "Address"}</h6>
            ${address.is_default ? '<span class="badge bg-success">Default</span>' : ""}
          </div>
          <p class="mb-2">${address.address_line}</p>
          <p class="mb-2">${address.city}, ${address.state} - ${address.pincode}</p>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-primary btn-sm" onclick="editAddress(${address.id})">
              <i class="fas fa-edit me-1"></i>Edit
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="deleteAddress(${address.id})">
              <i class="fas fa-trash me-1"></i>Delete
            </button>
            ${
              !address.is_default
                ? `
              <button class="btn btn-outline-success btn-sm" onclick="setDefaultAddress(${address.id})">
                <i class="fas fa-star me-1"></i>Set Default
              </button>
            `
                : ""
            }
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

function initializeEventListeners() {
  // Sidebar navigation
  document.querySelectorAll("[data-section]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const section = e.target.closest('[data-section]').getAttribute("data-section");
      showSection(section);
    });
  });

  // Profile form submission
  document.getElementById("profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await updateProfile();
  });

  // Order filter change
  document.getElementById("orderFilter").addEventListener("change", (e) => {
    loadUserOrders();
  });

  // Address form submission
  document.getElementById("address-form").addEventListener("submit", (e) => {
    e.preventDefault();
    saveAddress();
  });
}

function showSection(sectionName) {
  // Hide all sections
  document.querySelectorAll(".account-section").forEach((section) => {
    section.style.display = "none";
  });

  // Remove active class from all sidebar links
  document.querySelectorAll("[data-section]").forEach((link) => {
    link.classList.remove("active");
  });

  // Show selected section
  document.getElementById(`${sectionName}-section`).style.display = "block";

  // Add active class to selected sidebar link
  document.querySelector(`[data-section="${sectionName}"]`).classList.add("active");

  // Load section-specific data
  switch (sectionName) {
    case "orders":
      loadUserOrders();
      break;
    case "addresses":
      loadUserAddresses();
      break;
  }
}

async function updateProfile() {
  try {
    const profileData = {
      first_name: document.getElementById("firstName").value,
      last_name: document.getElementById("lastName").value,
      email: document.getElementById("email").value,
    };

    const [success, result] = await callApi(
      "PUT",
      `${update_profile_url}${userData.user_id}/`,
      profileData,
      csrf_token
    );

    if (success && result.success) {
      alert("Profile updated successfully!");
      userData = { ...userData, ...profileData };
    } else {
      throw new Error(result.error || "Failed to update profile");
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    alert("Error updating profile. Please try again.");
  }
}

function showAddAddressModal() {
  // Clear form
  document.getElementById("address-form").reset();
  document.getElementById("addressId").value = "";
  document.getElementById("addAddressModalLabel").textContent = "Add New Address";

  // Show modal
  const modal = new bootstrap.Modal(document.getElementById("addAddressModal"));
  modal.show();
}

function editAddress(addressId) {
  const address = userAddresses.find((addr) => addr.id === addressId);
  if (!address) return;

  // Populate form with address data
  document.getElementById("addressId").value = address.id;
  document.getElementById("addressName").value = address.address_name || "";
  document.getElementById("addressLine").value = address.address_line || "";
  document.getElementById("addressCity").value = address.city || "";
  document.getElementById("addressState").value = address.state || "";
  document.getElementById("addressPincode").value = address.pincode || "";
  document.getElementById("isDefaultAddress").checked = address.is_default || false;

  document.getElementById("addAddressModalLabel").textContent = "Edit Address";

  // Show modal
  const modal = new bootstrap.Modal(document.getElementById("addAddressModal"));
  modal.show();
}

async function saveAddress() {
  try {
    const addressData = {
      address_name: document.getElementById("addressName").value,
      address_line: document.getElementById("addressLine").value,
      city: document.getElementById("addressCity").value,
      state: document.getElementById("addressState").value,
      pincode: document.getElementById("addressPincode").value,
      is_default: document.getElementById("isDefaultAddress").checked,
    };

    const addressId = document.getElementById("addressId").value;
    const isEdit = addressId !== "";

    // For now, just close modal since Address API needs to be implemented
    alert("Address save functionality will be implemented soon!");
    bootstrap.Modal.getInstance(document.getElementById("addAddressModal")).hide();
  } catch (error) {
    console.error("Error saving address:", error);
    alert("Error saving address. Please try again.");
  }
}

async function deleteAddress(addressId) {
  if (!confirm("Are you sure you want to delete this address?")) {
    return;
  }

  try {
    alert("Address delete functionality will be implemented soon!");
  } catch (error) {
    console.error("Error deleting address:", error);
    alert("Error deleting address. Please try again.");
  }
}

async function setDefaultAddress(addressId) {
  try {
    alert("Set default address functionality will be implemented soon!");
  } catch (error) {
    console.error("Error setting default address:", error);
    alert("Error setting default address. Please try again.");
  }
}

async function logout() {
  if (!confirm("Are you sure you want to logout?")) {
    return;
  }

  try {
    // Clear session and redirect to home
    window.location.href = "/";
  } catch (error) {
    console.error("Error logging out:", error);
    alert("Error logging out. Please try again.");
  }
}

// Utility functions
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}

function getStatusText(status) {
  const statusMap = {
    pending: "Pending",
    confirmed: "Confirmed",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return statusMap[status] || status;
}

function getStatusBadgeClass(status) {
  const classMap = {
    pending: "bg-warning",
    confirmed: "bg-primary",
    processing: "bg-info",
    shipped: "bg-success",
    delivered: "bg-success",
    cancelled: "bg-danger",
  };
  return classMap[status] || "bg-secondary";
}
