export type QualityProfile = { id: string; width: number; height: number; fps: number; bitrate: number };
export const QUALITY_LEVELS: QualityProfile[] = [
  { id: 'Q0 360p10', width: 640, height: 360, fps: 10, bitrate: 250_000 },
  { id: 'Q1 480p10', width: 854, height: 480, fps: 10, bitrate: 400_000 },
  { id: 'Q2 480p15', width: 854, height: 480, fps: 15, bitrate: 550_000 },
  { id: 'Q3 720p10', width: 1280, height: 720, fps: 10, bitrate: 650_000 },
  { id: 'Q4 720p15', width: 1280, height: 720, fps: 15, bitrate: 850_000 },
  { id: 'Q5 720p20', width: 1280, height: 720, fps: 20, bitrate: 1_100_000 },
  { id: 'Q6 720p24', width: 1280, height: 720, fps: 24, bitrate: 1_350_000 },
  { id: 'Q7 720p30', width: 1280, height: 720, fps: 30, bitrate: 1_700_000 },
  { id: 'Q8 1080p30', width: 1920, height: 1080, fps: 30, bitrate: 3_200_000 },
  { id: 'Q9 1080p HQ', width: 1920, height: 1080, fps: 30, bitrate: 5_000_000 },
  { id: 'Q10 4K30', width: 3840, height: 2160, fps: 30, bitrate: 15_000_000 },
  { id: 'Q11 4K30 HQ', width: 3840, height: 2160, fps: 30, bitrate: 25_000_000 }
];
