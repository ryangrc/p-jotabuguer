(function () {
  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function normalizePhone(phone) {
    return String(phone || "").replace(/\D/g, "");
  }

  function normalizeCustomer(customer, createId) {
    const now = new Date().toISOString();
    return {
      id: String(customer.id || createId()),
      name: String(customer.name || "Cliente"),
      phone: normalizePhone(customer.phone),
      whatsapp: customer.whatsapp !== false,
      address: String(customer.address || ""),
      firstOrderAt: customer.firstOrderAt || customer.createdAt || now,
      lastOrderAt: customer.lastOrderAt || customer.firstOrderAt || "",
      orderCount: toNumber(customer.orderCount),
      totalSpent: toNumber(customer.totalSpent),
      createdAt: customer.createdAt || now,
      updatedAt: customer.updatedAt || "",
    };
  }

  window.PJotaCustomerModel = {
    normalizePhone,
    normalizeCustomer,
  };
})();
