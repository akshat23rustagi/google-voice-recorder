var WORKER_PATH = require('./worker.js');

var Recorder = function(source, cfg) {
    var config = cfg || {};
    var bufferLen = config.bufferLen || 4096;
    this.context = source.context;
    if(!this.context.createScriptProcessor){
        this.node = this.context.createJavaScriptNode(bufferLen, 2, 2);
    } else {
        this.node = this.context.createScriptProcessor(bufferLen, 2, 2);
    }
    var worker = new Worker(config.workerPath || WORKER_PATH);
    worker.postMessage({
        command: 'init',
        config: {
            sampleRate: this.context.sampleRate
        }
    });
    worker.onmessage = function(e){
        var blob = e.data;
        currCallback(blob);
    };
    var recording = false,
        currCallback;

    this.node.onaudioprocess = function(e){
        if (!recording) return;
            worker.postMessage({
                command: 'record',
                buffer: [
                    e.inputBuffer.getChannelData(0),
                    e.inputBuffer.getChannelData(1)
                ]
            });
    };

    this.record = function(){
        recording = true;
    };

    this.stop = function(){
        recording = false;
    };

    this.clear = function(){
        worker.postMessage({ command: 'clear' });
    };
    this.getBuffers = function(cb) {
        currCallback = cb || config.callback;
        worker.postMessage({ command: 'getBuffers' })
    };
    this.exportWAV = function(cb, type){
        currCallback = cb || config.callback;
        type = type || config.type || 'audio/wav';
        if (!currCallback) throw new Error('Callback not set');
            worker.postMessage({
                command: 'exportWAV',
                type: type
        });
    };
    this.exportMonoWAV = function(cb, type){
        currCallback = cb || config.callback;
        type = type || config.type || 'audio/wav';
        if (!currCallback) throw new Error('Callback not set');
            worker.postMessage({
                command: 'exportMonoWAV',
                type: type
        });
    };
    source.connect(this.node);
    this.node.connect(this.context.destination);   // if the script node is not connected to an output the "onaudioprocess" event is not triggered in chrome.
};

Recorder.setupDownload = function(blob, filename, sampleRate){
    var reader = new window.FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function() {
        var data = reader.result;
        data = data.split(',');
        console.log(data[1]);
        var body = {
            "config": {
                "encoding": "LINEAR16",
                "sampleRateHertz": sampleRate, //44100
                "languageCode": "en-US"
            },
            "audio": {
                "content": data[1]
            }
        };
        if (!process.ENV.token) {
            console.error("Access token not defined");
        }
        var token = 'Bearer ' + process.ENV.token;
        $.ajax({
            url: 'https://speech.googleapis.com/v1/speech:recognize',
            type: 'post',
            data: JSON.stringify(body),
            headers: {
                'Content-Type' : 'application/json',   //If your header name has spaces or any other char not appropriate
                'Authorization' : token,
            },
            dataType: 'json',
            success: function (data) {
                var result = data;
                if (result.results && result.results[0]) {
                    var alternatives = result.results[0].alternatives;
                    if (alternatives && alternatives[0]) {
                        //@TODO put in a check for confidence factor as well
                        alternatives[0].transcript = cleanSearchTerm(alternatives[0].transcript.toLowerCase()).trim();
                        $(location).attr('href', "http://www.jabong.com/find/" + alternatives[0].transcript.split(" ").join("-") + "?q=" + encodeURI(alternatives[0].transcript));
                    }
                }
            },
            timeout: 30000,
            error: function(jqXHR, textStatus, errorThrown) {
                if(textStatus==="timeout") {
                    console.error("Call has timed out"); //Handle the timeout
                } else {
                    console.error("Another error was returned", textStatus, errorThrown); //Handle other error type
                }
            }
        });
    };
};

// function to clean search term from some keywords
function cleanSearchTerm(searchedTerm) {
    var dictionary = [
        'find me',
        'search me'
    ];
    for (var i = 0; i < dictionary.length; ++i) {
        if (searchedTerm.indexOf(dictionary[i]) != -1) {
            searchedTerm = searchedTerm.replace(dictionary[i], '');
        }
    }
    return searchedTerm;
}
module.exports = exports = Recorder;


