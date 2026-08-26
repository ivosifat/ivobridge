// Permission-gated browser capture for the future Mode 3 PCM bridge.
// This file intentionally has no automatic start path: getDisplayMedia must
// only be invoked after an explicit user action.
window.IvoBridgeLosslessCapture = (() => {
  let context;
  let stream;
  let processor;

  function toPcm16(left, right) {
    const frames = left.length;
    const output = new ArrayBuffer(frames * 4);
    const view = new DataView(output);
    for (let index = 0; index < frames; index += 1) {
      const l = Math.max(-1, Math.min(1, left[index]));
      const r = Math.max(-1, Math.min(1, right[index]));
      view.setInt16(index * 4, l * 32767, true);
      view.setInt16(index * 4 + 2, r * 32767, true);
    }
    return output;
  }

  async function start(onChunk) {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 2, sampleRate: 48000 },
      systemAudio: 'include',
    });
    if (!stream.getAudioTracks().length) throw new Error('No audio was shared. Select a tab and enable Share tab audio.');
    context = new AudioContext({ sampleRate: 48000 });
    const source = context.createMediaStreamSource(stream);
    processor = context.createScriptProcessor(2048, 2, 2);
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer;
      onChunk(toPcm16(input.getChannelData(0), input.numberOfChannels > 1 ? input.getChannelData(1) : input.getChannelData(0)));
    };
    source.connect(processor);
    processor.connect(context.destination);
  }

  async function stop() {
    processor?.disconnect();
    stream?.getTracks().forEach((track) => track.stop());
    await context?.close();
    processor = null; stream = null; context = null;
  }

  return { start, stop };
})();
