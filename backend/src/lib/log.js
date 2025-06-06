var jwt = require('jsonwebtoken');
var crypto = require('crypto');
var Log = require('mongoose').model('Log');
var Response = require('./httpResponse.js');
var config = require('../config/config.json');

var env = process.env.NODE_ENV || 'dev';
var jwtSecret = config[env].jwtSecret;

class AuditTrail {
  constructor() {
    this.sensitiveFields = ['password', 'token', 'secret', 'key', 'totp'];
  }

  // Avoid save sensitive fields
  sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = JSON.parse(JSON.stringify(body));

    const sanitizeObject = obj => {
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          const lowerKey = key.toLowerCase();

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

  // Generate digital signature
  generateSignature(logData) {
    const dataToSign = JSON.stringify({
      username: logData.username,
      role: logData.role,
      endpoint: logData.endpoint,
      method: logData.method,
      responseStatus: logData.responseStatus,
      timestamp: logData.timestamp,
    });

    return crypto
      .createHmac('sha256', jwtSecret)
      .update(dataToSign)
      .digest('hex');
  }

  // Verify integrity of logs (in parameter)
  verifyLogIntegrity(logData) {
    const expectedSignature = this.generateSignature(logData);
    return logData.signature === expectedSignature;
  }

  getValidSignatureLogs(logs) {
    return logs.filter(logData => {
      if (!logData || !logData.signature) {
        return false;
      }

      try {
        return this.verifyLogIntegrity(logData);
      } catch (error) {
        console.error('Error validando firma del log:', error);
        return false;
      }
    });
  }

  // Extract information from JWT
  extractUserInfoFromRequest(req) {
    // Default values
    let userInfo = {
      id: 'anonymous',
      username: 'anonymous',
      role: 'guest',
    };

    if (req.cookies && req.cookies['token']) {
      try {
        const cookie = req.cookies['token'].split(' ');
        if (cookie.length === 2 && cookie[0] === 'JWT') {
          const decoded = jwt.verify(cookie[1], jwtSecret);
          userInfo = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role,
          };
        }
      } catch (jwtError) {
        // Invalid Token - use default values
        console.warn('Invalid JWT token in audit log:', jwtError.message);
      }
    }
    return userInfo;
  }

  // Make log
  async createLog(req, responseStatus) {
    try {
      const userInfo = this.extractUserInfoFromRequest(req);
      const timestamp = new Date();

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

      // Make digital signature
      logData.signature = this.generateSignature(logData);

      Log.create(logData);
    } catch (error) {
      console.error('Error in createLog:', error);
    }
  }

  // Method to make logs, avoid refreshtoken and checktoken endpoints
  createLogSync(req, responseStatus) {
    if (
      req.originalUrl !== '/api/users/checktoken' &&
      req.originalUrl !== '/api/users/refreshtoken' &&
      req.url !== '/api/users/checktoken' &&
      req.originalUrl !== '/api/users/refreshtoken'
    ) {
      setImmediate(async () => {
        await this.createLog(req, responseStatus);
      });
    }
  }

  // Middleware
  interceptResponseMethods() {
    const self = this;

    // Save original methods
    const originalMethods = {
      Ok: Response.Ok,
      Created: Response.Created,
      BadParameters: Response.BadParameters,
      Unauthorized: Response.Unauthorized,
      Forbidden: Response.Forbidden,
      NotFound: Response.NotFound,
      Internal: Response.Internal,
    };

    // Make wrappers
    const createLogWrapper = (originalMethod, statusCode) => {
      return function (res, data) {
        // Make log if there is information available
        if (res.req) {
          self.createLogSync(res.req, statusCode);
        }
        // Call original method
        return originalMethod(res, data);
      };
    };

    // Apply wrappers
    Response.Ok = createLogWrapper(originalMethods.Ok, 200);
    Response.Created = createLogWrapper(originalMethods.Created, 201);
    Response.BadParameters = createLogWrapper(
      originalMethods.BadParameters,
      400,
    );
    Response.Unauthorized = createLogWrapper(originalMethods.Unauthorized, 401);
    Response.Forbidden = createLogWrapper(originalMethods.Forbidden, 403);
    Response.NotFound = createLogWrapper(originalMethods.NotFound, 404);
    Response.Internal = createLogWrapper(originalMethods.Internal, 500);

    return originalMethods;
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
