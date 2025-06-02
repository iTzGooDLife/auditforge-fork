const https = require('https');
const fs = require('fs');

module.exports = function (app) {
  const Response = require('../lib/httpResponse.js');
  const acl = require('../lib/auth').acl;
  const cweConfig = require('../config/config-cwe.json')['cwe-container'];
  const errorClassify = new Error('Error classifying vulnerability');
  const networkError = new Error('Network response was not ok');
  const timeoutError = new Error('Request timed out');
  const TIMEOUT_MS = 47000; // 47 segundos (temporal)

  // Get CVSS string from description
  app.post(
    '/api/cvss',
    acl.hasPermission('classify_cvss:all'),
    async function (req, res) {
      if (
        !req.body.vuln ||
        typeof req.body.vuln !== 'string' ||
        req.body.vuln.trim() === ''
      ) {
        Response.BadParameters(res, 'Required parameters: description');
        return;
      }

      const vuln = JSON.stringify({ vuln: req.body.vuln.trim() });

      const options = {
        hostname: cweConfig.host,
        port: cweConfig.port,
        path: '/cvss',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(vuln),
        },
        ca: fs.readFileSync(__dirname + '/../../ssl/cwe_api.crt'),
        rejectUnauthorized: true,
        timeout: TIMEOUT_MS,
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
            Response.Internal(res, errorClassify);
          }
        });
      });

      reqHttps.on('error', error => {
        console.error('Request error:', error);
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
          Response.Internal(res, timeoutError);
        } else {
          Response.Internal(res, errorClassify);
        }
      });

      reqHttps.write(vuln);
      reqHttps.end();
    },
  );
};
