const https = require('https');
const fs = require('fs');

module.exports = function (app) {
  const Response = require('../lib/httpResponse.js');
  const acl = require('../lib/auth').acl;
  const networkError = new Error(
    'Error updating CWE model: Network response was not ok',
  );
  const timeoutError = new Error('Error updating CWE model: Request timed out');
  const cweConfig = require('../config/config-cwe.json')['cwe-container'];
  const TIMEOUT_MS = cweConfig.update_timeout_ms || 120000;

  app.post(
    '/api/update-cwe-model',
    acl.hasPermission('update-model:all'),
    async function (req, res) {
      if (!cweConfig.host || !cweConfig.port) {
        return Response.BadRequest(
          res,
          new Error('Configuración del servicio CWE incompleta'),
        );
      }

      const options = {
        hostname: cweConfig.host,
        port: cweConfig.port,
        path: `/${cweConfig.endpoints.update_cwe_endpoint}`,
        method: 'POST',
        timeout: TIMEOUT_MS,
        ca: fs.readFileSync(__dirname + '/../../ssl/cwe_api.crt'),
        rejectUnauthorized: true,
      };

      const reqHttps = https.request(options, response => {
        let data = '';

        response.on('data', chunk => {
          data += chunk;
        });

        response.on('end', () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            console.error('Bad response code:', response.statusCode);
            Response.Internal(res, networkError);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            res.json(parsed);
          } catch (e) {
            console.error('Error parsing JSON:', e);
            Response.Internal(res, networkError);
          }
        });
      });

      reqHttps.on('error', error => {
        console.error('Request error:', error);
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
          Response.Internal(res, timeoutError);
        } else {
          Response.Internal(res, networkError);
        }
      });

      reqHttps.on('timeout', () => {
        reqHttps.destroy(timeoutError);
      });

      reqHttps.write(vuln);
      reqHttps.end();
    },
  );
};
