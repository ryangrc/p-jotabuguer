(function () {
  const model = window.PJotaCustomerModel;

  function findByPhone(customers, phone) {
    const normalizedPhone = model.normalizePhone(phone);
    if (!normalizedPhone) return null;
    return customers.find((customer) => customer.phone === normalizedPhone) || null;
  }

  function upsertFromOrder(customers, order, createId) {
    const phone = model.normalizePhone(order.customerPhone);
    if (!phone) return null;

    const now = order.date || new Date().toISOString();
    let customer = findByPhone(customers, phone);

    if (!customer) {
      customer = model.normalizeCustomer(
        {
          id: createId(),
          name: order.customerName,
          phone,
          whatsapp: order.customerWhatsapp,
          address: order.destination === "delivery" ? order.address : "",
          firstOrderAt: now,
          createdAt: now,
        },
        createId,
      );
      customers.push(customer);
    }

    customer.name = order.customerName || customer.name;
    customer.whatsapp = order.customerWhatsapp;
    if (order.destination === "delivery" && order.address) customer.address = order.address;
    customer.lastOrderAt = now;
    customer.orderCount += 1;
    customer.totalSpent += Number(order.total) || 0;
    customer.updatedAt = new Date().toISOString();
    return customer;
  }

  function getCustomerOrders(orders, customer) {
    if (!customer) return [];
    return orders.filter((order) => model.normalizePhone(order.customerPhone) === customer.phone);
  }

  window.PJotaCustomerService = {
    findByPhone,
    upsertFromOrder,
    getCustomerOrders,
  };
})();
