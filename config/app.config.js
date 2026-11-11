(function () {
  window.PJOTA_APP_CONFIG = {
    appName: "P'Jota Buguer",
    storageKey: "burgerstock.v1",
    authStorageKey: "burgerstock.auth.v1",
    sessionStorageKey: "burgerstock.session.v1",
    printStorageKey: "burgerstock.print.v1",
    backupMetaKey: "burgerstock.backup.v1",
    soundStorageKey: "burgerstock.sound.v1",
    defaultSettings: {
      companyName: "P'Jota Buguer",
      address: "",
      phone: "",
      whatsapp: "",
      defaultDeliveryFee: 0,
      printMessage: "Obrigado pela preferencia!",
      logoUrl: "",
    },
    hosting: {
      mode: "static-local-storage",
      dataWarning: "Dados salvos no navegador. Use backup JSON antes de trocar de computador ou navegador.",
    },
  };
})();
