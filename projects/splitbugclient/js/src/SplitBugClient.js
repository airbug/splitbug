//TODO BRN: Remove the dependency on jquery. Should write a simple ajax library.

//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('splitbug')

//@Export('SplitbugClient')

//@Require('Class')
//@Require('Obj')
//@Require('TypeUtil')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Class =             bugpack.require('Class');
var Obj =               bugpack.require('Obj');
var TypeUtil =          bugpack.require('TypeUtil');


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var SplitbugClient = Class.extend(Obj, {

    //-------------------------------------------------------------------------------
    // Constructor
    //-------------------------------------------------------------------------------

    _constructor: function() {

        this._super();


        //-------------------------------------------------------------------------------
        // Declare Variables
        //-------------------------------------------------------------------------------

        /**
         * @private
         * @type {boolean}
         */
        this.configured = false;

        /**
         * @private
         * @type {?string}
         */
        this.host = null;

        /**
         * @private
         * @type {?number}
         */
        this.port = null;
    },


    //-------------------------------------------------------------------------------
    // Public Class Methods
    //-------------------------------------------------------------------------------

    /**
     * @param {{host: string, port: number}} config
     */
    configure: function(config) {
        if (!this.configured) {
            this.configured = true;
            this.host = config.host;
            this.port = config.port;
        }
    },

    /**
     * @param {string} userUuid
     * @param {Object} data
     * @param {function(Error, {userUuid: string, sessionUuid: string, testGroup: string, testName: string})}
     */
    establishSplitTestSession: function(userUuid, data, callback) {
        if (this.configured) {
            var url = this.buildSplitbugApiUrl() + "/api/split-test-session/establish";
            var dataObject = {
                userUuid: userUuid,
                data: data
            };
            this.makeAjaxRequest(url, dataObject, function(error, response) {
                if (!error) {
                    callback(null, response.data.splitTestSession);
                } else {
                    callback(error);
                }
            });
        } else {
            throw new Error("Must first configure client before calling establishSplitTestSession()");
        }
    },

    /**
     * @param {function(Error, {userUuid: string})} callback
     */
    generateSplitTestUser: function(callback) {
        if (this.configured) {
            var url = this.buildSplitbugApiUrl() + "/api/split-test-user/generate";
            var dataObject = {};
            this.makeAjaxRequest(url, dataObject, function(error, response) {
                if (!error) {
                    callback(null, response.data.splitTestUser);
                } else {
                    callback(error);
                }
            });
        } else {
            throw new Error("Must first configure client before calling generateSplitTestUser()");
        }
    },

    /**
     * @param {Object} splitTestObject
     * @param {function(Error, boolean)} callback
     */
    validateSplitTestSession: function(splitTestObject, callback) {
        if (this.configured) {
            var url = this.buildSplitbugApiUrl() + "/api/split-test-session/validate";
            var dataObject = {
                splitTestSession: splitTestObject
            };
            this.makeAjaxRequest(url, dataObject, function(error, response) {
                if (!error) {
                    callback(null, response.data.valid);
                } else {
                    callback(error);
                }
            });
        } else {
            throw new Error("Must first configure client before calling validateSplitTestSession()");
        }
    },


    //-------------------------------------------------------------------------------
    // Private Class Methods
    //-------------------------------------------------------------------------------

    /**
     * @private
     * @return {string}
     */
    buildSplitbugApiUrl: function() {
        var url = this.host;
        if (this.port) {
            url += ":" + this.port;
        }
        return url;
    },

    /**
     * @private
     * @param {string} url
     * @param {Object} dataObject
     * @param {function(Error, Object)} callback
     */
    makeAjaxRequest: function(url, dataObject, callback) {
        //TODO BRN: Remove dependency on jquery. Use our own library instead.
        $.ajax({
            url: url,
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify(dataObject),
            processData: false,
            crossDomain: true,
            type: "POST",
            error: function(jqXHR, textStatus, errorThrown) {
                var error = {
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    errorThrown: errorThrown
                };
                callback(error);
            },
            success: function(data, textStatus, jqXHR) {
                var response = {
                    data: data,
                    textStatus: textStatus,
                    jqXHR: jqXHR
                };
                callback(null, response);
            }
        });
    }
});


//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export('splitbug.SplitbugClient', SplitbugClient);
