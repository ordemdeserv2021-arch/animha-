function eMaster(req, res, next) {
  const perfilUsuario = req.headers['x-perfil-usuario'];

  if (perfilUsuario === 'MASTER') {
    return next();
  }

  return res.status(403).json({ error: 'Acesso negado. Apenas o perfil Master pode realizar esta ação.' });
}

function podeExcluir(req, res, next) {
  const perfilUsuario = req.headers['x-perfil-usuario'];
  const podeExcluirRegistro = req.headers['x-pode-excluir'];

  if (perfilUsuario === 'MASTER' || podeExcluirRegistro === 'true') {
    return next();
  }

  return res.status(403).json({ error: 'Acesso negado. Este usuário não pode excluir registros.' });
}

// Exporta o objeto contendo a função
module.exports = { eMaster, podeExcluir };