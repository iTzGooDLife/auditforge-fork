const fs = require('fs');
const path = require('path');

const CWE_API_CERT = fs.readFileSync(
  path.join(__dirname, '../../ssl/cwe_api.crt'),
);

module.exports = CWE_API_CERT;
