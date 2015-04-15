/**
 * Holds the state of what API requests are currently in progress and maintains
 * reference to their deferreds
 *
 * @author Jordan Garcia (jordan@optimizely.com)
 */
var Nuclear = require('nuclear-js')
var actionTypes = require('../action_types')

var toImmutable = Nuclear.toImmutable

module.exports = Nuclear.Store({
  initialize: function() {
    this.on(actionTypes.API_ENTITY_FETCH_START, requestStarted)
    this.on(actionTypes.API_ENTITY_FETCH_SUCCESS, requestFinished)
    this.on(actionTypes.API_ENTITY_FETCH_FAIL, requestFinished)
  },
})

/**
 * payload.requestInfo
 * payload.deferred
 */
function requestStarted(state, payload) {
  if (!payload.requestInfo) {
    return state
  }

  return state.set(payload.requestInfo, payload.deferred)
}

/**
 * Store reference to the deferred when a request starts
 *
 * payload.requestInfo
 * payload.deferred
 */
function requestFinished(state, payload) {
  if (!payload.requestInfo) {
    return state
  }

  return state.remove(payload.requestInfo)
}
