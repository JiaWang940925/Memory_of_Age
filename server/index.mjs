import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const avatarOutputDir = path.join(rootDir, 'output', 'ai-video');
const port = Number(process.env.AI_VIDEO_PORT || 8787);

const app = express();
const jobs = new Map();

const providerInfo = {
  provider: 'SadTalker',
  recommendedModel: 'sadtalker_v1',
  supportedModels: [
    {
      id: 'sadtalker_v1',
      label: 'SadTalker V1',
      description: '使用单张人像照片和一段讲述音频，在本地生成会说话的数字人短视频。',
    },
  ],
  localOnly: true,
  setupGuide: [
    '在本机克隆并安装 SadTalker，确保仓库目录下存在 inference.py。',
    '设置环境变量 SADTALKER_DIR 指向 SadTalker 仓库目录。',
    '如需指定解释器，可设置 SADTALKER_PYTHON；未设置时默认使用 python。',
    '确保 ffmpeg 可执行；如路径不在 PATH 中，可设置 FFMPEG_PATH。',
  ],
};

app.use(express.json({ limit: '40mb' }));
app.use('/api/ai-video/assets', express.static(avatarOutputDir));

function nowIso() {
  return new Date().toISOString();
}

function trimText(value, maxLength = 160) {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

function normalizeParagraphText(value, maxLength = 1600) {
  const text =
    typeof value === 'string'
      ? value
          .replace(/\r\n?/g, '\n')
          .replace(/[ \t]+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim()
      : '';

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function normalizeMemory(memory) {
  return {
    category: trimText(memory?.category, 40) || '人生片段',
    question: trimText(memory?.question, 120),
    answer: trimText(memory?.answer, 220),
  };
}

function buildStoryOutline(memories) {
  const usable = memories
    .map(normalizeMemory)
    .filter((memory) => memory.answer)
    .slice(0, 6);

  if (!usable.length) {
    return [
      '开场向家人问好，说明这是一次人生回望。',
      '中段挑出一两个最重要的人生片段慢慢讲述。',
      '结尾落在感谢与珍惜上，让整段视频温暖收束。',
    ];
  }

  const first = usable[0];
  const middle = usable[Math.floor((usable.length - 1) / 2)];
  const last = usable[usable.length - 1];

  return [
    `开场从${first.category}进入：${first.answer}`,
    `中段讲到${middle.category}：${middle.answer}`,
    `结尾回望整段人生：${last.answer}`,
  ];
}

function buildDefaultNarration(memories) {
  const outline = buildStoryOutline(memories);
  return [
    '您好，这是我的人生回忆录。',
    ...outline,
    '谢谢您愿意听我把这些珍贵记忆慢慢讲出来。',
  ].join('\n');
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/s.exec(dataUrl ?? '');
  if (!match) {
    throw new Error('上传内容格式无效，请重新选择文件后再试。');
  }

  return {
    mimeType: match[1] || 'application/octet-stream',
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function getExtensionFromMime(mimeType, fallbackExtension) {
  if (mimeType === 'image/png') {
    return '.png';
  }

  if (mimeType === 'image/webp') {
    return '.webp';
  }

  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return '.jpg';
  }

  if (mimeType === 'audio/wav' || mimeType === 'audio/x-wav') {
    return '.wav';
  }

  if (mimeType === 'audio/mpeg') {
    return '.mp3';
  }

  if (mimeType === 'audio/mp4' || mimeType === 'audio/x-m4a') {
    return '.m4a';
  }

  if (mimeType === 'audio/webm') {
    return '.webm';
  }

  if (mimeType === 'audio/ogg') {
    return '.ogg';
  }

  return fallbackExtension;
}

function commandExists(command, args = ['--version']) {
  const result = spawnSync(command, args, {
    stdio: 'ignore',
    shell: false,
  });

  return !result.error && result.status === 0;
}

function getSadTalkerConfig() {
  const sadtalkerDir = trimText(process.env.SADTALKER_DIR, 512);
  const pythonBin = trimText(process.env.SADTALKER_PYTHON, 512) || 'python';
  const ffmpegBin = trimText(process.env.FFMPEG_PATH, 512) || 'ffmpeg';
  const issues = [];

  if (!sadtalkerDir) {
    issues.push('尚未设置 SADTALKER_DIR。');
  } else if (!existsSync(sadtalkerDir)) {
    issues.push('SADTALKER_DIR 指向的目录不存在。');
  } else if (!existsSync(path.join(sadtalkerDir, 'inference.py'))) {
    issues.push('SADTALKER_DIR 下未找到 inference.py。');
  }

  if (!commandExists(pythonBin)) {
    issues.push(`无法执行 Python 解释器：${pythonBin}`);
  }

  if (!commandExists(ffmpegBin, ['-version'])) {
    issues.push(`无法执行 ffmpeg：${ffmpegBin}`);
  }

  return {
    configured: issues.length === 0,
    issues,
    sadtalkerDir,
    pythonBin,
    ffmpegBin,
  };
}

async function ensureDir(directory) {
  await fs.mkdir(directory, { recursive: true });
}

async function writeDataUrlFile(dataUrl, filePath) {
  const { buffer } = parseDataUrl(dataUrl);
  await fs.writeFile(filePath, buffer);
}

async function collectFiles(directory, extension, results = []) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(entryPath, extension, results);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) {
      const stats = await fs.stat(entryPath);
      results.push({
        path: entryPath,
        mtimeMs: stats.mtimeMs,
      });
    }
  }

  return results;
}

async function convertAudioToWav(ffmpegBin, sourcePath, targetPath) {
  await execFileAsync(ffmpegBin, [
    '-y',
    '-i',
    sourcePath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    '16000',
    targetPath,
  ]);
}

function buildSadTalkerArgs(job, sourceImagePath, drivingAudioPath, resultDir) {
  const args = [
    'inference.py',
    '--driven_audio',
    drivingAudioPath,
    '--source_image',
    sourceImagePath,
    '--result_dir',
    resultDir,
    '--preprocess',
    job.preprocessMode,
  ];

  if (job.motionStyle === 'steady') {
    args.push('--still');
  }

  if (job.enhanceFace) {
    args.push('--enhancer', 'gfpgan');
  }

  return args;
}

function serializeJob(job) {
  return {
    id: job.id,
    status: job.status,
    providerTaskId: job.providerTaskId,
    providerStatus: job.providerStatus,
    progress: job.progress,
    promptPreview: job.promptPreview,
    storyOutline: job.storyOutline,
    model: job.model,
    motionStyle: job.motionStyle,
    preprocessMode: job.preprocessMode,
    enhanceFace: job.enhanceFace,
    outputUrls: job.outputUrls,
    errorMessage: job.errorMessage,
    portraitName: job.portraitName,
    audioName: job.audioName,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

async function runJob(jobId) {
  const job = jobs.get(jobId);
  const config = getSadTalkerConfig();

  if (!job || !config.configured) {
    return;
  }

  const jobDir = path.join(avatarOutputDir, job.id);
  const inputsDir = path.join(jobDir, 'inputs');
  const resultDir = path.join(jobDir, 'result');

  try {
    job.status = 'RUNNING';
    job.providerStatus = 'PREPARING_ASSETS';
    job.providerTaskId = `local-${job.id.slice(0, 8)}`;
    job.progress = 8;
    job.updatedAt = nowIso();

    await ensureDir(inputsDir);
    await ensureDir(resultDir);

    const portraitMime = parseDataUrl(job.portrait.dataUrl).mimeType;
    const audioMime = parseDataUrl(job.drivingAudio.dataUrl).mimeType;
    const sourceImagePath = path.join(
      inputsDir,
      `portrait${getExtensionFromMime(portraitMime, '.jpg')}`,
    );
    const rawAudioPath = path.join(
      inputsDir,
      `audio${getExtensionFromMime(audioMime, '.webm')}`,
    );
    const drivingAudioPath = path.join(inputsDir, 'audio.wav');

    await writeDataUrlFile(job.portrait.dataUrl, sourceImagePath);
    await writeDataUrlFile(job.drivingAudio.dataUrl, rawAudioPath);

    job.providerStatus = 'CONVERTING_AUDIO';
    job.progress = 28;
    job.updatedAt = nowIso();

    await convertAudioToWav(config.ffmpegBin, rawAudioPath, drivingAudioPath);

    job.providerStatus = 'RUNNING_SADTALKER';
    job.progress = 54;
    job.updatedAt = nowIso();

    await execFileAsync(
      config.pythonBin,
      buildSadTalkerArgs(job, sourceImagePath, drivingAudioPath, resultDir),
      {
        cwd: config.sadtalkerDir,
        maxBuffer: 12 * 1024 * 1024,
      },
    );

    const outputFiles = await collectFiles(resultDir, '.mp4');
    const latestOutput = outputFiles.sort((left, right) => right.mtimeMs - left.mtimeMs)[0];

    if (!latestOutput) {
      throw new Error('SadTalker 已运行完成，但未找到输出视频文件。');
    }

    const finalVideoPath = path.join(jobDir, 'avatar.mp4');
    await fs.copyFile(latestOutput.path, finalVideoPath);

    job.status = 'SUCCEEDED';
    job.providerStatus = 'SUCCEEDED';
    job.progress = 100;
    job.outputUrls = [`/api/ai-video/assets/${job.id}/avatar.mp4`];
    job.resultFilePath = finalVideoPath;
    job.updatedAt = nowIso();
  } catch (error) {
    job.status = 'FAILED';
    job.providerStatus = 'FAILED';
    job.errorMessage =
      error instanceof Error
        ? error.message
        : 'SadTalker 执行失败，请检查本地模型和日志后重试。';
    job.updatedAt = nowIso();
  }
}

app.get('/api/ai-video/provider', (_request, response) => {
  const config = getSadTalkerConfig();

  response.json({
    provider: {
      ...providerInfo,
      configured: config.configured,
      issues: config.issues,
    },
  });
});

app.post('/api/ai-video/jobs', (request, response) => {
  const {
    memories,
    portrait,
    drivingAudio,
    narrationText,
    model,
    motionStyle,
    preprocessMode,
    enhanceFace,
  } = request.body ?? {};

  const config = getSadTalkerConfig();
  if (!config.configured) {
    response.status(503).json({
      message: `SadTalker 尚未完成本地配置：${config.issues.join(' ')}`,
    });
    return;
  }

  if (!Array.isArray(memories) || memories.length === 0) {
    response.status(400).json({
      message: '请先记录一些回忆，再生成数字人视频。',
    });
    return;
  }

  if (typeof portrait?.dataUrl !== 'string' || typeof portrait?.name !== 'string') {
    response.status(400).json({
      message: '请先选择一张适合作为数字人头像的照片。',
    });
    return;
  }

  if (typeof drivingAudio?.dataUrl !== 'string' || typeof drivingAudio?.name !== 'string') {
    response.status(400).json({
      message: 'SadTalker 需要一段讲述音频，请先录音或上传音频文件。',
    });
    return;
  }

  const safeModel = model === 'sadtalker_v1' ? 'sadtalker_v1' : 'sadtalker_v1';
  const safeMotionStyle = motionStyle === 'expressive' ? 'expressive' : 'steady';
  const safePreprocessMode = preprocessMode === 'full' ? 'full' : 'crop';
  const safeNarrationText =
    normalizeParagraphText(narrationText, 1600) || buildDefaultNarration(memories);
  const outline = buildStoryOutline(memories);

  const job = {
    id: randomUUID(),
    status: 'QUEUED',
    providerTaskId: null,
    providerStatus: 'QUEUED',
    progress: 0,
    promptPreview: safeNarrationText,
    storyOutline: outline,
    model: safeModel,
    motionStyle: safeMotionStyle,
    preprocessMode: safePreprocessMode,
    enhanceFace: Boolean(enhanceFace),
    outputUrls: [],
    errorMessage: null,
    portraitName: trimText(portrait.name, 120) || 'portrait.jpg',
    audioName: trimText(drivingAudio.name, 120) || 'audio.webm',
    portrait: {
      name: portrait.name,
      dataUrl: portrait.dataUrl,
    },
    drivingAudio: {
      name: drivingAudio.name,
      dataUrl: drivingAudio.dataUrl,
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  jobs.set(job.id, job);
  void runJob(job.id);

  response.status(202).json({
    job: serializeJob(job),
  });
});

app.get('/api/ai-video/jobs/:jobId', (request, response) => {
  const job = jobs.get(request.params.jobId);
  if (!job) {
    response.status(404).json({
      message: '没有找到对应的数字人任务。',
    });
    return;
  }

  response.json({
    job: serializeJob(job),
  });
});

if (existsSync(distDir)) {
  app.use(express.static(distDir));

  app.get(/^(?!\/api\/).*/, (_request, response) => {
    response.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`SadTalker server listening on http://127.0.0.1:${port}`);
});
