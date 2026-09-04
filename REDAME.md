# 💰 Sistema de Gestão de Fluxo de Caixa

Aplicação completa de gestão financeira desenvolvida em **Node.js**, **Express** e **PostgreSQL**, com painel dashboard em **HTML5**, **CSS3** e **JavaScript Vanilla**.

---

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js, Express, `pg` (PostgreSQL client), `dotenv`
- **Frontend**: HTML5, CSS3, JavaScript (Fetch API)
- **Banco de Dados**: PostgreSQL
- **Arquitetura**: MVC (Models, Views/Public, Controllers, Routes)

---

## 🗄️ Estrutura do Banco de Dados

Antes de iniciar a aplicação, crie o banco de dados `fluxo_caixa` e execute as queries SQL abaixo no PostgreSQL (`psql` ou pgAdmin):

```sql
-- Criar o banco de dados
CREATE DATABASE fluxo_caixa;

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(10) CHECK (tipo IN ('RECEITA', 'DESPESA')) NOT NULL
);

-- Tabela de Transações
CREATE TABLE IF NOT EXISTS transacoes (
    id SERIAL PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    tipo VARCHAR(10) CHECK (tipo IN ('ENTRADA', 'SAIDA')) NOT NULL,
    categoria_id INT REFERENCES categorias(id) ON DELETE SET NULL,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);