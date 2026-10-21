function errorHandler(error, _req, res, _next) {
  const status = error.name === "ZodError" ? 400 : (error.status || 500);

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    error: {
      message: status >= 500 ? "Erro interno do servidor." : (error.name === "ZodError" ? "Dados invalidos." : error.message),
      details: null,
    },
  });
}

module.exports = { errorHandler };
