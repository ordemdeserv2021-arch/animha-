function eMaster(req, res, next) {
  const perfilUsuario = req.headers['x-perfil-usuario'];

  if (perfilUsuario === 'MASTER') {
    return next();
  }

  return res.status(403).json({ error: 'Acesso negado. Apenas o perfil Master pode realizar esta ação.' });
}

// Exporta o objeto contendo a função
module.exports = { eMaster };