var Nuclear = require('nuclear-js')
var actionTypes = require('../action_types')
var Immutable = require('immutable')

module.exports = Nuclear.Store({
  initialize: function() {
    this.on(actionTypes.API_ENTITY_FETCH_SUCCESS, cacheRequest)
    this.on(actionTypes.FLUSH_CACHE_STORE, reset)
  },
})

/**
 * Resets state of store
 * @param {Immutable.Map} state
 */
function reset(state) {
  return Immutable.Map({})
}

/**
 * payload.requestInfo {Immutable.Map}
 */
function cacheRequest(state, payload) {
  return state.set(payload.requestInfo, true)
}
