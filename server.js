import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { ipKeyGenerator } from "express-rate-limit";
import Dramabox from "./src/services/Dramabox.js";
import path from "path";
import { fileURLToPath } from "url";

// ============================================
// CONFIGURATION
// ============================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

// ============================================
// DRAMABOX INSTANCE POOL (Singleton per Language)
// ============================================
const dramaboxInstances = new Map();

function getDramaboxInstance(lang = "pt") {
  if (!dramaboxInstances.has(lang)) {
    dramaboxInstances.set(lang, new Dramabox(lang));
  }
  return dramaboxInstances.get(lang);
}

// ============================================
// MIDDLEWARE
// ============================================

// Trust proxy (for Vercel, Heroku, etc.)
app.set("trust proxy", 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for EJS templates
    crossOriginEmbedderPolicy: false,
  })
);

// CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Compression (gzip)
app.use(compression());

// JSON parser with size limit
app.use(express.json({ limit: "1mb" }));

// URL encoded parser
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Rate limiting - 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Muitos pedidos. Tente novamente em 1 minuto.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  //keyGenerator: (req) => req.ip || req.headers["x-forwarded-for"] || "unknown",
   keyGenerator: (req) => ipKeyGenerator(req),
});
app.use("/api/", limiter);

// Request timeout middleware (30 seconds)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({
      success: false,
      error: {
        code: "REQUEST_TIMEOUT",
        message: "Tempo limitede de solicitação. Por favor, tente novamente.",
      },
    });
  });
  next();
});

// Request logging (development only)
if (NODE_ENV === "development") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(
        `[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`
      );
    });
    next();
  });
}

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files with caching
app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: NODE_ENV === "production" ? "1d" : 0,
    etag: true,
  })
);

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Standard API response builder
const apiResponse = {
  success: (data, meta = {}) => ({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  }),
  error: (code, message, details = null) => ({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  }),
  paginated: (data, page, size, hasMore) => ({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        hasMore,
      },
    },
  }),
};

// Input validation helper
const validateRequired = (params, required) => {
  const missing = required.filter((key) => !params[key]);
  if (missing.length > 0) {
    return `Parâmetros obrigatórios: ${missing.join(", ")}`;
  }
  return null;
};

// Sanitize string input
const sanitizeInput = (str) => {
  if (typeof str !== "string") return str;
  return str.trim().slice(0, 200); // Limit to 200 chars
};

// Async handler wrapper (prevents unhandled promise rejections)
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================================
// ROUTES
// ============================================

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: "1.2.0",
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
    },
  });
});

// Documentation page
app.get("/", (req, res) => {
  res.render("docs", { PORT });
});

// ============================================
// API ROUTES
// ============================================

// 1. Search Drama
app.get(
  "/api/search",
  asyncHandler(async (req, res) => {
    const { keyword, page = 1, size = 20, lang = "pt" } = req.query;

    const validationError = validateRequired({ keyword }, ["keyword"]);
    if (validationError) {
      return res
        .status(400)
        .json(apiResponse.error("VALIDATION_ERROR", validationError));
    }

    const dramabox = getDramaboxInstance(lang);
    const result = await dramabox.searchDrama(
      sanitizeInput(keyword),
      parseInt(page),
      parseInt(size)
    );

    res.json(apiResponse.paginated(result.book, page, size, result.isMore));
  })
);

// 2. Home / Drama List
app.get(
  "/api/home",
  asyncHandler(async (req, res) => {
    const { page = 1, size = 10, lang = "pt" } = req.query;

    const dramabox = getDramaboxInstance(lang);
    const result = await dramabox.getDramaList(parseInt(page), parseInt(size));

    res.json(apiResponse.paginated(result.book, page, size, result.isMore));
  })
);

// 3. VIP / Theater List
app.get(
  "/api/vip",
  asyncHandler(async (req, res) => {
    const { lang = "pt" } = req.query;

    const dramabox = getDramaboxInstance(lang);
    const result = await dramabox.getVip();

    res.json(apiResponse.success(result));
  })
);

// 4. Drama Detail V2
app.get(
  "/api/detail/:bookId/v2",
  asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const { lang = "pt" } = req.query;

    if (!bookId || isNaN(bookId)) {
      return res
        .status(400)
        .json(
          apiResponse.error("VALIDATION_ERROR", "bookId deve ser um número")
        );
    }

    const dramabox = getDramaboxInstance(lang);
    const result = await dramabox.getDramaDetailV2(bookId);

    res.json(apiResponse.success(result));
  })
);

// 5. Chapters List
app.get(
  "/api/chapters/:bookId",
  asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const { lang = "pt" } = req.query;

    if (!bookId || isNaN(bookId)) {
      return res
        .status(400)
        .json(
          apiResponse.error("VALIDATION_ERROR", "bookId deve ser um número")
        );
    }

    const dramabox = getDramaboxInstance(lang);
    const result = await dramabox.getChapters(bookId);

    res.json(
      apiResponse.success(result, {
        total: result.length,
      })
    );
  })
);

// 6. Stream URL
app.get(
  "/api/stream",
  asyncHandler(async (req, res) => {
    const { bookId, episode, lang = "pt" } = req.query;

    const validationError = validateRequired({ bookId, episode }, [
      "bookId",
      "episode",
    ]);
    if (validationError) {
      return res
        .status(400)
        .json(apiResponse.error("VALIDATION_ERROR", validationError));
    }

    if (isNaN(bookId) || isNaN(episode)) {
      return res
        .status(400)
        .json(
          apiResponse.error(
            "VALIDATION_ERROR",
            "bookId e episode devem ser números"
          )
        );
    }

    const dramabox = getDramaboxInstance(lang);
    const result = await dramabox.getStreamUrl(bookId, parseInt(episode));

    res.json(apiResponse.success(result.data));
  })
);

// 7. Batch Download (Heavy operation - stricter rate limit)
const downloadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, // Only 5 requests per minute for download
  message: apiResponse.error(
    "RATE_LIMIT_EXCEEDED",
    "Download limitado a 5 solicitações por minuto"
  ),
});

app.get(
  "/download/:bookId",
  downloadLimiter,
  asyncHandler(async (req, res) => {
    const { bookId } = req.params;
    const { lang = "pt" } = req.query;

    if (!bookId || isNaN(bookId)) {
      return res
        .status(400)
        .json(
          apiResponse.error("VALIDATION_ERROR", "bookId deve ser um número")
        );
    }

    const dramabox = getDramaboxInstance(lang);
    const result = await dramabox.batchDownload(bookId);

    if (!result || result.length === 0) {
      return res
        .status(404)
        .json(
          apiResponse.error(
            "NOT_FOUND",
            "Dados não encontrados ou ocorreu um erro"
          )
        );
    }

    res.json(
      apiResponse.success(result, {
        total: result.length,
        bookId,
      })
    );
  })
);

// 8. Categories List
app.get(
  "/api/categories",
  asyncHandler(async (req, res) => {
    const { lang = "pt" } = req.query;

    const dramabox = getDramaboxInstance(lang);
    const result = await dramabox.getCategories();

    res.json(
      apiResponse.success(result, {
        total: result.length,
      })
    );
  })
);

// 9. Drama by Category
app.get(
  "/api/category/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, size = 10, lang = "pt" } = req.query;

    if (!id || isNaN(id)) {
      return res
        .status(400)
        .json(
          apiResponse.error(
            "VALIDATION_ERROR",
            "id categoria deve ser um número"
          )
        );
    }

    const dramabox = getDramaboxInstance(lang);
    const result = await dramabox.getBookFromCategories(
      parseInt(id),
      parseInt(page),
      parseInt(size)
    );

    res.json(apiResponse.success(result));
  })
);

// 10. Recommendations
app.get(
  "/api/recommend",
  asyncHandler(async (req, res) => {
    const { lang = "pt" } = req.query;

    const dramabox = getDramaboxInstance(lang);
    const result = await dramabox.getRecommendedBooks();

    res.json(
      apiResponse.success(result, {
        total: result.length,
      })
    );
  })
);

// 11. Generate Headers (Utility/Debug)
app.get(
  "/api/generate-header",
  asyncHandler(async (req, res) => {
    const { lang = "pt" } = req.query;

    const dramabox = getDramaboxInstance(lang);
    const tokenData = await dramabox.getToken();
    const timestamp = Date.now();
    const headers = dramabox.buildHeaders(tokenData, timestamp);

    res.json(
      apiResponse.success({
        language: dramabox.lang,
        timestamp,
        headers,
        tokenInfo: {
          deviceId: tokenData.deviceId,
          validUntil: new Date(tokenData.expiry).toISOString(),
        },
      })
    );
  })
);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res
    .status(404)
    .json(
      apiResponse.error(
        "NOT_FOUND",
        `Endpoint ${req.method} ${req.path} não encontrado`
      )
    );
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res
      .status(400)
      .json(apiResponse.error("VALIDATION_ERROR", err.message));
  }

  if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
    return res
      .status(408)
      .json(apiResponse.error("REQUEST_TIMEOUT", "Tempo limite de solicitação"));
  }

  if (err.response?.status === 429) {
    return res
      .status(429)
      .json(
        apiResponse.error(
          "UPSTREAM_RATE_LIMIT",
          "O servidor de origem está ocupado. Tente novamente mais tarde"
        )
      );
  }

  // Default server error
  res
    .status(500)
    .json(
      apiResponse.error(
        "INTERNAL_ERROR",
        NODE_ENV === "production" ? "Ocorreu um erro no servidor" : err.message
      )
    );
});

// ============================================
// SERVER STARTUP
// ============================================

const server = app.listen(PORT, () => {
  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║                                                          ║");
  console.log("║   🎬  SERVIDOR DE API DRAMABOX v1.2.0                    ║");
  console.log("║                                                          ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║                                                          ║");
  console.log(`║   🚀  Status  : Executando (${NODE_ENV})                 ║`);
  console.log(`║   🌐  Local   : http://localhost:${PORT}                 ║`);
  console.log(`║   📖  Docs    : http://localhost:${PORT}/                 ║`);
  console.log(`║   💚  Saúde  : http://localhost:${PORT}/health                 ║`);
  console.log("║                                                          ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║   Características:                                       ║");
  console.log("║   ✓ Limitação de taxa (100 req/min)                      ║");
  console.log("║   ✓ Compressão Gzip                                      ║");
  console.log("║   ✓ Cabeçalhos de segurança (Helmet)                     ║");
  console.log("║   ✓ Cache de solicitações                                ║");
  console.log("║   ✓ Repetição automática com Backoff                     ║");
  console.log("║                                                          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("\n");
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = (signal) => {
  console.log(`\n[${signal}] Desligando normalmente...`);

  server.close(() => {
    console.log("[Servidor] Servidor HTTP fechado");

    // Clear Dramabox instances
    dramaboxInstances.clear();
    console.log("[Cache] Instâncias limpas");

    console.log("[Desligar] Completo");
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error("[Desligar] Forçar saída após tempo limite");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Exceção não tratada:", err);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[FATAL] Rejeição não tratada em:", promise, "reason:", reason);
});

export default app;
