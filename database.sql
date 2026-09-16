CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  login VARCHAR(80) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  perfil VARCHAR(20) NOT NULL DEFAULT 'OPERADOR',
  pode_excluir BOOLEAN NOT NULL DEFAULT FALSE,
  ultimo_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA'))
);

CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  codigo_barras VARCHAR(50) UNIQUE,
  preco_venda NUMERIC(10, 2) NOT NULL,
  preco_custo NUMERIC(10, 2) NOT NULL DEFAULT 0,
  quantidade_estoque INTEGER NOT NULL DEFAULT 0,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS transacoes (
  id SERIAL PRIMARY KEY,
  descricao VARCHAR(255) NOT NULL,
  valor NUMERIC(10, 2) NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  produto_id INTEGER REFERENCES produtos(id) ON DELETE SET NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  data TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fechamentos_caixa (
  id SERIAL PRIMARY KEY,
  operador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  operador_nome VARCHAR(120) NOT NULL,
  aberto_em TIMESTAMP NOT NULL,
  fechado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_entradas NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_saidas NUMERIC(12, 2) NOT NULL DEFAULT 0,
  saldo NUMERIC(12, 2) NOT NULL DEFAULT 0,
  quantidade_transacoes INTEGER NOT NULL DEFAULT 0
);

INSERT INTO usuarios (nome, login, senha, perfil, pode_excluir)
VALUES ('Administrador', 'admin', '123456', 'MASTER', TRUE)
ON CONFLICT (login) DO NOTHING;

INSERT INTO usuarios (nome, login, senha, perfil, pode_excluir)
VALUES ('Paulinha', 'paulinha', '12345678', 'OPERADOR', FALSE)
ON CONFLICT (login) DO NOTHING;