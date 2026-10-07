let orderApiBaseUrl = "/order-api/";
let currentOrderId = null;

const MAX_CHECKS = 5;
const CHECK_INTERVAL_MS = 2000;

function showState(name) {
  ["checking", "success", "failed"].forEach((state) => {
    const element = document.getElementById(`state-${state}`);
    if (element) element.style.display = state === name ? "block" : "none";
  });
}

function formatAmount(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "-";
  return "\u20B9" + amount.toLocaleString("en-IN");
}

function showFailure(message) {
  document.getElementById("error-message").textContent = message;
  const link = document.getElementById("failed-order-link");
  if (currentOrderId) link.href = `/order-detail/?order_id=${encodeURIComponent(currentOrderId)}`;
  showState("failed");
}

function showSuccess(order) {
  const isCod = order.payment_method === "cod";
  document.getElementById("success-order-number").textContent = order.order_number || order.order_id;
  document.getElementById("success-amount").textContent = formatAmount(order.total_amount);
  document.getElementById("success-payment").textContent = isCod ? "Cash on delivery" : "Paid online";
  document.getElementById("success-message").textContent = order.email
    ? `A confirmation has been sent to ${order.email}.`
    : "Thank you for your purchase.";
  document.getElementById("view-order-link").href = `/order-detail/?order_id=${encodeURIComponent(order.order_id)}`;
  showState("success");
}

async function fetchOrder() {
  const [, result] = await callApi("GET", `${orderApiBaseUrl}${encodeURIComponent(currentOrderId)}/detail/`);
  return result && result.success ? result.data : null;
}

async function checkOrder() {
  showState("checking");

  for (let attempt = 0; attempt < MAX_CHECKS; attempt++) {
    try {
      const order = await fetchOrder();
      if (order) {
        const confirmed = order.payment_received || order.payment_method === "cod";
        if (confirmed) {
          showSuccess(order);
          return;
        }
        if (order.status === "cancelled") {
          showFailure("This order was cancelled. If you were charged, the amount will be refunded.");
          return;
        }
      }
    } catch (error) {
      console.error("Error checking order:", error);
    }
    await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL_MS));
  }

  showFailure(
    "We have not received the payment confirmation yet. If money was deducted, it will be confirmed or refunded automatically."
  );
}

function InitializeOrderSuccess(csrfToken, apiBaseUrl) {
  if (apiBaseUrl) orderApiBaseUrl = apiBaseUrl;

  currentOrderId = new URLSearchParams(window.location.search).get("order_id");
  if (!currentOrderId) {
    showFailure("We could not find your order. Please check your account for its status.");
    return;
  }

  document.getElementById("retry-check-btn").addEventListener("click", checkOrder);
  checkOrder();
}
