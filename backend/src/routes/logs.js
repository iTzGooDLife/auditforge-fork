module.exports = function (app) {
  var Response = require('../lib/httpResponse.js');
  var acl = require('../lib/auth').acl;
  var utils = require('../lib/utils');
  var Log = require('mongoose').model('Log');
  const auditTrail = require('../lib/log').auditTrail;

  // Function to validate ObjectId
  function isValidObjectId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  // Validate Date ISO Format
  function isValidDate(dateString) {
    const date = new Date(dateString);
    return (
      date instanceof Date &&
      !isNaN(date) &&
      dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/)
    );
  }

  // Get last hundred logs without filters
  app.get('/api/logs', acl.hasPermission('logs:read'), function (req, res) {
    Log.getLastHundredLogs()
      .then(result => {
        var filtered = auditTrail.getValidSignatureLogs(result);
        Response.Ok(res, filtered);
      })
      .catch(err => Response.Internal(res, err));
  });

  // Get Logs with filters and options
  app.post('/api/logs', acl.hasPermission('logs:read'), function (req, res) {
    try {
      var filters = {};
      var options = {};

      // Validate body format (it can be empty)
      if (
        req.body !== null &&
        req.body !== undefined &&
        (typeof req.body !== 'object' || Array.isArray(req.body))
      ) {
        return Response.BadRequest(res, 'Invalid request body');
      }

      // Validate and sanitize username
      if (req.body.username) {
        if (typeof req.body.username !== 'string') {
          return Response.BadRequest(res, 'Username must be a string');
        }
        const username = req.body.username.trim();
        filters.username = utils.escapeRegex(username);
      }

      // Validate userId as an ObjectId
      if (req.body.userId) {
        if (typeof req.body.userId !== 'string') {
          return Response.BadRequest(res, 'UserId must be a string');
        }
        if (!isValidObjectId(req.body.userId.trim())) {
          return Response.BadRequest(res, 'Invalid userId format');
        }
        filters.userId = req.body.userId.trim();
      }

      // Validate role
      if (req.body.role) {
        if (typeof req.body.role !== 'string') {
          return Response.BadRequest(res, 'Role must be a string');
        }
        const role = req.body.role.trim();
        filters.role = utils.escapeRegex(role);
      }

      // Validate queried endpoint
      if (req.body.endpoint) {
        if (typeof req.body.endpoint !== 'string') {
          return Response.BadRequest(res, 'Endpoint must be a string');
        }
        const endpoint = req.body.endpoint.trim();
        filters.endpoint = utils.escapeRegex(endpoint);
      }

      // Validate queried method with whitelist
      if (req.body.method) {
        if (typeof req.body.method !== 'string') {
          return Response.BadRequest(res, 'Method must be a string');
        }
        const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        const method = req.body.method.trim().toUpperCase();
        if (!allowedMethods.includes(method)) {
          return Response.BadRequest(res, 'Invalid HTTP method');
        }
        filters.method = method;
      }

      // Validate StartDate
      if (req.body.startDate) {
        if (typeof req.body.startDate !== 'string') {
          return Response.BadRequest(res, 'StartDate must be a string');
        }
        if (!isValidDate(req.body.startDate)) {
          return Response.BadRequest(
            res,
            'Invalid startDate format. Use ISO 8601 format',
          );
        }
        filters.startDate = req.body.startDate;
      }

      // Validate EndDate
      if (req.body.endDate) {
        if (typeof req.body.endDate !== 'string') {
          return Response.BadRequest(res, 'EndDate must be a string');
        }
        if (!isValidDate(req.body.endDate)) {
          return Response.BadRequest(
            res,
            'Invalid endDate format. Use ISO 8601 format',
          );
        }
        filters.endDate = req.body.endDate;
      }

      // Validate that EndDate is previous to StartDate
      if (filters.startDate && filters.endDate) {
        if (new Date(filters.startDate) >= new Date(filters.endDate)) {
          return Response.BadRequest(res, 'startDate must be before endDate');
        }
      }

      // Validate limit option
      if (req.body.limit !== undefined) {
        const limit = parseInt(req.body.limit);
        if (isNaN(limit) || limit < 1 || limit > 1000) {
          return Response.BadRequest(
            res,
            'Invalid limit. Must be between 1 and 1000',
          );
        }
        options.limit = limit;
      }

      // Validate pagination options
      if (req.body.skip !== undefined) {
        const skip = parseInt(req.body.skip);
        if (isNaN(skip) || skip < 0) {
          return Response.BadRequest(res, 'Invalid skip. Must be >= 0');
        }
        options.skip = skip;
      }

      // Validate sortBy with whitelist
      if (req.body.sortBy) {
        if (typeof req.body.sortBy !== 'string') {
          return Response.BadRequest(res, 'SortBy must be a string');
        }
        const allowedSortFields = [
          'timestamp',
          'username',
          'method',
          'endpoint',
          'statusCode',
          'responseTime',
        ];
        const sortBy = req.body.sortBy.trim();
        if (!allowedSortFields.includes(sortBy)) {
          return Response.BadRequest(res, 'Invalid sortBy field');
        }
        options.sortBy = sortBy;
      }

      // Validate sortOrder
      if (req.body.sortOrder !== undefined) {
        const sortOrder = parseInt(req.body.sortOrder);
        if (sortOrder !== 1 && sortOrder !== -1) {
          return Response.BadRequest(res, 'Invalid sortOrder. Must be 1 or -1');
        }
        options.sortOrder = sortOrder;
      }

      Log.getLogsFiltered(filters, options)
        .then(result => {
          var filtered = auditTrail.getValidSignatureLogs(result);
          Response.Ok(res, filtered);
        })
        .catch(err => Response.Internal(res, err));
    } catch (error) {
      console.error('Error processing request:', error);
      Response.BadRequest(res, 'Invalid request parameters');
    }
  });
};
