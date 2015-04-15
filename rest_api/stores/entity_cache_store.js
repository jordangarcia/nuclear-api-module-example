var Nuclear = require('nuclear-js')
var actionTypes = require('../action_types')

var toImmutable = Nuclear.toImmutable

module.exports = Nuclear.Store({
  initialize: function() {
    // loads an entity into store, semantically a non API fetch
    this.on(actionTypes.API_INJECT_ENTITY, loadEntityData)

    this.on(actionTypes.API_ENTITY_FETCH_SUCCESS, loadEntityData)
    this.on(actionTypes.API_ENTITY_FETCH_FAIL, onFetchFail)

    this.on(actionTypes.API_ENTITY_PERSIST_SUCCESS, loadEntityData)
    this.on(actionTypes.API_ENTITY_PERSIST_FAIL, onPersistFail)

    this.on(actionTypes.API_ENTITY_DELETE_SUCCESS, onDeleteSuccess)
    this.on(actionTypes.API_ENTITY_DELETE_FAIL, onDeleteFail)

    this.on(actionTypes.FLUSH_ENTITY_STORE, flushEntityStore);
  }
})

/**
 * payload.entity
 * @param {Immutable.Map} state
 * @param {object} payload
 */
function flushEntityStore(state, payload) {
  return state.delete(payload.entity);
}

/**
 * payload.data
 * payload.entity
 * @param {Immutable.Map} state
 * @param {object} payload
 */
function loadEntityData(state, payload) {
  var entity = payload.entity
  var data = payload.data

  if (!_.isArray(data)) {
    data = [data]
  }

  return state.withMutations(function(state) {
    data.forEach(function(entry) {
      state.setIn([entity, entry.id], toImmutable(entry))
    })
  })
}

/**
 * payload.id
 * payload.entity
 * @param {Immutable.Map} state
 * @param {object} payload
 */
function onDeleteSuccess(state, payload) {
  var entity = payload.entity
  var id = payload.id

  return state.removeIn([entity, id])
}

/**
 * payload.data
 * payload.entity
 * @param {Immutable.Map} state
 * @param {object} payload
 */
function onFetchFail(state, payload) {
  // noop right now
  return state
}

/**
 * payload.data
 * payload.entity
 * @param {Immutable.Map} state
 * @param {object} payload
 */
function onPersistFail(state, payload) {
  // noop right now
  return state
}

/**
 * payload.data
 * payload.entity
 * @param {Immutable.Map} state
 * @param {object} payload
 */
function onDeleteFail(state, payload) {
  // noop right now
  return state
}
