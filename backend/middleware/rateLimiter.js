// Rate limiter ligero en memoria (sin dependencias adicionales para ahorrar RAM en Raspberry Pi)
const attempts = new Map();

// Limpieza periódica de entradas expiradas cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts.entries()) {
    if (now > record.resetTime) {
      attempts.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

const createRateLimiter = ({
  windowMs = 15 * 60 * 1000, // 15 minutos por defecto
  max = 10, // máximo de intentos por ventana
  message = 'Demasiados intentos desde esta IP, por favor intenta nuevamente más tarde.'
} = {}) => {
  return (req, res, next) => {
    const forwarded = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'];
    const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) || req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${req.baseUrl}${req.path}:${clientIp}`;
    const now = Date.now();

    let record = attempts.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      attempts.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({ message });
    }

    next();
  };
};

module.exports = { createRateLimiter };
