/*
 * Copyright (c) 2014 airbug Inc. All rights reserved.
 *
 * All software, both binary and source contained in this work is the exclusive property
 * of airbug Inc. Modification, decompilation, disassembly, or any other means of discovering
 * the source code of this software is prohibited. This work is protected under the United
 * States copyright law and other international copyright treaties and conventions.
 */


//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

var buildbug            = require('buildbug');


//-------------------------------------------------------------------------------
// Simplify References
//-------------------------------------------------------------------------------

var buildProject        = buildbug.buildProject;
var buildProperties     = buildbug.buildProperties;
var buildScript         = buildbug.buildScript;
var buildTarget         = buildbug.buildTarget;
var enableModule        = buildbug.enableModule;
var parallel            = buildbug.parallel;
var series              = buildbug.series;
var targetTask          = buildbug.targetTask;


//-------------------------------------------------------------------------------
// Enable Modules
//-------------------------------------------------------------------------------

var aws                 = enableModule("aws");
var bugpack             = enableModule('bugpack');
var bugunit             = enableModule('bugunit');
var core                = enableModule('core');
var lintbug             = enableModule('lintbug');
var nodejs              = enableModule('nodejs');


//-------------------------------------------------------------------------------
// Declare Properties
//-------------------------------------------------------------------------------

buildProperties({
    splitbug: {
        packageJson: {
            name: "splitbug",
            version: "0.0.2",
            main: "./lib/Splitbug.js",
            dependencies: {
                bugpack: "0.2.0",
                "express": "3.1.x",
                "riak-js": "0.9.x",
                "cron": "1.0.x"
            },
            scripts: {
                "start": "node ./scripts/splitbug-server-start.js"
            }
        },
        resourcePaths: [
            "./projects/splitbugserver/resources"
        ],
        sourcePaths: [
            "./projects/splitbug/js/src",
            "./projects/splitbugserver/js/src",
            "../bugcore/libraries/bugcore/js/src",
            "../bugdouble/libraries/bugdouble/js/src",
            "../bugfs/libraries/bugfs/js/src",
            "../bugjs/projects/riak/js/src",
            "../bugmeta/libraries/bugmeta/js/src",
            "../bugunit/libraries/bugunit/js/src"
        ],
        scriptPaths: [
            "./projects/splitbugserver/js/scripts",
            "../bugunit/libraries/bugunit/js/scripts"
        ],
        testPaths: [
            "../bugcore/libraries/bugcore/js/test"
        ]
    },
    lint: {
        targetPaths: [
            "."
        ],
        ignorePatterns: [
            ".*\\.buildbug$",
            ".*\\.bugunit$",
            ".*\\.git$",
            ".*node_modules$"
        ]
    }
});


//-------------------------------------------------------------------------------
// Declare Tasks
//-------------------------------------------------------------------------------


//-------------------------------------------------------------------------------
// Declare Flows
//-------------------------------------------------------------------------------

// Clean Flow
//-------------------------------------------------------------------------------

buildTarget('clean').buildFlow(
    targetTask('clean')
);


// Local Flow
//-------------------------------------------------------------------------------

buildTarget('local').buildFlow(
    series([

        // TODO BRN: This "clean" task is temporary until we're not modifying the build so much. This also ensures that
        // old source files are removed. We should figure out a better way of doing that.

        targetTask('clean'),
        targetTask('lint', {
            properties: {
                targetPaths: buildProject.getProperty("lint.targetPaths"),
                ignores: buildProject.getProperty("lint.ignorePatterns"),
                lintTasks: [
                    "fixExportAndRemovePackageAnnotations"
                ]
            }
        }),
        parallel([
            series([
                targetTask('createNodePackage', {
                    properties: {
                        packageJson: buildProject.getProperty("splitbug.packageJson"),
                        resourcePaths: buildProject.getProperty("splitbug.resourcePaths"),
                        sourcePaths: buildProject.getProperty("splitbug.sourcePaths"),
                        scriptPaths: buildProject.getProperty("splitbug.scriptPaths"),
                        testPaths: buildProject.getProperty("splitbug.testPaths")
                    }
                }),
                targetTask('generateBugPackRegistry', {
                    init: function(task, buildProject, properties) {
                        var nodePackage = nodejs.findNodePackage(
                            buildProject.getProperty("splitbug.packageJson.name"),
                            buildProject.getProperty("splitbug.packageJson.version")
                        );
                        task.updateProperties({
                            sourceRoot: nodePackage.getBuildPath()
                        });
                    }
                }),
                targetTask('packNodePackage', {
                    properties: {
                        packageName: buildProject.getProperty("splitbug.packageJson.name"),
                        packageVersion: buildProject.getProperty("splitbug.packageJson.version")
                    }
                }),
                targetTask('startNodeModuleTests', {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(
                            buildProject.getProperty("splitbug.packageJson.name"),
                            buildProject.getProperty("splitbug.packageJson.version")
                        );
                        task.updateProperties({
                            modulePath: packedNodePackage.getFilePath()
                        });
                    }
                }),
                targetTask("s3PutFile", {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(buildProject.getProperty("splitbug.packageJson.name"),
                            buildProject.getProperty("splitbug.packageJson.version"));
                        task.updateProperties({
                            file: packedNodePackage.getFilePath(),
                            options: {
                                acl: 'public-read'
                            }
                        });
                    },
                    properties: {
                        bucket: buildProject.getProperty("local-bucket")
                    }
                })
            ])
        ])
    ])
).makeDefault();


// Prod Flow
//-------------------------------------------------------------------------------

buildTarget('prod').buildFlow(
    series([

        // TODO BRN: This "clean" task is temporary until we're not modifying the build so much. This also ensures that
        // old source files are removed. We should figure out a better way of doing that.

        targetTask('clean'),
        parallel([
            series([
                targetTask('createNodePackage', {
                    properties: {
                        packageJson: buildProject.getProperty("splitbug.packageJson"),
                        resourcePaths: buildProject.getProperty("splitbug.resourcePaths"),
                        sourcePaths: buildProject.getProperty("splitbug.sourcePaths"),
                        scriptPaths: buildProject.getProperty("splitbug.scriptPaths"),
                        testPaths: buildProject.getProperty("splitbug.testPaths")
                    }
                }),
                targetTask('generateBugPackRegistry', {
                    init: function(task, buildProject, properties) {
                        var nodePackage = nodejs.findNodePackage(
                            buildProject.getProperty("splitbug.packageJson.name"),
                            buildProject.getProperty("splitbug.packageJson.version")
                        );
                        task.updateProperties({
                            sourceRoot: nodePackage.getBuildPath()
                        });
                    }
                }),
                targetTask('packNodePackage', {
                    properties: {
                        packageName: buildProject.getProperty("splitbug.packageJson.name"),
                        packageVersion: buildProject.getProperty("splitbug.packageJson.version")
                    }
                }),
                targetTask('startNodeModuleTests', {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(
                            buildProject.getProperty("splitbug.packageJson.name"),
                            buildProject.getProperty("splitbug.packageJson.version")
                        );
                        task.updateProperties({
                            modulePath: packedNodePackage.getFilePath()
                        });
                    }
                }),
                targetTask("s3PutFile", {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(buildProject.getProperty("splitbug.packageJson.name"),
                            buildProject.getProperty("splitbug.packageJson.version"));
                        task.updateProperties({
                            file: packedNodePackage.getFilePath(),
                            options: {
                                acl: 'public-read'
                            }
                        });
                    },
                    properties: {
                        bucket: "{{prod-deploy-bucket}}"
                    }
                })
            ])
        ])
    ])
);


//-------------------------------------------------------------------------------
// Build Scripts
//-------------------------------------------------------------------------------

buildScript({
    dependencies: [
        "bugcore",
        "bugflow"
    ],
    script: "./lintbug.js"
});
