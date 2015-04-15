/**
 * Unit tests requester factory
 *
 * @author Jordan Garcia (jordan@optimizely.com)
 */
var _ = require('lodash')
var requesterFactory = require('../api/requester_factory')
var Api = requesterFactory.Api

var BASE_URL = '/api/v1'

var HEADERS = {
  header1: 'value1'
}

describe('modules/rest_api/api/requester_factory', function() {
  var request

  beforeEach(function() {
    var def = $.Deferred().resolve({})
    sinon.stub(Api, 'request').returns(def)

    request = requesterFactory.create({
      baseUrl: BASE_URL,
      headers: HEADERS,
    })
  })

  afterEach(function() {
    Api.request.restore()
  })

  describe('#one #all and #filter methods', function() {
    it("should point to the proper API endpoint when calling .one()", function() {
      var project = request().one('projects', 4001)
      expect(project._getUrl()).to.be('/api/v1/projects/4001')
    })

    it("should point to the proper API endpoint when calling .all()", function() {
      var project = request().all('projects')
      expect(project._getUrl()).to.be('/api/v1/projects')
    })

    it("should point to the proper API endpoint when calling .one() then .all()", function() {
      var experiments = request().one('projects', 4001).all('experiments')
      expect(experiments._getUrl()).to.be('/api/v1/projects/4001/experiments')
    })

    it("should add filter params when calling .filter()", function() {
      var experiments = request()
        .one('projects', 4001)
        .all('experiments')
        .filter('filter1', 123)
        .filter('filter2', 'value')

      var expected = '/api/v1/projects/4001/experiments?filter=filter1:123&filter=filter2:value'

      expect(experiments._getUrl()).to.be(expected)
    })

    it('should add multiple filter params at once if specified', function() {
      var experiments = request()
        .one('projects', 4001)
        .all('experiments')
        .filter({
          filter1: 123,
          filter2: 'value'
        })

      var expected = '/api/v1/projects/4001/experiments?filter=filter1:123&filter=filter2:value'

      expect(experiments._getUrl()).to.be(expected)
    })
  }) // #one #all and #filter methods

  describe('#get', function() {
    it("should call Api.request with the correct arguments", function() {
      var endpoint = request().one('projects', 4001)

      endpoint.get()

      expect(Api.request.calledOnce).to.be(true)
      expect(Api.request.getCall(0).args[0]).to.eql({
        url: endpoint._getUrl(),
        type: 'GET'
      })
    })

    it('should pipe the deserialized data back when doing a `one` request', function(done) {
      var entity = {
        id: 4001,
        name: 'name'
      }
      var def = $.Deferred().resolve(entity)
      Api.request.returns(def)

      request().one('projects', 4001).get().then(function(result) {
        expect(result).to.eql(entity)
        done()
      })
    })

    it('should pipe the deserialized data back when doing an `all` request', function(done) {
      var entities = [
        {
          id: 1,
          name: 'name1'
        },
        {
          id: 2,
          name: 'name2'
        },
      ]
      var def = $.Deferred().resolve(entities)
      Api.request.returns(def)

      request().one('projects', 4001).all('experiments').get().then(function(results) {
        expect(entities).to.eql(results)
        done()
      })
    })
  }) // #get

  describe('#post', function() {
    it("should call Api.request with the correct arguments", function() {
      var endpoint = request().all('projects')

      var data = {
        foo: 'bar',
        arr: [1, 2, 3]
      }

      endpoint.post(data)

      expect(Api.request.calledOnce).to.be(true)
      expect(Api.request.getCall(0).args[0]).to.eql({
        data: data,
        url: endpoint._getUrl(),
        type: 'POST'
      })
    })

    it("should throw an error if invoked after .one()", function() {
      var endpoint = request().one('projects', 4001)

      expect(function() {
        endpoint.post({
          foo: 'bar'
        })
      }).to.throwError()
    })
  }) // #post

  describe('#put', function() {
    it("should call Api.request with the correct arguments", function() {
      var data = {
        id: 123,
        foo: 'bar',
        arr: [1, 2, 3]
      }

      var endpoint = request().one('projects', data.id)

      endpoint.put(data)

      expect(Api.request.calledOnce).to.be(true)
      expect(Api.request.getCall(0).args[0]).to.eql({
        data: data,
        url: endpoint._getUrl(),
        type: 'PUT'
      })
    })

    it("should throw an error if invoked after .all()", function() {
      expect(function() {
        request().all('projects').put({
          foo: 'bar'
        })
      }).to.throwError()
    })
  }) // #put

  describe('#delete', function() {
    it("should make an Api.request call with the correct arguments", function() {
      var endpoint = request().one('projects', 4001)
      endpoint.delete()

      expect(Api.request.calledOnce).to.be(true)
      expect(Api.request.getCall(0).args[0]).to.eql({
        url: endpoint._getUrl(),
        type: 'DELETE'
      })
    })

    it("should throw an error if invoked after .all()", function() {
      var endpoint = request().all('projects')

      expect(function() {
        endpoint.delete()
      }).to.throwError()
    })
  }) // #delete
}) // services/api_factory
