import type { CustomInitializer, Detector, ForgeConfig } from "./types.js";
export declare const NextAppDetector: Detector;
export declare const FirebaseDetector: Detector;
export declare const PkgDetector: Detector;
export declare const CustomDetector: (init: CustomInitializer) => Detector;
export declare const getDetectors: (cfg: ForgeConfig) => Detector[];
