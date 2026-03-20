export async function loadFFmpeg(): Promise<any> {
  // 動的インポートでffmpeg本体を分離
  const [{ FFmpeg }, { default: coreURL }, { default: wasmURL }] = await Promise.all([
    import("@ffmpeg/ffmpeg"),
    import("@ffmpeg/core?binary"),
    import("@ffmpeg/core/wasm?binary"),
  ]);

  const ffmpeg = new FFmpeg();

  // Blob URLを介さず、URLを直接渡すことでブラウザのストリーミング読み込み（instantiateStreaming）を有効化
  await ffmpeg.load({
    coreURL,
    wasmURL,
  });

  return ffmpeg;
}
