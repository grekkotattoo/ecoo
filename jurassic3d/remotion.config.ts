import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
// WebGL en servidores sin GPU: ANGLE + SwiftShader. Con GPU local usa 'angle' o 'egl'.
Config.setChromiumOpenGlRenderer('angle');
Config.setConcurrency(1);
