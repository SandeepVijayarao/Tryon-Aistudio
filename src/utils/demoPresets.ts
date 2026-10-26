import { CutType, FabricType, SizeChartEntry, PhotoLandmarks, SideLandmarks } from '../types/tryon.ts';

export interface DemoPreset {
  id: string;
  name: string;
  description: string;
  heightCm: number;
  cut: CutType;
  fabric: FabricType;
  garmentName: string;
  garmentUrl?: string;
  garmentDetails?: string;
  garmentColor: string;
  shopperFrontImage: string;
  shopperBackImage: string;
  shopperSideImage?: string;
  garmentFrontImage: string;
  garmentBackImage: string;
  frontLandmarks: PhotoLandmarks;
  backLandmarks: PhotoLandmarks;
  sideLandmarks?: SideLandmarks;
  sizeChart: SizeChartEntry[];
  framesBySize: Record<string, string[]>;
}

const USER_PORTRAIT_SHEET =
  '/assets/aistudio/front-back-profile-full-portrait-man-white-175624016_676f20bb.webp';
const ZARA_BLAZER_PHOTO = '/assets/aistudio/1859546-800w_3767735c.jpg';

const MAN_BLAZER_0_FRONT = '/src/assets/images/man_blazer_front_1792967532469.jpg';
const MAN_BLAZER_45_ANGLE = '/src/assets/images/man_blazer_angle45_1792967534899.jpg';
const MAN_BLAZER_90_SIDE = '/src/assets/images/man_blazer_side90_1792967537764.jpg';
const MAN_BLAZER_135_ANGLE = '/src/assets/images/man_blazer_angle135_1792967560257.jpg';
const MAN_BLAZER_180_BACK = '/src/assets/images/man_blazer_back180_1792967537773.jpg';
const MAN_BLAZER_TIGHT_FRONT = '/src/assets/images/man_blazer_tight_front_1792967562228.jpg';
const MAN_BLAZER_LOOSE_FRONT = '/src/assets/images/man_blazer_loose_front_1792967563160.jpg';

const SHOPPER_FRONT_IMG = '/src/assets/images/shopper_front_photo_1792965457628.jpg';
const SHOPPER_BACK_IMG = '/src/assets/images/shopper_back_photo_1792965458888.jpg';
const SHOPPER_SIDE_IMG = '/src/assets/images/shopper_side_photo_1792965460062.jpg';
const GARMENT_FRONT_IMG = '/src/assets/images/garment_front_photo_1792965460371.jpg';
const GARMENT_BACK_IMG = '/src/assets/images/garment_back_photo_1792965462525.jpg';

const SPIN_0_FRONT = '/src/assets/images/tryon_spin_front_1792965464401.jpg';
const SPIN_45_ANGLE = '/src/assets/images/tryon_spin_angle45_1792965465448.jpg';
const SPIN_90_SIDE = '/src/assets/images/tryon_spin_side90_1792965467465.jpg';
const SPIN_180_BACK = '/src/assets/images/tryon_spin_back180_1792965467712.jpg';

// 8-angle 360° turntable frames: [0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°]
const ZARA_TRUE_FIT_FRAMES: string[] = [
  MAN_BLAZER_0_FRONT,
  MAN_BLAZER_45_ANGLE,
  MAN_BLAZER_90_SIDE,
  MAN_BLAZER_135_ANGLE,
  MAN_BLAZER_180_BACK,
  MAN_BLAZER_135_ANGLE,
  MAN_BLAZER_90_SIDE,
  MAN_BLAZER_45_ANGLE,
];

const ZARA_TIGHT_FIT_FRAMES: string[] = [
  MAN_BLAZER_TIGHT_FRONT,
  MAN_BLAZER_45_ANGLE,
  MAN_BLAZER_90_SIDE,
  MAN_BLAZER_135_ANGLE,
  MAN_BLAZER_180_BACK,
  MAN_BLAZER_135_ANGLE,
  MAN_BLAZER_90_SIDE,
  MAN_BLAZER_45_ANGLE,
];

const ZARA_LOOSE_FIT_FRAMES: string[] = [
  MAN_BLAZER_LOOSE_FRONT,
  MAN_BLAZER_45_ANGLE,
  MAN_BLAZER_90_SIDE,
  MAN_BLAZER_135_ANGLE,
  MAN_BLAZER_180_BACK,
  MAN_BLAZER_135_ANGLE,
  MAN_BLAZER_90_SIDE,
  MAN_BLAZER_45_ANGLE,
];

const PHOTOREAL_TURNTABLE_FRAMES: string[] = [
  SPIN_0_FRONT,
  SPIN_45_ANGLE,
  SPIN_90_SIDE,
  SPIN_180_BACK,
  SPIN_180_BACK,
  SPIN_180_BACK,
  SPIN_90_SIDE,
  SPIN_45_ANGLE,
];

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'zara-comfort-blazer',
    name: 'User (3-View Portrait) + Zara Blazer',
    description:
      'Uploaded 3-view shopper portrait (Side, Front, Back) dressed in the Zara Comfort Suit Blazer (Ref. 4456/999).',
    heightCm: 178,
    cut: 'regular',
    fabric: 'stretch_knit',
    garmentName: 'Zara Comfort Suit Blazer (Ref. 4456/999)',
    garmentUrl: 'https://www.zara.com/us/en/comfort-suit-blazer-p04456999.html',
    garmentDetails:
      'Zara Comfort Suit Blazer (Ref. 4456/999 / 04456999) in Sand/Cream Marl. Single-breasted structured comfort blazer with notched lapel collar, chest welt pocket, hip flap pockets, front two-button fastening, and double back vents in bi-stretch technical fabric.',
    garmentColor: '#ede6d8',
    shopperFrontImage: USER_PORTRAIT_SHEET,
    shopperBackImage: USER_PORTRAIT_SHEET,
    shopperSideImage: USER_PORTRAIT_SHEET,
    garmentFrontImage: ZARA_BLAZER_PHOTO,
    garmentBackImage: ZARA_BLAZER_PHOTO,
    // Calibrated to the 3-view full-body portrait (/assets/aistudio/front-back-profile-full-portrait-man-white-175624016_676f20bb.webp)
    // head_y=40, feet_y=940 -> 900px height -> cm_per_px = 178 / 900 = 0.1978 cm/px
    frontLandmarks: {
      head_y: 40,
      feet_y: 940,
      shoulder_left: { x: 355, y: 195 },
      shoulder_right: { x: 540, y: 195 },
      chest_left: { x: 372, y: 280 },
      chest_right: { x: 562, y: 280 }, // 190px = 37.58cm width
      waist_left: { x: 376, y: 395 },
      waist_right: { x: 556, y: 395 }, // 180px = 35.60cm width
      hip_left: { x: 375, y: 485 },
      hip_right: { x: 553, y: 485 }, // 178px = 35.20cm width
      arms_in_silhouette: false,
      confidence: 0.97,
    },
    backLandmarks: {
      head_y: 40,
      feet_y: 940,
      shoulder_left: { x: 685, y: 195 },
      shoulder_right: { x: 875, y: 195 },
      chest_left: { x: 702, y: 280 },
      chest_right: { x: 888, y: 280 }, // 186px = 36.79cm width
      waist_left: { x: 706, y: 395 },
      waist_right: { x: 882, y: 395 }, // 176px = 34.81cm width
      hip_left: { x: 700, y: 485 },
      hip_right: { x: 878, y: 485 }, // 178px = 35.20cm width
      arms_in_silhouette: false,
      confidence: 0.96,
    },
    sideLandmarks: {
      head_y: 40,
      feet_y: 940,
      chest_front: { x: 96, y: 280 },
      chest_back: { x: 222, y: 280 }, // 126px = 24.92cm depth -> ~99.0cm chest girth
      waist_front: { x: 100, y: 395 },
      waist_back: { x: 224, y: 395 }, // 124px = 24.52cm depth -> ~94.6cm waist girth
      hip_front: { x: 95, y: 485 },
      hip_back: { x: 215, y: 485 }, // 120px = 23.73cm depth -> ~93.4cm hip girth
      confidence: 0.96,
    },
    sizeChart: [
      { size: 'XS', chest: 88, waist: 76, hip: 90 },
      { size: 'S', chest: 94, waist: 82, hip: 96 },
      { size: 'M', chest: 100, waist: 88, hip: 102 },
      { size: 'L', chest: 106, waist: 94, hip: 108 },
      { size: 'XL', chest: 112, waist: 100, hip: 114 },
    ],
    framesBySize: {
      XS: ZARA_TIGHT_FIT_FRAMES,
      S: ZARA_TIGHT_FIT_FRAMES,
      M: ZARA_TRUE_FIT_FRAMES,
      L: ZARA_TRUE_FIT_FRAMES,
      XL: ZARA_LOOSE_FIT_FRAMES,
    },
  },
  {
    id: 'jordan-linen',
    name: 'Jordan (178 cm) — Linen Overshirt',
    description: 'Studio model (96 cm chest, 80 cm waist, 97 cm hip) with washed linen overshirt.',
    heightCm: 178,
    cut: 'regular',
    fabric: 'woven',
    garmentName: 'Portofino Washed Linen Overshirt',
    garmentColor: '#1e3a2b',
    shopperFrontImage: SHOPPER_FRONT_IMG,
    shopperBackImage: SHOPPER_BACK_IMG,
    shopperSideImage: SHOPPER_SIDE_IMG,
    garmentFrontImage: GARMENT_FRONT_IMG,
    garmentBackImage: GARMENT_BACK_IMG,
    frontLandmarks: {
      head_y: 75,
      feet_y: 925,
      shoulder_left: { x: 358, y: 245 },
      shoulder_right: { x: 642, y: 245 },
      chest_left: { x: 416, y: 310 },
      chest_right: { x: 584, y: 310 },
      waist_left: { x: 431, y: 425 },
      waist_right: { x: 569, y: 425 },
      hip_left: { x: 418, y: 515 },
      hip_right: { x: 582, y: 515 },
      arms_in_silhouette: false,
      confidence: 0.96,
    },
    backLandmarks: {
      head_y: 75,
      feet_y: 925,
      shoulder_left: { x: 358, y: 245 },
      shoulder_right: { x: 642, y: 245 },
      chest_left: { x: 415, y: 310 },
      chest_right: { x: 585, y: 310 },
      waist_left: { x: 430, y: 425 },
      waist_right: { x: 570, y: 425 },
      hip_left: { x: 418, y: 515 },
      hip_right: { x: 582, y: 515 },
      arms_in_silhouette: false,
      confidence: 0.95,
    },
    sideLandmarks: {
      head_y: 75,
      feet_y: 925,
      chest_front: { x: 440, y: 310 },
      chest_back: { x: 562, y: 310 },
      waist_front: { x: 448, y: 425 },
      waist_back: { x: 552, y: 425 },
      hip_front: { x: 436, y: 515 },
      hip_back: { x: 566, y: 515 },
      confidence: 0.94,
    },
    sizeChart: [
      { size: 'XS', chest: 82, waist: 66, hip: 90 },
      { size: 'S', chest: 88, waist: 72, hip: 96 },
      { size: 'M', chest: 96, waist: 80, hip: 104 },
      { size: 'L', chest: 104, waist: 88, hip: 112 },
      { size: 'XL', chest: 112, waist: 96, hip: 120 },
    ],
    framesBySize: {
      M: PHOTOREAL_TURNTABLE_FRAMES,
      XS: PHOTOREAL_TURNTABLE_FRAMES,
      S: PHOTOREAL_TURNTABLE_FRAMES,
      L: PHOTOREAL_TURNTABLE_FRAMES,
      XL: PHOTOREAL_TURNTABLE_FRAMES,
    },
  },
];
