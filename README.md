# 🔧 Werk OS API

API REST desenvolvida para gerenciamento de Ordens de Serviço (OS), clientes e usuários.

O sistema foi criado para atender assistências técnicas e empresas que necessitam controlar atendimentos, histórico de serviços, garantias, clientes e valores de serviços executados.

## 🚀 Tecnologias Utilizadas

- Node.js
- TypeScript
- Express
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Zod
- Bcrypt

---

## 📋 Funcionalidades

### 👤 Usuários

- Cadastro de usuários
- Login com autenticação JWT
- Criptografia de senhas
- Controle de acesso às rotas protegidas

### 👥 Clientes

- Cadastro de clientes
- Edição de clientes
- Exclusão de clientes
- Consulta de clientes
- Busca de clientes vinculados às ordens de serviço
- Contagem de OS por cliente

### 🛠️ Ordens de Serviço

- Cadastro de OS
- Atualização de OS
- Exclusão de OS
- Consulta de OS
- Associação de OS a clientes
- Controle de garantia
- Controle de valores de serviço e material
- Cálculo do valor total
- Controle do tipo de atendimento:
  - Garantia
  - Fora de Garantia
  - Orçamento
  - Contrato

---

## 🗄️ Estrutura do Banco

### Cliente

| Campo    | Tipo   |
| -------- | ------ |
| nome     | String |
| telefone | String |
| email    | String |
| cpf      | String |
| cnpj     | String |
| endereço | String |
| cidade   | String |
| UF       | String |

### Ordem de Serviço

| Campo             | Tipo    |
| ----------------- | ------- |
| contato           | String  |
| modeloEquipamento | String  |
| defeito           | String  |
| defeitoConstatado | String  |
| solução           | String  |
| valorServiço      | Decimal |
| valorMaterial     | Decimal |
| total             | Decimal |
| garantiaPeça      | String  |
| garantiaServiço   | String  |
| tipoServico       | Enum    |

---

## 🔐 Autenticação

A API utiliza JWT para autenticação.

Exemplo de retorno após login:

```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "name": "Administrador"
  }
}
```

---

## ⚙️ Instalação

### 1 - Clone o projeto

```bash
git clone https://github.com/sergiorbotelho/werk-os-api.git
```

### 2 - Acesse a pasta

```bash
cd werk-os-api
```

### 3 - Instale as dependências

```bash
npm install
```

### 4 - Configure as variáveis de ambiente

Crie um arquivo `.env`

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/werkos"
JWT_SECRET="sua_chave_jwt"
```

### 5 - Execute as migrations

```bash
npx prisma migrate deploy
```

ou

```bash
npx prisma migrate dev
```

### 6 - Inicie o servidor

```bash
npm run dev
```

---

## 📚 Principais Endpoints

### Autenticação

| Método | Endpoint |
| ------ | -------- |
| POST   | /session |

### Clientes

| Método | Endpoint      |
| ------ | ------------- |
| GET    | /customer     |
| POST   | /customer     |
| PUT    | /customer/:id |
| DELETE | /customer/:id |

### Ordens de Serviço

| Método | Endpoint |
| ------ | -------- |
| GET    | /os      |
| GET    | /os/:id  |
| POST   | /os      |
| PUT    | /os/:id  |
| DELETE | /os/:id  |

---

## 🧪 Validações

O projeto utiliza Zod para validação dos dados recebidos pela API.

Exemplos:

- E-mail válido
- CPF/CNPJ obrigatório
- Telefone obrigatório
- Campos mínimos obrigatórios
- Tipos de serviço controlados por Enum

---

## 📈 Melhorias Futuras

- Paginação
- Filtros avançados
- Upload de anexos
- Histórico de alterações
- Dashboard com indicadores
- Relatórios PDF
- Controle de permissões por perfil

---

## 📄 Licença

Este projeto foi desenvolvido para fins de estudo e portfólio.

---

## 👨‍💻 Autor

**Sergio Botelho**

- GitHub: https://github.com/sergiorbotelho
- LinkedIn: https://linkedin.com/in/sergiobotelho
