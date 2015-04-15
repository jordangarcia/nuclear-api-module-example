var _ = require('lodash')
var definition = require('./entity_definition')
var RestApi = require('modules/rest_api')

var baseEntityGetters = RestApi.createEntityGetters(definition);

module.exports = _.extend(baseEntityGetters, {
  // implement getters here
});
