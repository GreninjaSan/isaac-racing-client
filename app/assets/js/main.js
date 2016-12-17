/*
    Racing+ Client
    for The Binding of Isaac: Afterbirth+

    Built with jQuery
*/

/*
    TODO

    - rejoin race from disconnect doesn't work
    - add stream to chat map
    - autoupdate doesn't work on ajax
    - update columns for race:
        - place
        - seed
        - starting item
        - time offset
        - fill in items
    - tab complete for chat
    - /r should work
*/

'use strict';

// Import NPM packages
const fs     = nodeRequire('fs');
const path   = nodeRequire('path');
const remote = nodeRequire('electron').remote;
const isDev  = nodeRequire('electron-is-dev');

// Import local modules
const globals         = nodeRequire('./assets/js/globals');
const settings        = nodeRequire('./assets/js/settings');
const automaticUpdate = nodeRequire('./assets/js/automatic-update');
const localization    = nodeRequire('./assets/js/localization');
const keyboard        = nodeRequire('./assets/js/keyboard');
const header          = nodeRequire('./assets/js/ui/header');
const titleScreen     = nodeRequire('./assets/js/ui/title');
const tutorialScreen  = nodeRequire('./assets/js/ui/tutorial');
const loginScreen     = nodeRequire('./assets/js/ui/login');
const forgotScreen    = nodeRequire('./assets/js/ui/forgot');
const registerScreen  = nodeRequire('./assets/js/ui/register');
const lobbyScreen     = nodeRequire('./assets/js/ui/lobby');
const raceScreen      = nodeRequire('./assets/js/ui/race');
const modals          = nodeRequire('./assets/js/ui/modals');

/*
    Development-only stuff
*/

if (isDev) {
    // Importing this adds a right-click menu with 'Inspect Element' option
    let rightClickPosition = null;

    const menu = new remote.Menu();
    const menuItem = new remote.MenuItem({
        label: 'Inspect Element',
        click: function() {
            remote.getCurrentWindow().inspectElement(rightClickPosition.x, rightClickPosition.y);
        },
    });
    menu.append(menuItem);

    window.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        rightClickPosition = {
            x: e.x,
            y: e.y,
        };
        menu.popup(remote.getCurrentWindow());
    }, false);
}

/*
    Initialization
*/

// Logging (code duplicated between main and renderer because of require/nodeRequire issues)
globals.log = nodeRequire('tracer').console({
    format: "{{timestamp}} <{{title}}> {{file}}:{{line}}\r\n{{message}}",
    dateformat: "ddd mmm dd HH:MM:ss Z",
    transport: function(data) {
        // #1 - Log to the JavaScript console
        console.log(data.output);

        // #2 - Log to a file
        let logFile = (isDev ? 'Racing+.log' : path.resolve(process.execPath, '..', '..', 'Racing+.log'));
        fs.appendFile(logFile, data.output + '\n', function(err) {
            if (err) {
                throw err;
            }
        });
    }
});

// Version
let packageLocation = path.join(__dirname, 'package.json');
fs.readFile(packageLocation, function(err, data) {
    let version = 'v' + JSON.parse(data).version;
    $('#title-version').html(version);
    $('#settings-version').html(version);
});

// Word list
let wordListLocation = path.join(__dirname, 'assets/words/words.txt');
fs.readFile(wordListLocation, function(err, data) {
    globals.wordList = data.toString().split('\n');
});
