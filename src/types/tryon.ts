export type CutType = 'slim' | 'regular' | 'relaxed' | 'oversized';
export type FabricType = 'woven' | 'stretch_knit';

export interface SizeChartEntry {
  size: string;
  chest: number;
  waist: number;
  hip: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface PhotoLandmarks {
  head_y: number;
  feet_y: number;
  shoulder_left: Point2D;
  shoulder_right: Point2D;
  chest_left: Point2D;
  chest_right: Point2D;
  waist_left: Point2D;
  waist_right: Point2D;
  hip_left: Point2D;
  hip_right: Point2D;
  arms_in_silhouette: boolean;
  confidence: number;
}

export interface SideLandmarks {
  head_y: number;
  feet_y: number;
  chest_front: Point2D;
  chest_back: Point2D;
  waist_front: Point2D;
  waist_back: Point2D;
  hip_front: Point2D;
  hip_back: Point2D;
  confidence: number;
}

export interface ValidationResult {
  valid: boolean;
  peopleCount: number;
  fullBodyVisible: boolean;
  detectedFacing?: 'front' | 'back' | 'side' | 'garment' | 'unknown';
  feedback: string;
}

export type MeasurementSource = 'front+back photos' | 'side photo' | 'you entered';

export interface BodyMeasurements {
  chest: number;
  waist: number;
  hip: number;
  chestSource: MeasurementSource;
  waistSource: MeasurementSource;
  hipSource: MeasurementSource;
  confidence: number;
  widthAsymmetryWarning?: string;
  uncertaintyCm: number;
}

export type FitCategory = 'tight' | 'fitted' | 'relaxed' | 'loose';

export interface EasePointResult {
  chartValue: number;
  bodyValue: number;
  rawEase: number;
  ease: number;
  category: FitCategory;
}

export interface SizeFitResult {
  size: string;
  chest: EasePointResult;
  waist: EasePointResult;
  hip: EasePointResult;
  passes: boolean;
  overallCategory: FitCategory;
  fitDescription: string;
  promptFitText: string;
}

export interface FitAnalysis {
  measurements: BodyMeasurements;
  sizeResults: SizeFitResult[];
  trueSize: string | null;
  uncertaintySentence?: string;
}

export interface SpinFrame {
  angle: number; // 0, 45, 90, 135, 180, 225, 270, 315
  label: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  error?: string;
}

export interface ShoppingVariantStock {
  size: string; // normalized XS, S, M, L, XL
  rawTitle: string;
  available: boolean;
  price: string;
  sku?: string;
}

export interface ShoppingProduct {
  id: string;
  title: string;
  brand: string;
  category: string;
  price: string;
  currency: string;
  productUrl: string;
  frontImage: string;
  backImage: string;
  cut: CutType;
  fabric: FabricType;
  details: string;
  available: boolean;
  availableSizes: string[];
  variants: ShoppingVariantStock[];
  sizeChart: SizeChartEntry[];
  apiSource: string;
  verifiedAt: string;
}

export interface LiveWebDiscoveryItem {
  title: string;
  brand: string;
  url: string;
  snippet: string;
  availableVerified: boolean;
  httpStatus?: number;
  suggestedCut: CutType;
  suggestedFabric: FabricType;
}

export interface AIShoppingSearchResponse {
  query: string;
  aiStylingAdvice: string;
  recommendedIdeas: string[];
  matchedProducts: ShoppingProduct[];
  webDiscoveries: LiveWebDiscoveryItem[];
  latencyMs: number;
  cacheHit: boolean;
}

