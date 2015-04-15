/**
 * Holds the state of what API endpoints are stubbed for testing
 * or mocking
 *
 * @author Jordan Garcia (jordan@optimizely.com)
 */
var _ = require('lodash');
var sprintf = require('sprintf');
var Nuclear = require('nuclear-js');
var actionTypes = require('../action_types');

var toImmutable = Nuclear.toImmutable;

module.exports = Nuclear.Store({
  getInitialState: function() {
    return toImmutable({
      entityData: {},
      timeout: null,
    });
  },

  initialize: function() {
    this.on(actionTypes.API_STUB_ENTITY, stubEntity);
    this.on(actionTypes.SET_API_STUB_TIMEOUT, setStubTimeout);
    this.on(actionTypes.API_RESTORE_ENTITY_STUB, restoreEntityStub);
  },
});

/**
 * payload {Object} mapping of entity => array of entity objects
 */
function stubEntity(state, payload) {
  var entityData = state.get('entityData').withMutations(function(entityData) {
    _.each(payload, function(objects, entity) {
      if (entityData.has(entity)) {
        console.warn(sprintf("Stubbing entity %s which is already stubbed"), entity);
      }
      entityData.set(entity, toImmutable(objects));
    });
  });

  return state.set('entityData', entityData);
}

/**
 * payload.timeout
 */
function setStubTimeout(state, payload) {
  return state.set('timeout', payload.timeout);
}

/**
 * Unstubs an entity
 */
function restoreEntityStub(state, payload) {
  return state.deleteIn(['entityData', payload.entity]);
}
