const https = require('https');
const fs = require('fs');

module.exports = function (app) {
  const Response = require('../lib/httpResponse.js');
  const acl = require('../lib/auth').acl;
  const networkError = new Error(
    'Error checking CWE model update: Network response was not ok',
  );
  const timeoutError = new Error(
    'Error checking CWE mode update: Request timed out',
  );
  const cweConfig = require('../config/config-cwe.json')['cwe-container'];
  const TIMEOUT_MS = cweConfig.check_timeout_ms || 30000;

  app.get(
    '/api/check-cwe-update',
    acl.hasPermission('check-update:all'),
    async function (req, res) {
      if (!cweConfig.host || !cweConfig.port) {
        return Response.BadRequest(
          res,
          new Error('Configuración del servicio incompleta'),
        );
      }

      const options = {
        hostname: cweConfig.host,
        port: cweConfig.port,
        path: `/${cweConfig.endpoints.check_update_endpoint}`,
        method: 'GET',
        timeout: TIMEOUT_MS,
        ca: fs.readFileSync(__dirname + '/../../ssl/cwe_api.crt'),
        rejectUnauthorized: true,
      };

      const request = https.request(options, response => {
        let data = '';

        response.on('data', chunk => {
          data += chunk;
        });

        response.on('end', () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            return Response.Internal(
              res,
              new Error(`Error del servidor (${response.statusCode}): ${data}`),
            );
          }

          try {
            const json = JSON.parse(data);
            res.json(json);
          } catch (err) {
            Response.Internal(res, new Error('Error en check-cwe-update'));
          }
        });
      });

      request.on('error', err => {
        console.error('Error en check-cwe-update:', err);
        Response.Internal(res, { ...timeoutError, details: err.message });
      });

      request.on('timeout', () => {
        request.destroy(new Error('Connection timeout'));
      });

      request.end();
    },
  );
};
