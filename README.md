<div align="center">

# 🎬 Dramabox API

### API REST moderna para acessar o conteúdo do Dramabox

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Licença](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Versão](https://img.shields.io/badge/Version-1.2.0-green?style=for-the-badge)]()

[🚀 Demo](https://dramabox-api-rho.vercel.app/) • [📖 Documentação](#-endpoints) • [🐛 Reportar bug](https://github.com/yourusername/dramabox-api/issues)

</div>

---

## ✨ Características

| Recurso                  | Descrição                         |
| ---------------------- | --------------------------------- |
| 🔍 **Pesquisa**          | Pesquise dramas com base em palavras-chave    |
| 📺 **Streaming**       | Obtenha URL de streaming (m3u8/mp4) |
| 📋 **Lista de episódios**    | Lista de todos os capítulos/episódios|
| 🏷️ **Categorias**      | Navegue por categoria    |
| ⭐ **Recomendações** | Drama recomendado       |
| 👑 **Conteúdo VIP**     | Acesse conteúdo VIP/Teatro         |

## 🛡️ Produção pronta

| Melhores Práticas        | Status          |
| -------------------- | --------------- |
| ⚡ Rate Limiting     | ✅ 100 req/min  |
| 🗜️ Gzip Compression  | ✅ ~70% Menor |
| 🔒 Security Headers  | ✅ Helmet       |
| 🔄 Auto Retry        | ✅ 3x + backoff |
| 💾 Response Caching  | ✅ 5-60 min TTL |
| 📊 Health Check      | ✅ /health      |
| 🎯 Input Validation  | ✅ Higienizado    |
| 🚦 Graceful Shutdown | ✅ SIGTERM      |

---

## 🚀 Início rápido

### Pré-requisitos

- Node.js 18+
- npm Ou yarn

### Instalação

```bash
# Clonar repositório
git clone https://github.com/yourusername/dramabox-api.git
cd dramabox-api

# Instalar dependências
npm install

# Construir CSS (opcional)
npm run build:css

# Iniciar servidor de desenvolvimento
npm run dev
```

### Variáveis ​​de ambiente (opcional)

```env
PORT=3000
NODE_ENV=development
```

---

## 📖 Endpoints

### URL base

```
Local: http://localhost:3000
Produção: https://dramabox-api-rho.vercel.app
```

### 🔍 Pesquisar Drama

```http
GET /api/search?keyword={keyword}&page={page}&size={size}&lang={lang}
```

| Parâmetro | Tipo   | Obrigatório | Padrão | Descrição          |
| --------- | ------ | -------- | ------- | -------------------- |
| keyword   | string | ✅       | -       | Palavras-chave de pesquisa |
| page      | number | ❌       | 1       | Página              |
| size      | number | ❌       | 20      | Número por página   |
| lang      | string | ❌       | in      | Linguagem (in/en/pt)    |

### 🏠 Início /Lista de Dramas

```http
GET /api/home?page={page}&size={size}&lang={lang}
```

### 👑 VIP /Teatro

```http
GET /api/vip?lang={lang}
```

### 📄 Detalhe do drama

```http
GET /api/detail/{bookId}/v2?lang={lang}
```

### 📋 Lista de episódios

```http
GET /api/chapters/{bookId}?lang={lang}
```

### 📺 URL de transmissão

```http
GET /api/stream?bookId={bookId}&episode={episode}&lang={lang}
```

| Parâmetro | Tipo   | Obrigatório | Descrição   |
| --------- | ------ | -------- | ------------- |
| bookId    | number | ✅       | ID do drama      |
| episode   | number | ✅       | Número do episódio |

### ⬇️ Download em lote

```http
GET /download/{bookId}?lang={lang}
```

> ⚠️ Limite de taxa: 5 requisições por minuto

### 🏷️ Categorias

```http
GET /api/categories?lang={lang}
GET /api/category/{id}?page={page}&size={size}&lang={lang}
```

### ⭐ Recomendações

```http
GET /api/recommend?lang={lang}
```

### 💚 Verificação de saúde

```http
GET /health
```

---

## 📦 Formato de resposta

### ✅ Resposta de sucesso

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "pagination": {
      "page": 1,
      "size": 10,
      "hasMore": true
    }
  }
}
```

### ❌ Resposta de erro

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Parâmetros obrigatórios: keyword"
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Códigos de erro

| Código                  | HTTP | Descrição            |
| --------------------- | ---- | ---------------------- |
| `VALIDATION_ERROR`    | 400  | Entrada inválida      |
| `NOT_FOUND`           | 404  | Dados não encontrados  |
| `RATE_LIMIT_EXCEEDED` | 429  | Muitas solicitações |
| `REQUEST_TIMEOUT`     | 408  | Tempo limite de solicitações |
| `INTERNAL_ERROR`      | 500  | Erro no servidor          |

---

## 🗂️ Estrutura do Projeto

```
dramabox-api/
├── 📁 src/
│   ├── 📁 services/
│   │   └── 📄 Dramabox.js      # Serviço principal da API
│   ├── 📁 utils/
│   │   ├── 📄 DramaboxUtil.js  # Funções utilitárias
│   │   └── 📄 proxyManager.js  # Gerenciamento de proxy
│   └── 📁 styles/
│       └── 📄 input.css        # Fonte do Tailwind
├── 📁 public/
│   └── 📁 css/
│       └── 📄 styles.css       # CSS compilado
├── 📁 views/
│   └── 📄 docs.ejs             # Página de documentação
├── 📄 server.js                # Servidor principal
├── 📄 tailwind.config.js
├── 📄 package.json
└── 📄 vercel.json              # Configuração do Vercel
```

---

## 🛠️ Scripts

```bash
npm start        # Servidor de produção
npm run dev      # Desenvolvimento com recarregamento automático
npm run build:css   # Compilar o Tailwind CSS
npm run watch:css   # Monitorar alterações do Tailwind
```

---

## 🚀 Deploy

### Vercel (Recomendado)

```bash
npm i -g vercel
vercel
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📝 Registro de alterações

### v1.2.0 (2024-12-30)

- ✅ Rate limiting (100 req/min)
- ✅ Gzip compression
- ✅ Helmet security headers
- ✅ Standardized response format
- ✅ Global error handling
- ✅ Graceful shutdown
- ✅ Health check endpoint
- ✅ Instance pooling

### v1.1.0

- ✅ Retry logic with exponential backoff
- ✅ Response caching (node-cache)
- ✅ Better error messages
- ✅ Tailwind CSS (local build)
- ✅ Modern documentation UI

### v1.0.0

- 🎉 Lançamento inicial

---

## 👨‍💻 Desenvolvedor

**Handoko x Mari Partner**

[![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://api.whatsapp.com/send/?phone=6287780081554)

---

## 📄 Licença

MIT License - feel free to use for personal or commercial projects.

---

<div align="center">

**⭐ Marque este repositório com estrela se você achar útil!**

Feito com ❤️ na Indonésia 🇮🇩

</div>
