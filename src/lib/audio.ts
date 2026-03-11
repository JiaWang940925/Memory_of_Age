interface BrowserWindow extends Window {
  webkitAudioContext?: typeof AudioContext
}

function mixToMono(audioBuffer: AudioBuffer) {
  const monoChannel = new Float32Array(audioBuffer.length)

  for (let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; channelIndex += 1) {
    const channelData = audioBuffer.getChannelData(channelIndex)

    for (let sampleIndex = 0; sampleIndex < channelData.length; sampleIndex += 1) {
      monoChannel[sampleIndex] += channelData[sampleIndex] / audioBuffer.numberOfChannels
    }
  }

  return monoChannel
}

async function resampleAudio(
  channelData: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number,
) {
  if (sourceSampleRate === targetSampleRate) {
    return channelData
  }

  const targetLength = Math.ceil((channelData.length * targetSampleRate) / sourceSampleRate)
  const offlineContext = new OfflineAudioContext(1, targetLength, targetSampleRate)
  const audioBuffer = offlineContext.createBuffer(1, channelData.length, sourceSampleRate)

  audioBuffer.copyToChannel(Float32Array.from(channelData), 0)

  const source = offlineContext.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offlineContext.destination)
  source.start(0)

  const renderedBuffer = await offlineContext.startRendering()
  return renderedBuffer.getChannelData(0).slice()
}

export async function decodeAudioBlobToMonoPcm(blob: Blob, targetSampleRate = 16000) {
  const AudioContextConstructor =
    window.AudioContext || (window as BrowserWindow).webkitAudioContext

  if (!AudioContextConstructor) {
    throw new Error('当前环境不支持音频解码')
  }

  const audioContext = new AudioContextConstructor()

  try {
    const arrayBuffer = await blob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
    const monoChannel = mixToMono(audioBuffer)

    return await resampleAudio(monoChannel, audioBuffer.sampleRate, targetSampleRate)
  } finally {
    await audioContext.close()
  }
}
