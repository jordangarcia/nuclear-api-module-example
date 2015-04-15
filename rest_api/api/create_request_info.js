/**
 * Helper functions to create a canonical representation of
 * an API request
 *
 * Including the method: fetch, fetchAll, fetchPage
 * model.entity
 * model.parent (entity, parent)
 * requestParams: <object>
 *
 *
 * @author Jordan Garcia (jordan@optimizely.com)
 */
var _ = require('lodash')
var Immutable = require('immutable')

/**
 * Creates a canonical requestInfo object that holds
 * information such as entity, method and args
 * @param {string} entity
 * @param {string} method
 * @param {object} args
 * @return {object}
 */
module.exports = function(entity, method, args) {
  if (_.isNumber(args)) {
    args = {
      id: args
    }
  }

  return Immutable.fromJS({
    entity: entity,
    method: method,
    requestArgs: args,
  });
};
