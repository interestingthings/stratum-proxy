/**
 * Created by jdean on 3/31/14.
 */
'use strict';

var rewire = require("rewire");
var server = rewire('../server');
var expect = require('chai').expect;
var sinon = require('sinon');
var tester = require('./utils').tester.server;
var library = require('./utils').library;


describe('Server test suite', function () {

  var test, netStub, serverSocketStub, serverStub;

  beforeEach(function () {
    test = tester(server);
    serverStub = {
      on: sinon.stub(),
      listen: sinon.stub().yieldsAsync(),
      write: sinon.stub()
    };
    serverSocketStub = library.stubSocket();
    netStub = {
      createServer: function (arg) {
        setTimeout(function () {
          arg(serverSocketStub);
        });
        return serverStub;
      }
    };
    server.__set__('net', netStub);
  });

  it('sanity', function () {
    expect(test.create()).to.not.equal(undefined);
  });

  it('#net.connect', function (done) {
  test.create().loaded.then(function () {
    done();
  });
});

  describe('after server loaded', function () {
    beforeEach(function (done) {
      test.create().connected.then(function () {
        done();
      });
    });


    function getAllDataListeners(socket) {
      var dataListeners = [];
      socket.on.getCalls().forEach(function (call) {
        if (call.args[0].indexOf('data') !== -1) {
          dataListeners.push(call.args[1]);
        }
      });
      return dataListeners;
    }

    function serverSendsData(data) {
      getAllDataListeners(test.options.socket).forEach(function (l) {
        l(data);
      });
    }

    function clientSendsData(data) {
      getAllDataListeners(serverSocketStub).forEach(function (l) {
        l(data);
      });
    }

    function readLastServerData(which) {
      var method = test.options.socket.write;
      var callee = method[which ? which : 'lastCall'];
      return callee.args[0];
    }

    function readLastClientData(which) {
      var method = serverSocketStub.write;
      var callee = which ? method[which] : method.lastCall;
      return callee.args[0];
    }

    it('Registers for data from client connect', function () {
      expect(serverSocketStub.on.secondCall.args[1]).to.be.a('function');
    });

    it('Receives data from connected client', function () {
      clientSendsData('{}\n');
      expect(readLastServerData()).to.equal('{}\n');
    });

    it('Sends data to connected client', function () {
      serverSendsData('{}\n');
      expect(readLastClientData()).to.equal('{}\n');
    });

    it('Server socket receives modified mining.authorized requests', function () {
      clientSendsData(JSON.stringify({
        method: 'mining.authorize',
        params: [ 'foo', 'bar']
      }) + '\n');
      expect(test.options.socket.write.callCount).to.equal(0);
      expect(serverSocketStub.end.callCount).to.equal(0);
    });

    it('closes invalid authorization', function () {
      clientSendsData(JSON.stringify({
        method: 'mining.authorize',
        params: [ 'bar', 'foo']
      }) + '\n');
      expect(serverSocketStub.end.callCount).to.equal(1);
    });

    it('closes invalid authorization', function () {
      clientSendsData(JSON.stringify({
        method: 'mining.authorize',
        params: [ 'foo1', 'bar']
      }) + '\n');
      expect(serverSocketStub.end.callCount).to.equal(1);
    });

  });


});