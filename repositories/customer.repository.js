(function () {
  function list(state) {
    return Array.isArray(state.customers) ? state.customers : [];
  }

  function save(state, customers) {
    state.customers = customers;
    return state;
  }

  window.PJotaCustomerRepository = {
    list,
    save,
  };
})();
