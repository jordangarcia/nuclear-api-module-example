var flux = require('flux2')

flux.registerStores({
  'apiRequestCache': require('./stores/api_request_cache_store'),
  'apiRequestInProgress': require('./stores/api_request_in_progress_store'),
  'apiStubs': require('./stores/api_stubs_store'),
  'entityCache': require('./stores/entity_cache_store'),
})

module.exports = {
  fns: require('./fns'),

  actionTypes: require('./action_types'),

  fieldTypes: require('./field_types'),

  createEntityActions: require('./create_entity_actions'),

  createEntityGetters: require('./create_entity_getters'),
}
