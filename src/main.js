
'use strict';

var websock = require('./websock');
var terminalInit = require('./terminal');
var lastLocation = require('./location');
var sessionId = require('./sessionid')();
var historydb = require('./historydb');

require('./notify');
require('./input');
require('./settings');
require('./prompt');
require('./textedit');
require('./cs');

var connect = websock.connect, rpccmd = websock.rpccmd, send = websock.send;


$(window).bind('beforeunload', function() {
    return 'leaving already?';
});

$(document).ready(function() {
    $('#logs-button').click(function(e) {
        var logs = [];

        e.preventDefault();

        historydb
            .then(function(db) {
                return db.load(null, false, 100000000, function(key, value) {
                    logs.push(value);
                });
            })
            .then(function() {
                var blobOpts = { type: 'text/html' },
                    blob = new Blob(logs, blobOpts),
                    url = URL.createObjectURL(blob);

                logs = null;
                console.log(url);

                // create a link
                var link = $('<a>')
                    .attr({
                        href: url,
                        download: 'mudjs.log'
                    })
                    [0];

                // click on it
                setTimeout(function() {
                    var event = document.createEvent('MouseEvents');
                        event.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
                        link.dispatchEvent(event);
                }, 10);
            });
    });

    $('#map-button').click(function(e) {
        e.preventDefault();

        if(!lastLocation()) {
            return;
        }

        var basefilename = lastLocation().area.replace(/\.are$/, '');
        var mapfile = '/maps/' + basefilename + '.html?sessionId=' + sessionId;
        window.open(mapfile);
    });


    terminalInit()
        .then(function() {
            connect();
        })
        .then(function () {
            initTerminalFontSize();
        })
        .catch(function(e) {
            console.log(e);
        });

    $('#reconnect').click(function(e) {
        e.preventDefault();
        connect();
    });

    $('body').on('keydown', function(e) {
        var input = $('#input input');

        // dont autofocus if modal dialog is present
        if($('body.modal-open').length != 0)
            return;

        if(e.ctrlKey || e.altKey)
            return;

        if(input.is(':focus'))
            return;

        if ($('#help input').is(':focus'))
            return;

        input.focus();
    });

    /*
     * Handlers for plus-minus buttons to change terminal font size.
     */ 
    var fontDelta = 2;
    var terminalFontSizeKey = "terminal-font-size"
    
    function changeFontSize(delta) {
        var terminal = $('#terminal');
        var style = terminal.css('font-size'); 
        var fontSize = parseFloat(style); 
        terminal.css('font-size', (fontSize + delta) + 'px');
        localStorage.setItem(terminalFontSizeKey, fontSize + delta);
    }

    function initTerminalFontSize() {
        var cacheFontSize = localStorage.getItem(terminalFontSizeKey);
        if (cacheFontSize != null) {
            var terminal = $('#terminal');
            terminal.css('font-size', (cacheFontSize) + 'px');
        }

    }

    $('#font-plus-button').click(function(e) {
        e.preventDefault();
        changeFontSize(fontDelta);
    });

    $('#font-minus-button').click(function(e) {
        e.preventDefault();
        changeFontSize(-fontDelta);
    });

    /*
     * Handlers for 'keypad' key area.
     */
    // Long press: open/close direction etc.
    var btnTimer;
    var wasLongPress = false;
    var longPressDelay = 800;

    $('.btn-keypad').on('touchstart', function(e) {
        wasLongPress = false;

        // Send specified long-cmd once the delay has elapsed.
        btnTimer = setTimeout(function() {
            btnTimer = null;
            wasLongPress = true;
            var btn = $(e.currentTarget), cmd = btn.data('long-cmd');
            if (cmd) {
                send(cmd);
            }

        }, longPressDelay);

    }).on('touchend', function(e) {
        if (btnTimer)  
            clearTimeout(btnTimer);
    });

    // Single click: go direction, look etc.`
    $('.btn-keypad').click(function(e) {
        if (wasLongPress)
            return;

        e.preventDefault();
        var btn = $(e.currentTarget), cmd = btn.data('cmd');

        if (cmd) {
            send(cmd);
        }
    });
});

