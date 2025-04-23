declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    setFfmpegPath(path: string): FfmpegCommand;
    setStartTime(time: string): FfmpegCommand;
    setDuration(duration: number): FfmpegCommand;
    duration(duration: number): FfmpegCommand; // Add duration method
    output(path: string): FfmpegCommand;
    on(event: 'end', callback: () => void): FfmpegCommand;
    on(event: 'error', callback: (err: Error) => void): FfmpegCommand;
    on(event: string, callback: Function): FfmpegCommand;
    run(): FfmpegCommand;
    videoCodec(codec: string): FfmpegCommand;
    audioCodec(codec: string): FfmpegCommand;
    format(format: string): FfmpegCommand;
    seekInput(time: string | number): FfmpegCommand;
    withNoAudio(): FfmpegCommand;
    withAudio(): FfmpegCommand;
    size(size: string): FfmpegCommand;
    inputOption(option: string): FfmpegCommand;
    inputOptions(options: string[]): FfmpegCommand;
    outputOption(option: string): FfmpegCommand;
    outputOptions(options: string[]): FfmpegCommand;
    fps(fps: number): FfmpegCommand;
    save(outputPath: string): FfmpegCommand; // Add save method
    input(source: string | Readable): FfmpegCommand; // Add input method with Readable support
  }

  // Add setFfmpegPath as a static method on the ffmpeg function itself
  interface FfmpegStatic {
    (input?: string): FfmpegCommand;
    setFfmpegPath(path: string): void;
  }

  const ffmpeg: FfmpegStatic;
  export = ffmpeg;
}

declare module 'ffmpeg-static' {
  const path: string;
  export default path;
}

// Add Readable interface from Node.js stream module
interface Readable {}