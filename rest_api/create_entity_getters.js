var Immutable = require('immutable');

/**
 * Creates boilerplate getters for an entity module
 */
module.exports = function(entityDef) {
  var entityCacheGetter = [
    ['entityCache', entityDef.entity],
    /**
     * @return {Immutable.Map}
     */
    function(entityMap) {
      // protect the entityMap here from being undefined, there are cases
      // where an entity type isn't loaded yet, so we need to always to
      // return an Immutable.Map for getters downstream
      if (!entityMap) {
        return Immutable.Map();
      } else {
        return entityMap;
      }
    }
  ];

  return {
    entityCache: entityCacheGetter,

    /**
     * Returns getter that pulls an entity by id
     * @return {Getter}
     */
    byId: function(id) {
      return [
        entityCacheGetter,
        function(entityMap) {
          return entityMap.get(id);
        }
      ];
    },
  }
};
