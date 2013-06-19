//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('splitbug')

//@Export('Splitbug')

//@Require('Class')
//@Require('Obj')
//@Require('Proxy')
//@Require('Queue')
//@Require('cookies.Cookies')
//@Require('splitbug.SplitbugClient')
//@Require('splitbug.SplitTestRunner'')
//@Require('splitbug.SplitTestSession')
//@Require('splitbug.SplitTestUser')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Class =             bugpack.require('Class');
var Obj =               bugpack.require('Obj');
var Proxy =             bugpack.require('Proxy');
var Queue =             bugpack.require('Queue');
var Cookies =           bugpack.require('splitbug.Cookies');
var SplitbugClient =    bugpack.require('splitbug.SplitbugClient');
var SplitTestRunner =   bugpack.require('splitbug.SplitTestRunner');
var SplitTestSession =  bugpack.require('splitbug.SplitTestSession');
var SplitTestUser =     bugpack.require('splitbug.SplitTestUser');


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var Splitbug = Class.extend(Obj, {

    //-------------------------------------------------------------------------------
    // Constructor
    //-------------------------------------------------------------------------------

    _constructor: function(cookies, splitbugClient) {

        this._super();


        //-------------------------------------------------------------------------------
        // Declare Variables
        //-------------------------------------------------------------------------------

        /**
         * @private
         * @type {Boolean}
         */
        this.configureStarted = false;

        /**
         * @private
         * @type {boolean}
         */
        this.configured = false;

        /**
         * @private
         * @type {Cookies}
         */
        this.cookies = cookies;

        /**
         * @private
         * @type {SplitbugClient}
         */
        this.splitbugClient = splitbugClient;

        /**
         * @private
         * @type {Queue.<SplitTestRunner>}
         */
        this.splitTestRunnerQueue = new Queue();

        /**
         * @private
         * @type {SplitTestSession}
         */
        this.splitTestSession = null;

        /**
         * @private
         * @type {SplitTestUser}
         */
        this.splitTestUser = null;
    },


    //-------------------------------------------------------------------------------
    // Getters and Setters
    //-------------------------------------------------------------------------------



    //-------------------------------------------------------------------------------
    // Public Class Methods
    //-------------------------------------------------------------------------------

    /**
     * @param {{
     *  host: ?string,
     *  port: ?number
     * }} params
     * @param {function(error)} callback
     */
    configure: function(params, callback) {

        //TODO BRN: We should add a feature where the splitbug configuration can be injected via a server side api that is placed on the customer's server

        var _this = this;
        if (!this.configured) {
            if(!this.configureStarted) {
                this.configureStarted = true;
                var clientConfig = {
                    port: params.port || 80,
                    host: params.host || "http://splitbug.com"
                };
                this.splitbugClient.configure(clientConfig);
                this.setupSplitTestUser(function(error) {
                    if (!error) {
                        _this.setupSplitTestSession(function(error) {
                            _this.configured = true;
                            _this.processQueuedSplitTestRunners();
                            callback(error);
                        });
                    } else {
                        _this.configured = true;
                        _this.processQueuedSplitTestRunners();
                        callback(error);
                    }
                });
            } else {
                callback(new Error("splitbug in the middle of configuring"));
            }
        } else {
            callback(new Error("splitbug already configured"));
        }
    },

    /**
     * @param {{
     *  name: string,
     *  controlFunction: function(),
     *  testFunction: function()
     * }} params
     */
    splitTest: function(params) {

        //TODO BRN: We should be using the BugMarshaller to convert the params to a SplitTestRunner

        var splitTestRunner = new SplitTestRunner(params);
        if (this.configured) {
            splitTestRunner.run(this.splitTestSession);
        } else {
            this.splitTestRunnerQueue.enqueue(splitTestRunner);
        }
    },


    //-------------------------------------------------------------------------------
    // Private Class Methods
    //-------------------------------------------------------------------------------

    /**
     * @private
     * @param {SplitTestUser} splitTestUser
     * @param {function(Error, Object)} callback
     */
    establishSplitTestSession: function(splitTestUser, callback) {
        var data = {
            href: encodeURIComponent(window.location.href),
            userAgent: navigator.userAgent
        };
        //TODO BRN: We should use the BugMarshaller to convert the splitTestSessionObject to a SplitTestSession. This should be done within the client instead of having to do this here.
        this.splitbugClient.establishSplitTestSession(splitTestUser.getUserUuid(), data, function(error, splitTestSessionObject) {
            if (!error) {
                callback(null, new SplitTestSession(splitTestSessionObject));
            } else {
                callback(error);
            }
        });
    },

    /**
     * @private
     * @param {function(Error, SplitTestUser)} callback
     */
    generateSplitTestUser: function(callback) {
        //TODO BRN: We should use the BugMarshaller to convert the splitTestUserObject to a SplitTestUser. This should be done within the client instead of having to do this here.

        this.splitbugClient.generateSplitTestUser(function(error, splitTestUserObject) {
            if (!error) {
                callback(null, new SplitTestUser(splitTestUserObject));
            } else {
                callback(error);
            }
        });
    },

    /**
     * @private
     */
    processQueuedSplitTestRunners: function() {
        while (!this.splitTestRunnerQueue.isEmpty()) {
            var splitTestRunner = this.splitTestRunnerQueue.dequeue();
            splitTestRunner.run(this.splitTestSession);
        }
    },

    /**
     * @private
     * @param {function(Error)} callback
     */
    setupSplitTestSession: function(callback) {
        var _this = this;
        var splitTestSessionObject = this.retrieveSplitTestSessionFromCookies();
        if (splitTestSessionObject) {

            // NOTE BRN: We want to ensure we use the session in cookies when there is a failure to communicate with
            // the server. This way we don't show an alternate content until we are given a thumbs up or down.

            this.splitTestSession =  new SplitTestSession(splitTestSessionObject);
        }

        if (this.splitTestSession) {
            this.validateSplitTestSession(this.splitTestSession, function(error, valid) {
                if (!error) {
                    if (valid) {
                        callback();
                    } else {
                        _this.establishSplitTestSession(_this.splitTestUser, function(error, splitTestSession) {
                            if (!error) {
                                _this.splitTestSession = splitTestSession;
                                _this.storeSplitTestSessionToCookies(splitTestSession);
                                callback();
                            } else {
                                callback(error);
                            }
                        });
                    }
                } else {
                    callback(error);
                }
            })
        } else {
            this.establishSplitTestSession(this.splitTestUser, function(error, splitTestSession) {
                if (!error) {
                    _this.splitTestSession = splitTestSession;
                    _this.storeSplitTestSessionToCookies(splitTestSession);
                    callback();
                } else {
                    callback(error);
                }
            });
        }
    },

    /**
     * @private
     * @param {function(Error)} callback
     */
    setupSplitTestUser: function(callback) {
        var _this = this;
        var splitTestUserObject = this.retrieveSplitTestUserFromCookies();
        if (splitTestUserObject) {
            this.splitTestUser = new SplitTestUser(splitTestUserObject);

            //TEST
            console.log("Split test user loaded from cookies: ", this.splitTestUser);
        }
        if (!this.splitTestUser) {
            this.generateSplitTestUser(function(error, _splitTestUser) {
                if (!error) {
                    _this.splitTestUser = _splitTestUser;
                    _this.storeSplitTestUserToCookies(_splitTestUser);
                    callback();
                } else {
                    callback(error);
                }
            });
        } else {
            callback();
        }
    },

    /**
     * @private
     * @param {SplitTestSession} splitTestSession
     * @param {function(Error, boolean)} callback
     */
    validateSplitTestSession: function(splitTestSession, callback) {
        this.splitbugClient.validateSplitTestSession(splitTestSession.toObject(), function(error, valid) {
            if (!error) {
                callback(null, valid);
            } else {
                callback(error);
            }
        });
    },

    /**
     * @private
     * @return {Object}
     */
    retrieveSplitTestSessionFromCookies: function() {
        var sessionObject = this.cookies.getCookie("splitbug-test-session");
        if (sessionObject) {
            sessionObject = JSON.parse(sessionObject);
        }
        return sessionObject;
    },

    /**
     * @private
     * @return {Object}
     */
    retrieveSplitTestUserFromCookies: function() {
        var splitTestUserObject = this.cookies.getCookie("splitbug-test-user");
        if (splitTestUserObject) {
            splitTestUserObject = JSON.parse(splitTestUserObject);
        }
        return splitTestUserObject;
    },

    /**
     * @private
     * @param {SplitTestSession} splitTestSession
     */
    storeSplitTestSessionToCookies: function(splitTestSession) {
        var sessionObject = splitTestSession.toObject();
        this.cookies.setCookie("splitbug-test-session", JSON.stringify(sessionObject), Infinity, "/");
    },

    /**
     * @private
     * @param {SplitTestUser} splitTestUser
     */
    storeSplitTestUserToCookies: function(splitTestUser) {
        var splitTestUserObject = splitTestUser.toObject();
        this.cookies.setCookie("splitbug-test-user", JSON.stringify(splitTestUserObject), Infinity, "/");
    }
});


//-------------------------------------------------------------------------------
// Static Variables
//-------------------------------------------------------------------------------

/**
 * @static
 * @private
 * @type {Splitbug}
 */
Splitbug.instance = null;


//-------------------------------------------------------------------------------
// Static Methods
//-------------------------------------------------------------------------------

/**
 * @static
 * @return {Splitbug}
 */
Splitbug.getInstance = function() {
    if (!Splitbug.instance) {
        var cookies = new Cookies(document);
        var splitbugClient = new SplitbugClient();
        Splitbug.instance = new Splitbug(cookies, splitbugClient);
    }
    return Splitbug.instance;
};

Proxy.proxy(Splitbug, Proxy.method(Splitbug.getInstance), [
    "configure",
    "splitTest"
]);


//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export('splitbug.Splitbug', Splitbug);
