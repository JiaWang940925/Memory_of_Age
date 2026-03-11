import { env, pipeline } from '@huggingface/transformers'

env.allowLocalModels = false

type WorkerRequest = {
  type: 'transcribe'
  audio: Float32Array
}

type WorkerResponse =
  | {
      type: 'status'
      message: string
    }
  | {
      type: 'complete'
      text: string
    }
  | {
      type: 'error'
      message: string
    }

let transcriberPromise: Promise<any> | null = null

function postWorkerMessage(message: WorkerResponse) {
  self.postMessage(message)
}

async function getTranscriber() {
  if (!transcriberPromise) {
    postWorkerMessage({
      type: 'status',
      message: '正在加载语音模型，首次使用可能需要一些时间',
    })

    transcriberPromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
      dtype: 'q8',
      progress_callback: (progress) => {
        const rawPercent =
          progress.status === 'progress'
            ? progress.progress <= 1
              ? progress.progress * 100
              : progress.progress
            : null

        postWorkerMessage({
          type: 'status',
          message:
            rawPercent === null
              ? '正在准备语音模型'
              : `正在准备语音模型 ${Math.round(rawPercent)}%`,
        })
      },
    })
  }

  return transcriberPromise
}

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type !== 'transcribe') return

  try {
    const transcriber = await getTranscriber()

    postWorkerMessage({
      type: 'status',
      message: '正在把录音转换成文字',
    })

    const result = (await transcriber(event.data.audio, {
      language: 'chinese',
      task: 'transcribe',
    })) as { text: string } | Array<{ text: string }>

    const text = Array.isArray(result) ? result[0]?.text ?? '' : result.text

    postWorkerMessage({
      type: 'complete',
      text: text.trim(),
    })
  } catch (error) {
    postWorkerMessage({
      type: 'error',
      message: error instanceof Error ? error.message : '语音转写失败，请稍后重试',
    })
  }
})
