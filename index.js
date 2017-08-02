var RECORDER_PATH = require('./scripts/recorder');

exports.module = exports = (function(window) {
window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new window.AudioContext();
var audioInput = null,
    realAudioInput = null,
    inputPoint = null,
    zeroGain = null,
    audioRecorder = null;
var recIndex = 0;
var setTime = null;

function saveAudio() {
    audioRecorder.exportMonoWAV(doneEncoding);
}

function doneEncoding(blob) {
    audioRecorder.setupDownload(blob, "myRecording" + ((recIndex < 10) ? "0" : "") + recIndex + ".wav", audioContext.sampleRate, window);
    recIndex++;
}

function toggleRecording(e) {
    var element = e.target;
    if(element.getAttribute('recording') ==='inprocess') {
        clearTimeout(setTime);
        element.setAttribute('recording', '');
        audioRecorder.stop();
        saveAudio();
    } else {
        element.setAttribute('recording', 'inprocess');
        initAudio();
        // start recording
        if (!audioRecorder) {
            return;
        }
        setTime = setTimeout(function() {
            $('#startRecord').click();
        }, 4000);
        audioRecorder.clear();
        audioRecorder.record();
    }

}

function gotStream(stream) {

    // Create an AudioNode from the stream.
    realAudioInput = audioContext.createMediaStreamSource(stream);
    audioInput = realAudioInput;
    audioInput.connect(inputPoint);

    zeroGain = audioContext.createGain();
    zeroGain.gain.value = 0.0;
    inputPoint.connect(zeroGain);
    zeroGain.connect(audioContext.destination);
}

function initAudio() {
    inputPoint = audioContext.createGain();
    audioRecorder = new RECORDER_PATH(inputPoint);
    if (!navigator.getUserMedia) {
        navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    }
    navigator.getUserMedia(
        {
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            }
        }, gotStream, function (e) {
            console.error('Error getting audio', e);
        });
}
}(window));