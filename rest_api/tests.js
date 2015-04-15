/**
 * API module tests
 *
 * @author Jordan Garcia
 */
require('atomic-config').set({
  api: {
    baseUrl: '/api/v1'
  }
})

var flux = require('flux2')
var Immutable = require('immutable')
var toImmutable = require('nuclear-js').toImmutable
var toJS = require('nuclear-js').toJS

var apiActionTypes = require('./action_types')
var requesterFactory = require('./api/requester_factory')
var testHelpers = require('./test_helpers')
var RestApi = require('./index')

describe("modules/rest_api", function() {
  var requestStub
  // mock data
  var proj1 = { id: 1, project_name: "Project 1", include_jquery: true,  project_platforms: ['web'] }
  var proj2 = { id: 2, project_name: "Project 2", include_jquery: false, project_platforms: ['web', 'ios'] }
  var proj3 = { id: 3, project_name: "Project 3", include_jquery: true,  project_platforms: ['web', 'ios'] }
  var proj4 = { id: 4, project_name: "Project 4", include_jquery: false,  project_platforms: ['ios'] }

  beforeEach(function() {
    requestStub = sinon.stub(requesterFactory.Api, 'request')
    requestStub.returns($.Deferred().resolve({}))
  })

  afterEach(function() {
    requesterFactory.Api.request.restore()
    flux.reset()
  })

  describe("#createEntityActions", function() {
    var projectActions = RestApi.createEntityActions({
      entity: 'projects',
    });

    var audienceActions = RestApi.createEntityActions({
      entity: 'audiences',

      parent: {
        entity: 'projects',
        key: 'project_id',
      },

      serialize: function(data) {
        if (data.conditions) {
          data.conditions = JSON.stringify(data.conditions);
        }
        return data;
      },

      deserialize: function(data) {
        if (data.conditions) {
          data.conditions = JSON.parse(data.conditions);
        }
        return data;
      },
    });

    describe("#fetch", function() {
      beforeEach(function() {
        var def = $.Deferred()
        requestStub.withArgs({
          url: '/api/v1/projects/1',
          type: 'GET',
        }).returns(def)
        setTimeout(function() {
          def.resolve(proj1)
        })
      })

      it("should GET /api/v1/projects/<id>", function(done) {
        projectActions.fetch(1).then(function(resp) {
          expect(resp).to.eql(proj1)
          done()
        })
      })

      it("should only make the request once, and return cached version subsequently", function(done) {
        projectActions.fetch(1).then(function(resp) {
          projectActions.fetch(1).then(function(resp) {
            expect(resp).to.eql(proj1)
            expect(requestStub.calledOnce).to.be.true
            done()
          })
        })
      })

      it("should make api request when force parameter is true", function(done) {
        projectActions.fetch(1).then(function(resp) {
          projectActions.fetch(1, true).then(function(resp) {
            expect(requestStub.callCount).to.be(2)
            done()
          })
        })
      })

      it("should return the same deferred when a request is in progress", function() {
        var def1 = projectActions.fetch(1)
        var def2 = projectActions.fetch(1)
        expect(def1).to.be(def2)
      })

      describe("when there is deserialize method", function() {
        var saveDeferred, responseData;

        beforeEach(function() {
          responseData = {
            id: 1,
            project_id: 2,
            conditions: JSON.stringify(['foo', 'bar']),
          };

          saveDeferred = $.Deferred()

          requestStub.withArgs({
            url: '/api/v1/audiences/1',
            type: 'GET',
          }).returns(saveDeferred);

          setTimeout(function() {
            saveDeferred.resolve(responseData);
          }, 0)
        });

        it('should return the deserialized data', function(done) {
          audienceActions.fetch(1).then(function(audience) {
            expect(audience).to.eql({
              id: 1,
              project_id: 2,
              conditions: ['foo', 'bar'],
            });
            done();
          });
        });
      });
    }) // #fetch

    describe("#fetchAll", function() {
      var projects = [proj1, proj2, proj3]

      beforeEach(function() {
        var allProjectsDef = $.Deferred()
        var filteredProjectsDef = $.Deferred()
        requestStub.withArgs({
          url: '/api/v1/projects',
          type: 'GET',
        }).returns(allProjectsDef)
        requestStub.withArgs({
          url: '/api/v1/projects?filter=id:1',
          type: 'GET',
        }).returns(filteredProjectsDef)

        setTimeout(function() {
          allProjectsDef.resolve(projects)
          filteredProjectsDef.resolve([proj1])
        })
      })

      it("should GET /api/v1/projects", function(done) {
        projectActions.fetchAll().then(function(resp) {
          expect(resp).to.eql(projects)
          done()
        })
      })

      it("should GET /api/v1/projects?filter=account_id:123&filter=code_revision:52", function(done) {
        projectActions.fetchAll({
          account_id: 123,
          code_revision: 52,
        }).then(function(resp) {
          expect(requestStub.firstCall.args[0]).to.eql({
            url: '/api/v1/projects?filter=account_id:123&filter=code_revision:52',
            type: 'GET',
          })
          done()
        })
      })

      it("should support sorting by multiple fields", function(done) {
        projectActions.fetchAll({
          $order: ['id:desc', 'project_name:asc']
        }).then(function(resp) {
          expect(requestStub.firstCall.args[0]).to.eql({
            url: '/api/v1/projects?order=id:desc&order=project_name:asc',
            type: 'GET',
          })
          done()
        })
      })

      it("should only make the request once, and return cached version subsequently", function(done) {
        var filters = { id: 1 }
        projectActions.fetchAll(filters).then(function(resp) {
          projectActions.fetchAll(filters).then(function(resp) {
            expect(requestStub.calledOnce).to.be.true
            expect(resp).to.eql([proj1])
            done()
          })
        })
      })

      it("should make api request when force parameter is true", function(done) {
        projectActions.fetchAll().then(function(resp) {
          projectActions.fetchAll({}, true).then(function(resp) {
            expect(requestStub.callCount).to.be(2)
            done()
          })
        })
      })

      it("should return the same deferred when a request is in progress", function() {
        var def1 = projectActions.fetchAll()
        var def2 = projectActions.fetchAll()
        expect(def1).to.be(def2)
      })

      describe("when there is deserialize method", function() {
        var saveDeferred, responseData;

        beforeEach(function() {
          responseData = [{
            id: 1,
            project_id: 2,
            conditions: JSON.stringify(['foo', 'bar']),
          }];

          saveDeferred = $.Deferred()

          requestStub.withArgs({
            url: '/api/v1/projects/2/audiences',
            type: 'GET',
          }).returns(saveDeferred);

          setTimeout(function() {
            saveDeferred.resolve(responseData);
          }, 0)
        });

        it('should return the deserialized data', function(done) {
          audienceActions.fetchAll({
            project_id: 2,
          }).then(function(audiences) {
            expect(audiences).to.eql([{
              id: 1,
              project_id: 2,
              conditions: ['foo', 'bar'],
            }]);
            done();
          });
        });
      });
    }) // #fetchAll

    describe("#fetchPage", function() {
      it("should GET /api/v1/projects?offset=5&limit=10", function(done) {
        projectActions.fetchPage({
          $offset: 5,
          $limit: 10,
        }).then(function(resp) {
          expect(requestStub.firstCall.args[0]).to.eql({
            url: '/api/v1/projects?limit=10&offset=5',
            type: 'GET',
          })
          done()
        })
      })

      describe("when there is deserialize method", function() {
        var saveDeferred, responseData;

        beforeEach(function() {
          responseData = [{
            id: 1,
            project_id: 2,
            conditions: JSON.stringify(['foo', 'bar']),
          }];

          saveDeferred = $.Deferred()

          requestStub.withArgs({
            url: '/api/v1/projects/2/audiences?limit=10&offset=5',
            type: 'GET',
          }).returns(saveDeferred);

          setTimeout(function() {
            saveDeferred.resolve(responseData);
          }, 0)
        });

        it('should return the deserialized data', function(done) {
          audienceActions.fetchPage({
            $offset: 5,
            $limit: 10,
            project_id: 2,
          }).then(function(audiences) {
            expect(audiences).to.eql([{
              id: 1,
              project_id: 2,
              conditions: ['foo', 'bar'],
            }]);
            done();
          });
        });
      });
    }) // #fetchPage

    describe("#save", function() {
      it("should POST /api/v1/projects with the correct data", function(done) {
        var instance = {
          project_name: "Project 4",
          include_jquery: true,
        }

        projectActions.save(instance).then(function(resp) {
          expect(requestStub.firstCall.args[0]).to.eql({
            type: 'POST',
            data: instance,
            url: '/api/v1/projects',
          })
          done()
        })
      })

      it("should PUT /api/v1/projects with the correct data", function(done) {
        var instance = {
          id: 4,
          project_name: "Project 4",
          include_jquery: true,
        }

        projectActions.save(instance).then(function(resp) {
          expect(requestStub.firstCall.args[0]).to.eql({
            type: 'PUT',
            data: instance,
            url: '/api/v1/projects/4',
          })
          done()
        })

      })

      describe("when there is a serialize/deserialize defined", function() {
        var saveDeferred, instance, requestData, responseData;

        beforeEach(function() {
          instance = {
            project_id: 2,
            conditions: ['foo', 'bar'],
          };

          requestData = {
            project_id: 2,
            conditions: JSON.stringify(['foo', 'bar']),
          };

          responseData = {
            id: 1,
            project_id: 2,
            conditions: JSON.stringify(['foo', 'bar']),
          };
          saveDeferred = $.Deferred()

          requestStub.withArgs({
            url: '/api/v1/projects/2/audiences',
            data: requestData,
            type: 'POST',
          }).returns(saveDeferred);

          setTimeout(function() {
            saveDeferred.resolve(responseData);
          }, 0)
        })

        it("should call deserialize on the data before persisting", function(done) {
          var expected = {
            project_id: 2,
            conditions: JSON.stringify(['foo', 'bar']),
          };
          audienceActions.save(instance).then(function(resp) {
            expect(requestStub.firstCall.args[0]).to.eql({
              type: 'POST',
              data: expected,
              url: '/api/v1/projects/2/audiences',
            })
            done()
          })
        });

        it("should call serialize on the data being returned", function(done) {
          audienceActions.save(instance).then(function(resp) {
            expect(resp.conditions).to.eql(['foo', 'bar']);
            done()
          })
        });
      })
    }) // #save

    describe("#delete", function() {
      it("should DELETE /api/v1/projects/1", function(done) {
        projectActions.delete(proj1).then(function(resp) {
          expect(requestStub.firstCall.args[0]).to.eql({
            type: 'DELETE',
            url: '/api/v1/projects/1',
          })
          done()
        })
      })
    }) // #delete

    describe('#flush', function () {
      var projectGetters = RestApi.createEntityGetters({
        entity: 'projects',
      });

      beforeEach(function() {
        testHelpers.loadEntities('projects', [proj1, proj2]);
      })

      it('should flush the entity store', function() {
        var result = flux.evaluateToJS(projectGetters.entityCache)
        expect(result).to.eql({
          1: proj1,
          2: proj2,
        });
        projectActions.flush();
        var result = flux.evaluateToJS(projectGetters.entityCache)
        expect(result).to.eql({});
      });
    })
  }) // #createEntityActions

  describe("#createEntityGetters", function() {
    var entityDef = {
      entity: 'projects'
    }
    var projectGetters

    beforeEach(function() {
      projectGetters = RestApi.createEntityGetters(entityDef)
    })

    describe("entityCache", function() {
      beforeEach(function() {
        testHelpers.loadEntities('projects', [proj1, proj2])
      })

      it("should evaluate correctly", function() {
        var result = flux.evaluateToJS(projectGetters.entityCache)

        expect(result).to.eql({
          1: proj1,
          2: proj2,
        })
      })
    })
  })

  describe("Stubbing entities", function() {
    beforeEach(function() {

    })
    it("should use the stubbed entity data and not call the crudAction", function() {

    });
  }); // Stubbing entities
}) // modules/rest_api
