var jwt = require('jsonwebtoken');
var crypto = require('crypto');
var Log = require('mongoose').model('Log');
var Response = require('./httpResponse.js');
var config = require('../config/config.json');

var fs = require('fs');
var env = process.env.NODE_ENV || 'dev';
var jwtSecret = config[env].jwtSecret;

class AuditTrail {
  constructor() {
    this.sensitiveFields = ['password', 'token', 'secret', 'key', 'totp'];
  }

  // Método para sanitizar datos sensibles del cuerpo de la petición
  sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = JSON.parse(JSON.stringify(body));
    
    const sanitizeObject = (obj) => {
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          const lowerKey = key.toLowerCase();
          
          // Ocultar campos sensibles
          if (this.sensitiveFields.some(field => lowerKey.includes(field))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
          }
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  // Método para generar firma digital del log
  generateSignature(logData) {
    const dataToSign = JSON.stringify({
      username: logData.username,
      userId: logData.userId,
      endpoint: logData.endpoint,
      method: logData.method,
      timestamp: logData.timestamp,
    });

    return crypto
      .createHmac('sha256', jwtSecret)
      .update(dataToSign)
      .digest('hex');
  }

  // Método para verificar la integridad de un log
  verifyLogIntegrity(logData) {
    const expectedSignature = this.generateSignature(logData);
    return logData.signature === expectedSignature;
  }

  // Método para extraer información del JWT
  extractUserInfoFromRequest(req) {
    // Valores default // TODO: revisar si se quita
    let userInfo = {
      id: 'anonymous',
      username: 'anonymous',
      role: 'guest'
    };

    if (req.cookies && req.cookies['token']) {
      try {
        const cookie = req.cookies['token'].split(' ');
        if (cookie.length === 2 && cookie[0] === 'JWT') {
          const decoded = jwt.verify(cookie[1], jwtSecret);
          userInfo = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role
          };
        }
      } catch (jwtError) {
        // Token inválido, se mantienes valores default
        console.warn('Invalid JWT token in audit log:', jwtError.message);
      }
    }
    return userInfo;
  }


  // Crear Log
  async createLog(req, responseStatus) {
    try {
      const userInfo = this.extractUserInfoFromRequest(req);
      const timestamp = new Date();
      
      //TODO: Cambiar ipAddress para que sea IPv4 en lugar de IPv6
      const logData = {
        id: crypto.randomUUID(),
        username: userInfo.username,
        userId: userInfo.id,
        role: userInfo.role,
        endpoint: req.originalUrl || req.url,
        method: req.method,
        requestBody: this.sanitizeRequestBody(req.body),
        responseStatus: responseStatus,
        timestamp: timestamp,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
      };

      // Generar firma digital
      logData.signature = this.generateSignature(logData);

      //TODO: Cambiar acción then & catch
      Log.create(logData);

    } catch (error) {
      console.error('Error in createLog:', error);
    }
  }

  // Método síncrono para usar sin async/await
  // Se filtran los endpoints que no se ven necesarios
  createLogSync(req, responseStatus) {
    if (req.originalUrl !== '/api/users/checktoken' && req.originalUrl !== '/api/users/refreshtoken'
    && req.url !== '/api/users/checktoken' && req.originalUrl !== '/api/users/refreshtoken'){
      setImmediate(async () => {
        await this.createLog(req, responseStatus);
      });
    }
  }

  // Middleware
  interceptResponseMethods() {
    const self = this;

    // Guardar métodos originales
    const originalMethods = {
      Ok: Response.Ok,
      Created: Response.Created,
      BadParameters: Response.BadParameters,
      Unauthorized: Response.Unauthorized,
      Forbidden: Response.Forbidden,
      NotFound: Response.NotFound,
      Internal: Response.Internal
    };

    // Crear wrappers que incluyen auditoría
    const createLogWrapper = (originalMethod, statusCode) => {
      return function(res, data) {
        // Crear log de auditoría si hay información de request disponible
        if (res.req) {
          self.createLogSync(res.req, statusCode);
        }
        // Llamar método original
        return originalMethod(res, data);
      };
    };

    // Aplicar wrappers
    Response.Ok = createLogWrapper(originalMethods.Ok, 200);
    Response.Created = createLogWrapper(originalMethods.Created, 201);
    Response.BadParameters = createLogWrapper(originalMethods.BadParameters, 400);
    Response.Unauthorized = createLogWrapper(originalMethods.Unauthorized, 401);
    Response.Forbidden = createLogWrapper(originalMethods.Forbidden, 403);
    Response.NotFound = createLogWrapper(originalMethods.NotFound, 404);
    Response.Internal = createLogWrapper(originalMethods.Internal, 500);

    return originalMethods; // Para poder restaurar si es necesario
  }

  middleware() {
    return (req, res, next) => {
      res.req = req;
      next();
    };
  }
}


const auditTrail = new AuditTrail();

auditTrail.interceptResponseMethods();
exports.auditTrail = auditTrail;
