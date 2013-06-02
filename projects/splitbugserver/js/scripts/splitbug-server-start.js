//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

//@Require('splitbug.Splitbug')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context(module);


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var SplitbugServer = bugpack.require('splitbug.SplitbugServer');


//-------------------------------------------------------------------------------
// Bootstrap
//-------------------------------------------------------------------------------

var splitbugServer = new SplitbugServer();
console.log("Configuring Splitbug server");
splitbugServer.configure(function(error) {
    if (!error) {
        console.log("Splitbug server successfully configured.");
        console.log("Starting Splitbug server");
        splitbugServer.start();
    } else {
        console.log("Error occurred while configuring Splitbug server.");
        console.log(error);
        console.log(error.stack);
    }
});
