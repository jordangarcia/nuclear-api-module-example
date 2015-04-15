/**
 * Tests the basic fetching / saving / deleting logic without the nculear store
 * layer for caching
 *
 * @author Jordan Garcia
 */
var crudActions = require('../crud_actions')
var requesterFactory = require('../api/requester_factory')

// mock entity defintiions

var projectsDef = {
  entity: 'projects',
}

var experimentsDef = {
  entity: 'experiments',
  parent: {
    entity: 'projects',
    key: 'project_id',
  },
}

var relationshipConfig = {
  isRelationshipEntity: true,
  entity: 'relationshipmodels',
  parents: [
    {
      entity: 'parent1s',
      key: 'parent1_id'
    },
    {
      entity: 'parent2s',
      key: 'parent2_id'
    }
  ]
}

describe("modules/rest_api/crud_actions", function() {
  var requestStub
  beforeEach(function() {
    requestStub = sinon.stub(requesterFactory.Api, 'request')
  })

  afterEach(function() {
    requesterFactory.Api.request.restore()
  })

  describe("save - normal entity", function() {
    beforeEach(function() {
      requestStub.returns($.Deferred().resolve({}))
    })

    describe("entity with no parent", function() {
      it("should make a POST request when instance.id is undefined", function() {
        var instance = {
          name: 'name',
          description: 'description'
        }

        crudActions.save(projectsDef, instance)

        var expectedArgs = {
          type: 'POST',
          url: '/api/v1/projects',
          data: instance
        }

        expect(requestStub.calledOnce).to.be(true)
        expect(requestStub.getCall(0).args[0]).to.eql(expectedArgs)
      })

      it("should return a deferred with the updated data and not mutate the instance", function(done) {
        var instance = {
          name: 'name',
          description: 'description'
        }

        var responseData = {
          id: 1,
          name: 'name',
          description: 'description',
          last_modified: 123
        }

        // create a mock ajax request deferred and resolve
        requestStub.returns($.Deferred().resolve(responseData))

        crudActions.save(projectsDef, instance).then(function(updatedInstance) {
          expect(instance.id).to.be(undefined)
          expect(instance.name).to.be('name')
          expect(instance.description).to.be('description')
          expect(instance.last_modified).to.be(undefined)

          // verify the updated instance
          expect(updatedInstance.id).to.be(1)
          expect(updatedInstance.name).to.be('name')
          expect(updatedInstance.description).to.be('description')
          expect(updatedInstance.last_modified).to.be(123)
          done()
        })
      })

      it("should make a PUT request when instance.id is defined", function() {
        var instance = {
          id: 123,
          name: 'name',
          description: 'description'
        }

        crudActions.save(projectsDef, instance)

        var expectedArgs = {
          type: 'PUT',
          url: '/api/v1/projects/123',
          data: instance
        }

        expect(requestStub.calledOnce).to.be(true)
        expect(requestStub.getCall(0).args[0]).to.eql(expectedArgs)
      })
    }) // entity with no parent

    describe("entity with one parent", function() {
      it("should make a POST request when instance.id is undefined", function() {
        var instance = {
          project_id: 123,
          name: 'name',
          description: 'description'
        }

        crudActions.save(experimentsDef, instance)

        var expectedArgs = {
          type: 'POST',
          url: '/api/v1/projects/123/experiments',
          data: instance
        }

        expect(requestStub.calledOnce).to.be(true)
        expect(requestStub.getCall(0).args[0]).to.eql(expectedArgs)
      })

      it("should make a PUT request when instance.id is defined", function() {
        var instance = {
          id: 1,
          project_id: 123,
          name: 'name',
          description: 'description'
        }

        crudActions.save(experimentsDef, instance)

        var expectedArgs = {
          type: 'PUT',
          url: '/api/v1/experiments/1',
          data: instance
        }

        expect(requestStub.calledOnce).to.be(true)
        expect(requestStub.getCall(0).args[0]).to.eql(expectedArgs)
      })
    }) // entity with one parent
  }) // save - normal entity

  describe("delete - normal entity", function() {
    var fakeId = 1

    beforeEach(function() {
      var result = $.Deferred().resolve()

      requestStub.withArgs({
        type: 'DELETE',
        url: '/api/v1/projects/' + fakeId
      }).returns(result)
    })

    it("should call the proper endpoint with the 'DELETE' method", function(done) {
      var instance = {
        id: fakeId,
        name: 'name'
      }

      crudActions.delete(projectsDef, instance).then(function() {
        expect(requestStub.calledOnce).to.be(true)
        expect(requestStub.getCall(0).args[0]).to.eql({
          type: 'DELETE',
          url: '/api/v1/projects/' + fakeId
        })
        done()
      })
    })
  }) // delete - normal entity

  describe("fetch - normal entity", function() {
    var fakeId = 1

    beforeEach(function() {
      var result = $.Deferred().resolve({ id: fakeId, name: 'loaded name' })
      requestStub.withArgs({
        type: 'GET',
        url: '/api/v1/projects/' + fakeId
      }).returns(result)
    })

    it("should fetch an instance by id", function(done) {
      crudActions.fetch(projectsDef, fakeId).then(function(instance) {
        expect(instance).to.eql({
          id: fakeId,
          name: 'loaded name'
        })
        done()
      })
    })

    it('should error if the instance is not found', function(done) {
      var result = $.Deferred().reject()
      requestStub.withArgs({
        type: 'GET',
        url: '/api/v1/projects/' + fakeId
      }).returns(result)

      var noop = function(){}
      crudActions.fetch(projectsDef, fakeId).then(noop, function() {
        done()
      })
    })
  }) // fetch - normal entity

  describe("fetchAll - normal entity", function() {
    describe("entity with no parent", function() {
      beforeEach(function() {
        var projectList = [{ id: 1, other_id: 1 }, { id: 2, other_id: 2 }, { id: 3, other_id: 2 }]
        var projectListPromise = $.Deferred().resolve(projectList)
        var filteredProjectListPromise = $.Deferred().resolve(_.filter(projectList, { other_id: 2 }))
        var doubleFilteredProjectListPromise = $.Deferred().resolve(_.filter(projectList, function (object) {
          return (object.id === 2) || (object.id === 3)
        }))

        requestStub.withArgs({
          type: 'GET',
          url: '/api/v1/projects',
        }).returns(projectListPromise)

        requestStub.withArgs({
          type: 'GET',
          url: '/api/v1/projects?filter=other_id:2',
        }).returns(filteredProjectListPromise)

        requestStub.withArgs({
          type: 'GET',
          url: '/api/v1/projects?filter=id:2&filter=id:3',
        }).returns(doubleFilteredProjectListPromise)
      })

      it('should fetch all instances of the model', function(done) {
        crudActions.fetchAll(projectsDef).then(function(projects) {
          expect(projects[0].id).to.be(1)
          expect(projects[1].id).to.be(2)
          expect(projects[2].id).to.be(3)

          expect(projects.length).to.be(3)
          done()
        })
      })

      it('should fetch all instances of the model matching the passed in filter', function(done) {
        var filters = { other_id: 2 }
        crudActions.fetchAll(projectsDef, filters).then(function(projects) {
          expect(projects[0].id).to.be(2)
          expect(projects[0].other_id).to.be(2)
          expect(projects[1].id).to.be(3)
          expect(projects[1].other_id).to.be(2)

          expect(projects.length).to.be(2)
          done()
        })
      })

      it('should fetch all instances of the model matching the passed in filter with an array of values', function(done) {
        var filters = { id: [2, 3] }
        crudActions.fetchAll(projectsDef, filters).then(function(projects) {
          expect(projects[0].id).to.be(2)
          expect(projects[1].id).to.be(3)
          expect(projects.length).to.be(2)
          done()
        })
      })
    }) // entity with no parent

    describe("entity with a single parent", function() {
      beforeEach(function() {
        var experimentList = [{ id: 1, other_id: 1 }, { id: 2, other_id: 2 }, { id: 3, other_id: 2 }]
        var experimentListPromise = $.Deferred().resolve(experimentList)

        requestStub.withArgs({
          type: 'GET',
          url: '/api/v1/projects/123/experiments',
        }).returns(experimentListPromise)
      })

      it("should throw an error if fetchAll is called without the parent key specified", function() {
        expect(function() {
          crudActions.fetchAll(experimentsDef, {
            other_id: 2
          })
        }).to.throwError()
      })

      it("should fetch all entities by their parent id", function(done) {
        var filters = { project_id: 123 }
        crudActions.fetchAll(experimentsDef, filters).then(function(experiments) {
          expect(experiments[0].id).to.be(1)
          expect(experiments[1].id).to.be(2)
          expect(experiments[2].id).to.be(3)

          expect(experiments.length).to.be(3)
          done()
        })
      })
    }) // with a model with a parent association
  }) // fetchAll - normal entity

  describe('fetch - relationship entity', function() {
    var fakeParent1Id = 1
    var fakeParent2Id = 2

    beforeEach(function() {
      var result = $.Deferred().resolve({
        id: 123,
        parent1_id: fakeParent1Id,
        parent2_id: fakeParent2Id,
        data: 'loaded data'
      })

      requestStub.withArgs({
        type: 'GET',
        url: '/api/v1/parent1s/' + fakeParent1Id + '/parent2s/' + fakeParent2Id
      }).returns(result)
    })

    it('should fetch a relationship entity instance by parent IDs from the API', function(done) {
      var fetchArgs = { parent1_id: fakeParent1Id, parent2_id: fakeParent2Id }
      crudActions.fetch(relationshipConfig, fetchArgs).then(function(instance) {
        expect(instance.parent1_id).to.be(fakeParent1Id)
        expect(instance.parent2_id).to.be(fakeParent2Id)
        expect(instance.data).to.be('loaded data')
        done()
      })
    })

    it('should throw error if only one parent ID is supplied', function() {
      expect(function() {
        var fetchArgs = { parent1_id: fakeParent1Id }
        crudActions.fetch(relationshipConfig, fetchArgs)
      }).to.throwError()
    })
  }) // fetch - relationship entity

  describe('fetchAll - relationship entity', function() {
    var expectedInstances = [
      { parent1_id: 1, parent2_id: 123, data: 'instance 1 loaded data' },
      { parent1_id: 1, parent2_id: 456, data: 'instance 2 loaded data' }
    ]

    beforeEach(function() {
      var result = $.Deferred().resolve(expectedInstances)

      requestStub.withArgs({
        type: 'GET',
        url: '/api/v1/parent1s/1/parent2s'
      }).returns(result)
    })

    it('should fetch all relationship entity instances with matching parent IDs from the API', function(done) {
      var fetchArgs = { parent1_id: 1 }

      crudActions.fetchAll(relationshipConfig, fetchArgs).then(function(instances) {
        expect(instances).to.eql(expectedInstances)
        done()
      })
    })

    it('should throw error if all parent IDs are supplied', function() {
      var fetchArgs = { parent1_id: 1, parent2_id: 123 }

      expect(function() {
        crudActions.fetchAll(relationshipConfig, fetchArgs)
      }).to.throwError()
    })
  }) // fetchAll - relationship entity

  describe("save - relationship entity", function() {
    beforeEach(function() {
      requestStub.returns($.Deferred().resolve({}))
    })

    it('should do a PUT request when saving a new relationship entity', function(done) {
      var instance = {
        id: 123,
        parent1_id: 1,
        parent2_id: 2,
        data: 'some data'
      };

      var expectedArgs = {
        type: 'PUT',
        url: '/api/v1/parent1s/1/parent2s/2',
        data: instance
      };

      crudActions.save(relationshipConfig, instance).then(function(newInstance) {
        expect(requestStub.calledOnce).to.be(true);
        expect(requestStub.getCall(0).args[0]).to.eql(expectedArgs);
        done();
      })
    });
  }) // save - relationship entity

  describe("delete - relationship entity", function() {
    beforeEach(function() {
      var result = $.Deferred().resolve()
      requestStub.withArgs({
        type: 'DELETE',
        url: '/api/v1/parent1s/1/parent2s/2',
      }).returns(result);
    });

    it("should call the proper endpoint with the 'DELETE' method", function(done) {
      var instance = {
        parent1_id: 1,
        parent2_id: 2,
        data: 'some data'
      };

      crudActions.delete(relationshipConfig, instance).then(function() {
        expect(requestStub.calledOnce).to.be(true);
        expect(requestStub.getCall(0).args[0]).to.eql({
          type: 'DELETE',
          url: '/api/v1/parent1s/1/parent2s/2',
        });
        done();
      });
    });
  }) // delete - relationship entity

  describe("transform entity", function() {
    var transformDef = {
      entity: 'transform',

      serialize: function(instance) {
        instance.prop1 = 'serialize'
        return instance
      },

      deserialize: function(instance) {
        instance.prop1 = 'deserialize'
        return instance
      },
    }

    beforeEach(function() {
      requestStub.returns($.Deferred().resolve({}))
    })

    it("should serialize the instance before POSTing to API", function(done) {
      var instance = { prop1: 'unserialized', prop2: 'hey' }

      crudActions.save(transformDef, instance).then(function(result) {
        expect(requestStub.firstCall.args[0]).to.eql({
          url: '/api/v1/transform',
          type: 'POST',
          data: { prop1: 'serialize', prop2: 'hey' },
        })
        expect(instance.prop1).to.be('unserialized')
        done()
      })
    })

    it("should serialize the instance before PUTing to API", function(done) {
      var instance = { id: 1, prop1: 'unserialized', prop2: 'hey' }

      crudActions.save(transformDef, instance).then(function(result) {
        expect(requestStub.firstCall.args[0]).to.eql({
          url: '/api/v1/transform/1',
          type: 'PUT',
          data: { id: 1, prop1: 'serialize', prop2: 'hey' },
        })
        expect(instance.prop1).to.be('unserialized')
        done()
      })
    })
  })
}) // API Extension
