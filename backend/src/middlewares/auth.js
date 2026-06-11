const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { HttpError } = require("../utils/http-error");
const { userService } = require("../services/user.service");

async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");

    if (!token) {
      throw new HttpError(401, "Token de acesso nao informado.");
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await userService.findById(payload.sub);

    if (!user || !user.active) {
      throw new HttpError(401, "Usuario invalido ou inativo.");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error.status ? error : new HttpError(401, "Sessao invalida."));
  }
}

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new HttpError(403, "Voce nao tem permissao para acessar este recurso."));
      return;
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
