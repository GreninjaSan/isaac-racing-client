/*
    Racing+ Client
    for The Binding of Isaac: Afterbirth+
    (renderer process)
*/

/*
    Bugs to fix:
    - pms are broken
    - tab complete doesn't find zamiel2?
    - !entrants command for twitch bot
    - !left command for twitch bot

    - cyber confused by twitch bot, make it greyed out instead of invisible
    - add check to see if anyone has already set that twitch stream

    - Add [?? Joined] to race chat
    - tooltip for "Entrants" row of lobby gets deleted when coming back from that race

    - error while recieving PM during tab transition

    - make spacing slightly smaller for Type and Format on lobby
    - integrate golem into main.js as an include

    - /shame - Shame on those who haven't readied up.

    - look at sed screenshot, racer is cut off at the top

    - clicking profile doesn't work
    - clicking from 1 player to the next on the lobby doesn't work, tooltips just need to be rewritten entirely to only have 1 tooltip

    - get sentry working with line numbers - https://forum.sentry.io/t/sentry-js-submitting-incomplete-stack-trace/703



    Things to verify:
    - get sillypears to verify crash test after sentry line numbers fix

    Features to add:
    - test if internet drops during race, what happens? safe resume, https://github.com/joewalnes/reconnecting-websocket
    - achievements
    - discord integration
    - show running time on the lobby of a running race
    - automatically sort race table when people move places
    - turn different color in lobby when in a race
    - message of the day
    - add stream to chat map
    - update columns for race:
        - time offset
        - fill in items (should also show seed on this screen)
    - "/msg invadertim" shouldn't send to server if he is offline
    - "/msg invadertim" should be made to be the right case (on the server)
    - tab complete for chat
    - /r should work
    - volume slider update number better
    - wait until raceList before going to lobby so that we can go directly to current race
    - ask cmondinger if it still gets detected as a virus after log reading is removed



    Features to add (low priority):
    - make UI expand horizontally properly
    - implement <3 emote (can't have < or > in filenames so it requires custom code)
    - add items + date to "Top 10 Unseeded Times" leaderboard

    Bugs to fix (low priority):
    - french race tables rows are not confined to 1 line, so they look bad
    - Personnage (french) is too close to character in new-race tooltip
    - horizontal scroll bar appears when resizing smaller

*/

'use strict';

// Import NPM packages
const fs         = nodeRequire('fs');
const path       = nodeRequire('path');
const remote     = nodeRequire('electron').remote;
const isDev      = nodeRequire('electron-is-dev');

// Import local modules
const globals         = nodeRequire('./assets/js/globals');
const settings        = nodeRequire('./assets/js/settings');
const misc            = nodeRequire('./assets/js/misc');
const automaticUpdate = nodeRequire('./assets/js/automatic-update');
const localization    = nodeRequire('./assets/js/localization');
const keyboard        = nodeRequire('./assets/js/keyboard');
const login           = nodeRequire('./assets/js/login');
const header          = nodeRequire('./assets/js/ui/header');
const tutorialScreen  = nodeRequire('./assets/js/ui/tutorial');
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

// Get the version
let packageFileLocation = path.join(__dirname, 'package.json');
let packageFile = fs.readFileSync(packageFileLocation, 'utf8');
let version = 'v' + JSON.parse(packageFile).version;

// Raven (error logging to Sentry)
globals.Raven = nodeRequire('raven');
globals.Raven.config('https://0d0a2118a3354f07ae98d485571e60be:843172db624445f1acb86908446e5c9d@sentry.io/124813', {
    autoBreadcrumbs: true,
    release: version,
    environment: (isDev ? 'development' : 'production'),
    dataCallback: function(data) {
        // We want to report errors to Sentry that are passed to the "errorShow" function
        // But because "captureException" in that function will send us back to this callback, check for that so that we don't report the same error twice
        if (data.exception[0].type !== 'RavenMiscError') {
            misc.errorShow('A unexpected JavaScript error occured. Here\'s what happened:<br /><br />' + JSON.stringify(data.exception), false);
        }
        return data;
    },
}).install();

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
$(document).ready(function() {
    $('#title-version').html(version);
    $('#settings-version').html(version);
});

// Word list
let wordListLocation = path.join(__dirname, 'assets/words/words.txt');
fs.readFile(wordListLocation, function(err, data) {
    globals.wordList = data.toString().split('\n');
});

// We need to have a list of all of the emotes for the purposes of tab completion
let emotePath = path.join(__dirname + '/assets/img/emotes');
globals.emoteList = misc.getAllFilesFromFolder(emotePath);
for (let i = 0; i < globals.emoteList.length; i++) { // Remove ".png" from each elemet of emoteList
    globals.emoteList[i] = globals.emoteList[i].slice(0, -4); // ".png" is 4 characters long
}

// Preload some sounds by playing all of them
$(document).ready(function() {
    let soundFiles = ['1', '2', '3', 'finished', 'go', 'lets-go', 'quit', 'race-completed'];
    for (let file of soundFiles) {
        let audio = new Audio('assets/sounds/' + file + '.mp3');
        audio.volume = 0;
        audio.play();
    }
    for (let i = 1; i <= 16; i++) {
        let audio = new Audio('assets/sounds/place/' + i + '.mp3');
        audio.volume = 0;
        audio.play();
    }
});