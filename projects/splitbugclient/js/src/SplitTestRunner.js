//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('splitbug')

//@Export('SplitTestRunner')

//@Require('Class')
//@Require('Obj')
//@Require('TypeUtil')
//@Require('sonarbugclient.SonarbugClient')


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
var SonarbugClient =    bugpack.require('sonarbugclient.SonarbugClient');


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var SplitTestRunner = Class.extend(Obj, {

    //-------------------------------------------------------------------------------
    // Constructor
    //-------------------------------------------------------------------------------

    _constructor: function(splitTestRunnerObject) {

        //-------------------------------------------------------------------------------
        // Declare Variables
        //-------------------------------------------------------------------------------

        //TODO BRN: These tests can all be moved to the BugMarshaller when it's complete
        if (!splitTestRunnerObject) {
            throw new Error("splitTestRunnerObject object is required");
        }
        if (!TypeUtil.isString(splitTestRunnerObject.name)) {
            throw new Error("name must be a string");
        }
        if (!TypeUtil.isFunction(splitTestRunnerObject.controlFunction)) {
            throw new Error("controlFunction must be a function");
        }
        if (!TypeUtil.isFunction(splitTestRunnerObject.testFunction)) {
            throw new Error("testFunction must be a function");
        }

        /**
         * @private
         * @type {function()}
         */
        this.controlFunction = splitTestRunnerObject.controlFunction;

        /**
         * @private
         * @type {string}
         */
        this.name = splitTestRunnerObject.name;

        /**
         * @private
         * @type {function()}
         */
        this.testFunction = splitTestRunnerObject.testFunction;
    },


    //-------------------------------------------------------------------------------
    // Class Methods
    //-------------------------------------------------------------------------------

    /**
     * @param {SplitTestSession} splitTestSession
     */
    run: function(splitTestSession) {
        if (splitTestSession) {
            if (splitTestSession.getTestName() !== null && splitTestSession.getTestName() === this.name) {
                if (splitTestSession.getTestGroup() === "test") {
                    this.testFunction();
                } else {
                    this.controlFunction();
                }

                //TODO BRN: This is tight coupling. This should be removed from here and we can report this using an event dispatcher.

                SonarbugClient.track("splitTest", {
                    testName: splitTestSession.getTestName(),
                    testGroup: splitTestSession.getTestGroup()
                });
            } else {
                this.controlFunction();
            }
        } else {
            console.log("No split test session was provided. This usually happens when the split test server cannot be reached. Falling back to control function.");
            this.controlFunction();
        }
    }
});

//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

bugpack.export('splitbug.SplitTestRunner', SplitTestRunner);
