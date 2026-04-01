import React, {useEffect, useState, useRef, useMemo, useCallback} from 'react';
import {Box, Text} from '../../../components/themes';
import {
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  View,
  Dimensions,
  Animated,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import {Assets} from '../../../assets/images';
import {useSelector} from 'react-redux';
import {RootState} from '../../../redux/store';
// import ReactNativeZoomableView from '@openspacelabs/react-native-zoomable-view/src/ReactNativeZoomableView';
import LinearGradient from 'react-native-linear-gradient';
import {PanResponder} from 'react-native';

const {width: SW, height: SH} = Dimensions.get('window');
const BASE_URL = 'https://salessoccer.digilateral.com/api/user';

interface MatchStat {
  matchId: string;
  matchIdRef: number;
  startTime: string;
  endTime: string;
  teamA: string;
  teamB: string;
  teamAGoal: number;
  teamBGoal: number;
  medianCounter: number;
  totalGoalsByMyMRs: number;
}

interface MRStat {
  mrId: string;
  mrName: string;
  flmId: string;
  currentCounter: number;
  totalGoals: number;
  totalPoints: number;
  isOpponent?: boolean;
}

const getZone = (counter: number): 'ATTACK' | 'MIDFIELD' | 'DEFENSE' => {
  if (counter <= 2) return 'DEFENSE';
  if (counter <= 4) return 'MIDFIELD';
  return 'ATTACK';
};

const getStripInZone = (counter: number): number => {
  if (counter === 1) return 0;
  if (counter === 2) return 1;
  if (counter === 3) return 0;
  if (counter === 4) return 1;
  if (counter === 5) return 0;
  if (counter === 6) return 1;
  return 0;
};

const getPositionLabel = (counter: number): string => {
  if (counter === 1 || counter === 2) return 'Defense';
  if (counter === 3 || counter === 4) return 'Midfield';
  if (counter === 5 || counter === 6) return 'Attack';
  return '-';
};

const getPlayerPositionText = (counter: number) => {
  if (counter === 0) return '';
  if (counter <= 2) return 'Defense';
  if (counter <= 4) return 'Midfield';
  return 'Attack';
};

const getPlayerAnimation = (
  counter: number,
  index: number,
  isOpponent: boolean,
) => {
  if (counter === 0) return null;
  const zone = getZone(Math.min(Math.max(counter, 1), 6));

  // ✅ Flip zone asset for opponent — their ATTACK is our DEFENSE visually
  const assetZone = isOpponent
    ? zone === 'ATTACK'
      ? 'DEFENSE'
      : zone === 'DEFENSE'
      ? 'ATTACK'
      : 'MIDFIELD'
    : zone;

  const frames = isOpponent
    ? Assets.PlayerMoves.OppTeam[assetZone]
    : Assets.PlayerMoves.MyTeam[assetZone];

  if (!frames || frames.length === 0) return null;
  return frames[index % frames.length];
};

// Y controls zone on rotated field: ATTACK=top, DEFENSE=bottom
const ZONE_Y_RANGES: Record<
  'ATTACK' | 'MIDFIELD' | 'DEFENSE',
  [number, number]
> = {
  ATTACK: [0.05, 0.3],
  MIDFIELD: [0.38, 0.62],
  DEFENSE: [0.7, 0.92],
};

const getStripAnchorY = (
  zone: 'ATTACK' | 'MIDFIELD' | 'DEFENSE',
  strip: number,
): number => {
  const [start, end] = ZONE_Y_RANGES[zone];
  const stripHeight = (end - start) / 6;
  return start + stripHeight * strip + stripHeight / 2;
};

const ZONE_X_RANGES: Record<
  'ATTACK' | 'MIDFIELD' | 'DEFENSE',
  [number, number]
> = {
  DEFENSE: [0.72, 0.96], // right third  (my team defends right)
  MIDFIELD: [0.36, 0.64], // center
  ATTACK: [0.04, 0.28], // left third   (my team attacks left)
};

const getStripAnchorX = (
  zone: 'ATTACK' | 'MIDFIELD' | 'DEFENSE',
  strip: number,
): number => {
  const [start, end] = ZONE_X_RANGES[zone];
  const stripWidth = (end - start) / 6;
  return start + stripWidth * strip + stripWidth / 2;
};
// const getStripIndex = (counter: number) => {
//   if (counter <= 6) return counter - 1;
//   if (counter <= 12) return counter - 7;
//   return counter - 13;
// };

// const getXFrac = (
//   counter: number,
//   indexInZone: number,
//   countInZone: number,
// ): number => {
//   const zone = getZone(counter);
//   const strip = getStripIndex(counter);

//   const zoneRanges = {
//     ATTACK: [0.08, 0.26],
//     MIDFIELD: [0.38, 0.62],
//     DEFENSE: [0.74, 0.92],
//   };

//   const [start, end] = zoneRanges[zone];

//   const stripWidth = (end - start) / 6;

//   const x = start + stripWidth * strip + stripWidth / 2;

//   return Math.min(Math.max(x, 0.05), 0.95);
// };

// const getYFrac = (index: number, total: number) => {
//   if (total <= 1) return 0.5;
//   return 0.25 + (index / Math.max(total - 1, 1)) * 0.5;
// };

// const getPlayerFrame = (counter: number, frameIdx: number) => {
//   const zone = getZone(counter);
//   const arr =
//     zone === 'ATTACK'
//       ? Assets.PlayerMoves.Attack
//       : zone === 'MIDFIELD'
//       ? Assets.PlayerMoves.Midfield
//       : Assets.PlayerMoves.Defense;
//   const frames = Array.isArray(arr) ? arr : [arr];
//   return frames[frameIdx % frames.length] ?? frames[0];
// };

//const getPlayerStaticFrame = (counter: number) => getPlayerFrame(counter, 0);

const ZONE_TO_ASSET = {
  ATTACK: 'ATTACK',
  MIDFIELD: 'MIDFIELD',
  DEFENSE: 'DEFENSE',
};

const GroundModal = ({
  visible,
  onClose,
  mrs,
  oppMrs,
  userId,
  bannerCounter,
}: {
  visible: boolean;
  onClose: () => void;
  mrs: MRStat[];
  oppMrs: MRStat[];
  userId: string;
  bannerCounter: number;
}) => {
  const [selectedMr, setSelectedMr] = useState<MRStat | null>(null);
  const [showOpp, setShowOpp] = useState(false); // false=my team, true=opponent
  const zoomRef = useRef<any>(null);
  const tableScrollRef = useRef<ScrollView>(null);
  const scale = useRef(new Animated.Value(1)).current;
  const {width: screenW, height: screenH} = useWindowDimensions();
  const LS_W = screenH;
  const LS_H = screenW;
  const LABEL_H = 34;
  const FIELD_H = Math.round(LS_H * 0.52);
  const STATS_H = LS_H - FIELD_H - LABEL_H;

  const G_TOP = FIELD_H * 0.4;
  const G_BOT = FIELD_H * 0.85;
  const grassH = G_BOT - G_TOP;
  const TL = LS_W * 0.28;
  const TR = LS_W * 0.6;
  const BL = LS_W * 0.0;
  const BR = LS_W * 1.0;

  const IMG_SIZE = 40;
  const BADGE_SIZE = 13;
  const GK_SIZE = 32;

  // Table
  const TABLE_W = LS_W * 0.48;
  const COL_NAME = TABLE_W * 0.32;
  const COL_BP = TABLE_W * 0.26;
  const COL_G = TABLE_W * 0.16;
  const COL_POS = TABLE_W * 0.26;
  const HDR_H = 26;
  const ROW_H = 30;
  const TABLE_AREA_H = STATS_H - HDR_H - 44;
  const TRACK_H = TABLE_AREA_H;
  const THUMB_H = 18;

  // Active list switches with toggle
  const activeMrs = showOpp ? oppMrs : mrs;
  console.log('MY TEAM MRS:', mrs);
  console.log('OPP TEAM MRS:', oppMrs);
  console.log('SHOWING TEAM:', showOpp ? 'OPPONENT' : 'MY TEAM');
  console.log('ACTIVE MRS:', activeMrs);
  const sorted = useMemo(
    () =>
      [...activeMrs].sort(
        (a, b) => b.totalGoals - a.totalGoals || b.totalPoints - a.totalPoints,
      ),
    [activeMrs],
  );

  useEffect(() => {
    console.log('MODAL RECEIVED MY:', mrs);
    console.log('MODAL RECEIVED OPP:', oppMrs);
  }, [mrs, oppMrs]);

  const ZONE_ANCHORS = {
    DEFENSE: [
      {x: 0.92, y: 0.42}, // slot 0 — top
      {x: 0.92, y: 0.62}, // slot 1 — bottom
      {x: 0.96, y: 0.42}, // slot 2
      {x: 0.96, y: 0.62}, // slot 3
      {x: 0.92, y: 0.52}, // slot 4 — middle
      {x: 0.96, y: 0.52}, // slot 5
    ],
    MIDFIELD: [
      {x: 0.42, y: 0.52},
      {x: 0.5, y: 0.52},
      {x: 0.58, y: 0.52},
      {x: 0.42, y: 0.62},
      {x: 0.5, y: 0.62},
      {x: 0.58, y: 0.62},
    ],
    ATTACK: [
      {x: 0.08, y: 0.45}, // ← was 0.22
      {x: 0.14, y: 0.45}, // ← was 0.28
      {x: 0.08, y: 0.52}, // ← was 0.22
      {x: 0.14, y: 0.45}, // ← was 0.28
      {x: 0.08, y: 0.58}, // ← was 0.22
      {x: 0.14, y: 0.58}, // ← was 0.28
    ],
  };

  const counterToStripIndex = (counter: number): number => {
    if (counter === 1) return 0; // DEFENSE strip 1 → anchor index 0
    if (counter === 2) return 2; // DEFENSE strip 2 → anchor index 2
    if (counter === 3) return 0; // MIDFIELD strip 3 → anchor index 0
    if (counter === 4) return 2; // MIDFIELD strip 4 → anchor index 2
    if (counter === 5) return 4; // MIDFIELD strip 5 → anchor index 4
    if (counter === 6) return 0; // ATTACK strip 6 → anchor index 0
    if (counter === 7) return 2; // ATTACK strip 7 → anchor index 2
    return 0;
  };
  const POSITION_ANCHORS_MAP: Record<number, {x: number; y: number}> = {
    1: {x: 0.86, y: 0.45}, // ← was 0.82
    2: {x: 0.92, y: 0.58},
    3: {x: 0.5, y: 0.35}, // Midfield
    4: {x: 0.5, y: 0.65}, // Midfield
    5: {x: 0.22, y: 0.45}, // Attack - centered
    6: {x: 0.22, y: 0.58}, // Attack - centered
    7: {x: 0.04, y: 0.5}, // Goal
  };

  const getStripIndex = (counter: number) => {
    if (counter <= 6) return counter - 1;
    if (counter <= 12) return counter - 7;
    return counter - 13;
  };

  const MY_TEAM_ZONE_TO_ASSET: Record<
    'ATTACK' | 'MIDFIELD' | 'DEFENSE',
    'ATTACK' | 'MIDFIELD' | 'DEFENSE'
  > = {
    ATTACK: 'DEFENSE',
    MIDFIELD: 'MIDFIELD',
    DEFENSE: 'ATTACK',
  };

  const OPP_TEAM_ZONE_TO_ASSET: Record<
    'ATTACK' | 'MIDFIELD' | 'DEFENSE',
    'ATTACK' | 'MIDFIELD' | 'DEFENSE'
  > = {
    ATTACK: 'DEFENSE',
    MIDFIELD: 'MIDFIELD',
    DEFENSE: 'ATTACK',
  };

  const buildPositions = (teamMrs: MRStat[], isOppTeam: boolean) => {
    return teamMrs.map(mr => {
      //console.log('MR:', mr.mrName, 'Counter:', counter, 'X:', x, 'Y:', y);
      const counter = Math.min(Math.max(mr.currentCounter || 1, 1), 7);

      // DIRECT anchor mapping by counter
      const anchor = POSITION_ANCHORS_MAP[counter] || POSITION_ANCHORS_MAP[1];

      let x = anchor.x;
      let y = anchor.y;

      // Mirror for opponent team
      if (isOppTeam) {
        x = 1 - x;
      }

      return {
        mr,
        x,
        y,
        isOpp: isOppTeam,
      };
    });
  };

  const myTeamPositions = useMemo(() => {
    const zoneCount: Record<string, number> = {
      DEFENSE: 0,
      MIDFIELD: 0,
      ATTACK: 0,
    };

    return mrs.map(mr => {
      const counter = Math.max(mr.currentCounter || 1, 1);

      const zone = getZone(counter);
      const anchors = ZONE_ANCHORS[zone];
      const slotIdx = zoneCount[zone] % anchors.length;
      zoneCount[zone]++; // ← increment so next player in same zone gets different slot

      return {
        mr,
        x: anchors[slotIdx].x,
        y: anchors[slotIdx].y,
        isOpp: false,
      };
    });
  }, [mrs, userId, bannerCounter]);

  const oppTeamPositions = useMemo(() => {
    const zoneCount: Record<string, number> = {
      DEFENSE: 0,
      MIDFIELD: 0,
      ATTACK: 0,
    };

    return oppMrs.map(mr => {
      const counter = Math.min(Math.max(mr.currentCounter || 1, 1), 7);
      const zone = getZone(counter);
      const anchors = ZONE_ANCHORS[zone];
      const slotIdx = zoneCount[zone] % anchors.length;
      zoneCount[zone]++;

      return {
        mr,
        x: 1 - anchors[slotIdx].x,
        y: anchors[slotIdx].y,
        isOpp: true,
      };
    });
  }, [oppMrs]);

  const allFieldPositions = useMemo(() => {
    if (showOpp) {
      // Show ONLY opponent team players on field
      return oppTeamPositions;
    } else {
      // Show ONLY my team players on field
      return myTeamPositions;
    }
  }, [showOpp, myTeamPositions, oppTeamPositions]);

  const horizontalLock = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        // allow gesture only if horizontal movement is bigger
        return Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onPanResponderMove: () => {},
      onPanResponderRelease: () => {},
    }),
  ).current;
  const sliderTop =
    sorted.length > 1 && selectedMr
      ? (sorted.findIndex(m => m.mrId === selectedMr.mrId) /
          (sorted.length - 1)) *
        (TRACK_H - THUMB_H)
      : 0;

  const toPixel = (xFrac: number, yFrac: number) => {
    const leftEdge = BL + (TL - BL) * (1 - yFrac);
    const rightEdge = BR + (TR - BR) * (1 - yFrac);
    return {
      px: leftEdge + (rightEdge - leftEdge) * xFrac,
      py: G_TOP + grassH * yFrac,
    };
  };

  const selectMr = (mr: MRStat) => {
    setSelectedMr(prev => (prev?.mrId === mr.mrId ? null : mr));
    const idx = sorted.findIndex(m => m.mrId === mr.mrId);
    if (idx >= 0)
      tableScrollRef.current?.scrollTo({y: idx * ROW_H, animated: true});
  };

  const detailImg = selectedMr
    ? (() => {
        const c = selectedMr.currentCounter;
        const animC = showOpp ? (c <= 2 ? 5 : c <= 4 ? c : 1) : c;
        return getPlayerAnimation(animC, 0, showOpp);
      })()
    : null;
  const gkL = toPixel(0.11, 0.51);
  const gkR = toPixel(0.99, 0.57);
  const gkFrame = Assets.Home.GoalKeeper;
  const gkFrame2 = (() => {
    const p = (s: any) => (Array.isArray(s) ? s[0] : s);
    return p(Assets.Home.GoalKeeper1);
  })();

  const COLS = [
    {label: 'PLAYER NAME', w: COL_NAME},
    {label: 'Dribble', w: COL_BP},
    {label: 'GOALS', w: COL_G},
    {label: 'POSITION', w: COL_POS},
  ];
  const LBL_W = LS_W * 0.18;
  const LBL_H = LABEL_H * 0.85;

  const zoomIn = () => {
    Animated.spring(scale, {
      toValue: 1.5,
      useNativeDriver: true,
    }).start();
  };

  const zoomOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const zoomToPoint = (x: number, y: number) => {
    if (!zoomRef.current) return;

    const nx = x / LS_W;
    const ny = y / FIELD_H;

    zoomRef.current.zoomToLocation({
      x: nx,
      y: ny,
      scale: 2.2,
      animated: true,
    });
  };
  // Toggle pill colours
  const myColor: [string, string] = ['#1a6ecc', '#c2149c'];
  const oppColor: [string, string] = ['#ab128f', '#2709be'];
  const activeHdr: [string, string] = ['#c2185b', '#7b0040'];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: '#000',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <View
          style={{
            width: LS_W,
            height: LS_H,
            transform: [{rotate: '90deg'}],
            backgroundColor: '#111118',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
          {/* CLOSE */}
          <TouchableOpacity onPress={onClose} style={gm.closeBtn}>
            <Text style={gm.closeTxt}>✕</Text>
          </TouchableOpacity>

          {/* ══ SECTION 1: STATS ══ */}
          <View
            style={{
              width: LS_W,
              height: STATS_H,
              flexDirection: 'row',
              alignItems: 'flex-end',
              paddingTop: 6,
              paddingLeft: 2,
            }}>
            <View style={{flex: 1, paddingLeft: 2}}>
              {/* Badge row + TEAM TOGGLE */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 4,
                  marginLeft: 22,
                  gap: 6,
                }}>
                <LinearGradient
                  colors={['#e91e8c', '#9c1450']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={gm.badge}>
                  <Text style={gm.badgeTxt}>Player Position</Text>
                </LinearGradient>
                <Text style={gm.chev}>❯</Text>
                <Text style={gm.chev}>❯</Text>
                <Text style={gm.chev}>❯</Text>
              </View>

              <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
                <View
                  style={[
                    gm.sliderTrack,
                    {
                      height: HDR_H + TRACK_H,
                      backgroundColor: '#7b0040',
                    },
                  ]}>
                  <View
                    style={[
                      gm.sliderThumb,
                      {
                        top: HDR_H + sliderTop,
                        backgroundColor: '#c2185b',
                      },
                    ]}
                  />
                </View>

                <View
                  style={{width: TABLE_W, overflow: 'hidden', borderRadius: 3}}>
                  {/* Header */}
                  <View style={{flexDirection: 'row', height: HDR_H}}>
                    {COLS.map(col => (
                      <LinearGradient
                        key={col.label}
                        colors={activeHdr}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0}}
                        style={{
                          width: col.w,
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderWidth: 0.5,
                          borderColor: 'rgba(255,255,255,0.12)',
                        }}>
                        <Text style={gm.hdrTxt}>{col.label}</Text>
                      </LinearGradient>
                    ))}
                  </View>

                  <ScrollView
                    ref={tableScrollRef}
                    showsVerticalScrollIndicator={false}
                    style={{maxHeight: TABLE_AREA_H}}
                    nestedScrollEnabled>
                    {activeMrs.length === 0 ? (
                      <View
                        style={{
                          height: ROW_H * 2,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                        <Text
                          style={{color: 'rgba(255,255,255,0.3)', fontSize: 9}}>
                          {showOpp ? 'No opponent data' : 'Loading...'}
                        </Text>
                      </View>
                    ) : (
                      sorted.map(mr => {
                        const sel = selectedMr?.mrId === mr.mrId;

                        const counter = Math.max(mr.currentCounter || 1, 1);

                        const positionText = getPositionLabel(counter);

                        const vals = [
                          mr.mrName,
                          String(mr.totalPoints),
                          String(mr.totalGoals),
                          positionText,
                        ];
                        return (
                          <TouchableOpacity
                            key={mr.mrId}
                            onPress={() => selectMr(mr)}
                            activeOpacity={0.75}>
                            <View
                              style={{
                                flexDirection: 'row',
                                height: ROW_H,
                                backgroundColor: sel ? '#5535a0' : '#2e1060',
                                borderBottomWidth: 0.5,
                                borderBottomColor: 'rgba(255,255,255,0.07)',
                              }}>
                              {COLS.map((col, ci) => (
                                <View
                                  key={ci}
                                  style={{
                                    width: col.w,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderRightWidth: 0.5,
                                    borderRightColor: 'rgba(255,255,255,0.08)',
                                    paddingHorizontal: 2,
                                  }}>
                                  <Text
                                    style={{
                                      color: sel
                                        ? 'rgb(239, 139, 211)'
                                        : '#fff',
                                      fontSize: 9,
                                      textAlign: 'center',
                                    }}
                                    numberOfLines={1}>
                                    {vals[ci]}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              </View>
            </View>
            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                right: 10,
                top: FIELD_H * 0.35,
                zIndex: 50,
                alignItems: 'center',
              }}>
              <View
                style={{marginLeft: 6, alignItems: 'center', marginBottom: 40}}>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: 6,
                    marginBottom: 2,
                    letterSpacing: 0.5,
                  }}>
                  {showOpp ? 'OPPONENT' : 'MY TEAM'}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setShowOpp(p => !p);
                    setSelectedMr(null);
                  }}>
                  {/* outer pill track */}
                  <View
                    style={{
                      width: 64,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      borderWidth: 1,
                      borderColor: showOpp ? '#ff4444' : '#1a6ecc',
                      padding: 2,
                      justifyContent: 'center',
                    }}>
                    <Animated.View
                      style={{
                        position: 'absolute',
                        left: showOpp ? 36 : 2, // slides left↔right
                        width: 24,
                        height: 20,
                        borderRadius: 10,
                        overflow: 'hidden',
                      }}>
                      <LinearGradient
                        colors={showOpp ? oppColor : myColor}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0}}
                        style={{
                          flex: 1,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                        <Text
                          style={{
                            fontSize: 5,
                            color: '#fff',
                            fontWeight: '900',
                          }}>
                          {showOpp ? 'OPP' : 'ME'}
                        </Text>
                      </LinearGradient>
                    </Animated.View>
                    {/* track label on opposite side */}
                    <Text
                      style={{
                        position: 'absolute',
                        left: showOpp ? 6 : 32,
                        fontSize: 5,
                        color: 'rgba(255,255,255,0.4)',
                        fontWeight: '700',
                      }}>
                      {showOpp ? 'ME' : 'OPP'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={zoomIn}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: '#fff',
                }}>
                <Text style={{color: '#fff', fontSize: 18, fontWeight: 'bold'}}>
                  +
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={zoomOut}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#fff',
                }}>
                <Text style={{color: '#fff', fontSize: 18, fontWeight: 'bold'}}>
                  −
                </Text>
              </TouchableOpacity>
            </View>
            {/* Player sprite */}
            <View
              style={{
                width: LS_W * 0.18,
                height: STATS_H,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: '18%',
                paddingTop: 20,
              }}>
              {detailImg ? (
                <Image
                  source={detailImg}
                  style={{width: LS_W * 0.16, height: STATS_H * 0.9}}
                  resizeMode="contain"
                />
              ) : null}
            </View>
          </View>

          <View
            {...horizontalLock.panHandlers}
            style={{width: LS_W, height: FIELD_H, overflow: 'hidden'}}>
            <Animated.View
              style={{
                width: LS_W,
                height: FIELD_H,
                transform: [{scale}],
              }}>
              <Image
                source={Assets.Home.Field}
                style={{
                  position: 'absolute',
                  width: LS_W,
                  height: FIELD_H,
                  marginTop: '8%',
                }}
                resizeMode="cover"
              />
              {/* Goalkeepers */}
              {gkFrame && (
                <>
                  <View
                    style={{
                      position: 'absolute',
                      left: gkL.px - GK_SIZE / 2,
                      top: gkL.py - GK_SIZE,
                      width: GK_SIZE,
                    }}>
                    <Image
                      source={gkFrame}
                      style={{width: GK_SIZE, height: GK_SIZE}}
                      resizeMode="contain"
                    />
                  </View>

                  <View
                    style={{
                      position: 'absolute',
                      left: gkR.px - GK_SIZE / 2,
                      top: gkR.py - GK_SIZE,
                      width: GK_SIZE,
                    }}>
                    <Image
                      source={gkFrame2}
                      style={{width: GK_SIZE, height: GK_SIZE}}
                      resizeMode="contain"
                    />
                  </View>
                </>
              )}

              {/* Players */}
              {allFieldPositions.map(({mr, x, y, isOpp}, i) => {
                const sel = selectedMr?.mrId === mr.mrId;
                const counter = Math.max(mr.currentCounter || 1, 1);
                const animCounter = isOpp
                  ? counter <= 2
                    ? 5 // opponent DEFENSE → use ATTACK frames (they appear on attack side)
                    : counter <= 4
                    ? counter // MIDFIELD stays same
                    : 1 // opponent ATTACK → use DEFENSE frames (they appear on defense side)
                  : counter;
                const frame = getPlayerAnimation(animCounter, i, isOpp);
                if (!frame) return null;
                const {px, py} = toPixel(x, y);
                const zone = getZone(counter);
                const zc = showOpp
                  ? '#fff'
                  : zone === 'ATTACK'
                  ? '#fff'
                  : zone === 'MIDFIELD'
                  ? '#fff'
                  : '#fff';

                return (
                  <Pressable
                    key={`${isOpp ? 'opp' : 'my'}-${mr.mrId}`}
                    onPress={() => {
                      selectMr(mr);
                      zoomToPoint(px, py);
                    }}
                    style={{
                      position: 'absolute',
                      left: px - IMG_SIZE / 2,
                      top: py - IMG_SIZE / 2,
                      alignItems: 'center',
                      width: IMG_SIZE,
                    }}>
                    {sel && (
                      <View
                        style={
                          {
                            // position: 'absolute',
                            // top: -3,
                            // left: -2,
                            // width: IMG_SIZE + 6,
                            // height: IMG_SIZE + 6,
                            // borderRadius: (IMG_SIZE + 6) / 2,
                            // borderWidth: 2,
                            // borderColor: '#ffd700',
                            // backgroundColor: 'rgba(255,215,0,0.2)',
                          }
                        }
                      />
                    )}
                    <Image
                      source={frame}
                      style={{width: IMG_SIZE, height: IMG_SIZE}}
                      resizeMode="contain"
                    />
                    <View
                      style={{
                        position: 'absolute',
                        top: -BADGE_SIZE * 0.2,
                        right: -BADGE_SIZE * 0.4,
                        width: BADGE_SIZE,
                        height: BADGE_SIZE,
                        borderRadius: BADGE_SIZE / 2,
                        // backgroundColor: zc,
                        borderWidth: 1,
                        // borderColor: '#fff',
                        justifyContent: 'center',
                        alignItems: 'center',
                        elevation: 3,
                      }}>
                      <Text
                        style={{
                          color: '#fff',
                          fontSize: 6,
                          fontWeight: 'bold',
                        }}>
                        {mr.totalGoals}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </Animated.View>
          </View>

          {/* ══ SECTION 3: ZONE LABELS ══ */}
          <View
            style={{
              width: LS_W,
              height: LABEL_H,
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'center',
              backgroundColor: '#111118',
            }}>
            <Image
              source={
                showOpp ? Assets.Home.DefenceLabel : Assets.Home.AttackLabel
              }
              style={{width: LBL_W, height: LBL_H, marginBottom: '4%'}}
              resizeMode="contain"
            />
            <Image
              source={Assets.Home.MidfieldLabel}
              style={{width: LBL_W, height: LBL_H, marginBottom: '4%'}}
              resizeMode="contain"
            />
            <Image
              source={
                showOpp ? Assets.Home.AttackLabel : Assets.Home.DefenceLabel
              }
              style={{width: LBL_W, height: LBL_H, marginBottom: '4%'}}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const MatchSummary = () => {
  const userId = useSelector((state: RootState) => state.auth.mrId);
  const role = useSelector((state: RootState) => state.auth.role);
  const socket = useSelector((state: RootState) => state.socket?.instance);
  const isMR = (role ?? '').toUpperCase() === 'MR';
  const stats = useSelector((state: RootState) => state.player?.stats);
  console.log('=== MATCH ORDER DEBUG ===');
  console.log('totalMatches:', stats?.totalMatches);
  console.log('last5MatchGoals raw:', JSON.stringify(stats?.last5MatchGoals));
  console.log(
    'wins:',
    stats?.wins,
    'losses:',
    stats?.losses,
    'draws:',
    stats?.draws,
  );
  //console.log('PLAYER STATS:', stats);
  const isMatchActive = isMR ? stats?.isMatchOn === 1 : true;
  const [flmLast5, setFlmLast5] = useState<number[]>([]);

  const [totalGoals, setTotalGoals] = useState(0);
  const [allMrs, setAllMrs] = useState<MRStat[]>([]);
  const [allOppMrs, setAllOppMrs] = useState<MRStat[]>([]);
  const [avgPosition, setAvgPosition] = useState(1);
  const [showGround, setShowGround] = useState(false);

  const [frameIndex, setFrameIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const goalHandledRef = useRef(false);
  const lastTapRef = useRef<number>(0);
  const rawCounter = Number(stats?.currentCounter ?? 1);
  console.log('stats.totalGoals', stats?.totalGoals);
  console.log('stats.currentMatchGoals', stats?.currentMatchGoals);
  const playerPosition = Math.min(Math.max(rawCounter, 1), 7);

  const playerPositionText = getPlayerPositionText(playerPosition);
  console.log('BANNER COUNTER FROM REDUX:', rawCounter);
  console.log(
    'API COUNTER FROM myTeamMrs:',
    allMrs.map(m => m.currentCounter),
  );
  console.log('Banner Counter:', rawCounter);
  console.log('Banner Position:', playerPosition);
  console.log('Avg Position:', clampedAvg);
  console.log(
    'allMrs goals',
    allMrs.map(m => ({
      name: m.mrName,
      goals: m.totalGoals,
    })),
  );

  // const playerPosition =
  //   rawCounter > 0 ? Math.min(Math.max(rawCounter, 1), 7) : 1;
  // const playerPositionText = getPlayerPositionText(playerPosition);

  const [avgFrameIndex, setAvgFrameIndex] = useState(0);
  const avgTranslateX = useRef(new Animated.Value(0)).current;
  const safeAvg = Number(avgPosition) || 1;
  const clampedAvg = Math.min(Math.max(safeAvg, 1), 7);
  console.log('Banner Counter:', rawCounter);
  console.log('Banner Position:', playerPosition);
  console.log('Avg Position:', clampedAvg);
  console.log(
    'MyTeam Counters:',
    allMrs.map(m => m.currentCounter),
  );

  const avgFrames =
    Assets.PlayerPosition[clampedAvg] || Assets.PlayerPosition[1];
  const bannerCounter =
    (playerPosition > 0 ? playerPosition : 1) || clampedAvg || 1;

  const bannerFrames =
    Assets.PlayerPosition[bannerCounter] || Assets.PlayerPosition[1];

  const bannerSrc =
    Array.isArray(bannerFrames) && bannerFrames.length > 0
      ? bannerFrames[avgFrameIndex % bannerFrames.length]
      : bannerFrames;
  console.log('roleeeses', role);
  console.log('roleeeses', userId);
  console.log('roleeeses', isMR);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    console.log('call ho raha hai');

    const userRole = (role ?? '').toLowerCase();
    // const apiRole = userRole === 'mr' ? 'flm' : userRole;

    try {
      if (userRole === 'mr') {
        console.log('=== MR FETCH START ===');

        const matchRes = await fetch(
          `${BASE_URL}/active-matches-stats?userId=${userId}&userRole=mr`,
        );
        const matchJson = await matchRes.json();

        const matchId =
          matchJson?.data?.matches?.[0]?.matchId || stats?.fastestGoalMatchId;

        if (!matchId) return;

        const mrRes = await fetch(
          `${BASE_URL}/matches/${matchId}/mr-stats?userId=${userId}&userRole=mr`,
        );
        const mrJson = await mrRes.json();

        if (!mrJson.success || !mrJson.data) return;

        const myTeam = mrJson.data.myTeamMrs || [];
        const opponent = mrJson.data.opponentMrs || [];

        console.log('MR API MY:', myTeam);
        console.log('MR API OPP:', opponent);

       setAllMrs(prev => myTeam.length ? myTeam : prev);
setAllOppMrs(prev => opponent.length ? opponent : prev);

        return;
      }
      console.log('yaha tak aaya');
      // Replace the entire FLM branch (after "console.log('yaha tak aaya')") with this:

      const matchRes = await fetch(
        `${BASE_URL}/active-matches-stats?userId=${userId}&userRole=${userRole}`,
      );
      const matchJson = await matchRes.json();

      const matches: MatchStat[] = matchJson.data.matches;

      setTotalGoals(
        matches.reduce((sum, m) => sum + (Number(m.totalGoalsByMyMRs) || 0), 0),
      );

      const medianSum = matches.reduce(
        (sum, m) => sum + (Number(m.medianCounter) || 1),
        0,
      );
      const avg =
        matches.length > 0 ? Math.round(medianSum / matches.length) : 1;
      setAvgPosition(isNaN(avg) || avg < 1 ? 1 : Math.min(avg, 7));

      const last5Goals = matches
        .slice(0, 5)
        .map(m => Number(m.totalGoalsByMyMRs) || 0);
      while (last5Goals.length < 5) last5Goals.push(null as any);
      setFlmLast5(last5Goals);

      // ✅ Declare ONCE outside the loop
      const myTeamFinal: MRStat[] = [];
      const oppTeamFinal: MRStat[] = [];

      // ✅ Use Maps to accumulate MRs and prevent duplicates across multiple matches
      const myTeamMap = new Map<string, MRStat>();
      const oppTeamMap = new Map<string, MRStat>();

      for (const m of matches) {
        const mrRes = await fetch(
          `${BASE_URL}/matches/${m.matchId}/mr-stats?userId=${userId}&userRole=${userRole}`,
        );
        const mrJson = await mrRes.json();
        if (!mrJson.success || !mrJson.data) continue;

        const myTeamData = (mrJson.data.myTeamMrs || []).map((mr: MRStat) => ({
          ...mr,
          currentCounter: Math.max(1, Number(mr.currentCounter) || 1),
          totalGoals: Number(mr.totalGoals) || 0,
          totalPoints: Number(mr.totalPoints) || 0,
        }));

        const opponentTeamData = (mrJson.data.opponentMrs || []).map(
          (mr: MRStat) => ({
            ...mr,
            currentCounter: Math.max(1, Number(mr.currentCounter) || 1),
            totalGoals: Number(mr.totalGoals) || 0,
            totalPoints: Number(mr.totalPoints) || 0,
          }),
        );

        // Check by flmId since logged-in user is an FLM
        const userInMyTeam = myTeamData.some(
          (mr: MRStat) => mr.flmId === userId,
        );
        const userInOppTeam = opponentTeamData.some(
          (mr: MRStat) => mr.flmId === userId,
        );

        let actualMyTeam = myTeamData;
        let actualOppTeam = opponentTeamData;

        // Swap — API returned teams from opponent FLM's perspective
        if (userInOppTeam && !userInMyTeam) {
          actualMyTeam = opponentTeamData;
          actualOppTeam = myTeamData;
        }

        // Add to Maps (If an mrId already exists, it simply overwrites/updates it)
        actualMyTeam.forEach((mr: MRStat) => myTeamMap.set(mr.mrId, mr));
        actualOppTeam.forEach((mr: MRStat) => oppTeamMap.set(mr.mrId, mr));
      }

      // Convert Maps back to Arrays and set state
      // const myTeamFinal = Array.from(myTeamMap.values());
      // const oppTeamFinal = Array.from(oppTeamMap.values());

      const myTeamFinalArr = Array.from(myTeamMap.values());
      const oppTeamFinalArr = Array.from(oppTeamMap.values());

      setAllMrs(myTeamFinalArr);
      setAllOppMrs(oppTeamFinalArr);

      console.log('MY TEAM FINAL:', myTeamFinalArr);
      console.log('OPP TEAM FINAL:', oppTeamFinalArr);

      console.log('MY TEAM FINAL:', myTeamFinal);
      console.log('OPP TEAM FINAL:', oppTeamFinal);
    } catch (err) {
      console.log('Fetch Error:', err);
    }
  }, [userId, role, isMR]);

  //  const fetchData = useCallback(async () => {
  //   if (!userId) return;

  //   const userRole = (role ?? '').toLowerCase();

  //   try {

  //     const matchRes = await fetch(
  //       `${BASE_URL}/active-matches-stats?userId=${userId}&userRole=${userRole}`
  //     );

  //     const matchJson = await matchRes.json();

  //     if (!matchJson.success || !matchJson.data?.matches?.length) return;

  //     const matchId = matchJson.data.matches[0].matchId;

  //   const mrRes = await fetch(
  //   `${BASE_URL}/matches/${m.matchId}/mr-stats?userId=${userId}&userRole=${userRole}`
  // );
  //     const mrJson = await mrRes.json();

  //     if (!mrJson.success || !mrJson.data) return;

  //     const myTeam = (mrJson.data.myTeamMrs || []).map((mr: MRStat) => ({
  //       ...mr,
  //       currentCounter: Math.max(1, Number(mr.currentCounter) || 1),
  //       totalGoals: Number(mr.totalGoals) || 0,
  //       totalPoints: Number(mr.totalPoints) || 0,
  //     }));

  //     const opponentTeam = (mrJson.data.opponentMrs || []).map((mr: MRStat) => ({
  //       ...mr,
  //       currentCounter: Math.max(1, Number(mr.currentCounter) || 1),
  //       totalGoals: Number(mr.totalGoals) || 0,
  //       totalPoints: Number(mr.totalPoints) || 0,
  //     }));

  //     setAllMrs(myTeam);
  //     setAllOppMrs(opponentTeam);

  //   } catch (err) {
  //     console.log('Fetch Error:', err);
  //   }
  // }, [userId, role]);

  useEffect(() => {
    if (!socket) return;

    const h = () => {
      console.log('SOCKET REFRESH FETCH');
      fetchData();
    };

    socket.on('goal', h);
    socket.on('matchUpdate', h);

    return () => {
      socket.off('goal', h);
      socket.off('matchUpdate', h);
    };
  }, [socket, fetchData]);

  useEffect(() => {
    if (!isMR) return;

    const safePos =
      !playerPosition || isNaN(playerPosition) ? 1 : playerPosition;

    const LINE_WIDTH = SW - 160;
    const STEP = LINE_WIDTH / 7;
    const toVal = (safePos - 1) * STEP;

    if (!isFinite(toVal)) return;

    Animated.timing(translateX, {
      toValue: toVal,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const frames = Assets.PlayerPosition[safePos];
    if (!Array.isArray(frames) || frames.length === 0) return;

    let frameTimer: any;
    let pauseTimer: any;

    const startAnimation = () => {
      frameTimer = setInterval(() => {
        setFrameIndex(prev => (prev + 1) % frames.length);
      }, 600);

      // run animation for 6 seconds
      pauseTimer = setTimeout(() => {
        clearInterval(frameTimer);

        // pause for 1 minute
        setTimeout(startAnimation, 60000);
      }, 6000);
    };

    startAnimation();
    return () => {
      clearInterval(frameTimer);
      clearTimeout(pauseTimer);
    };
  }, [playerPosition, isMR]);

  useEffect(() => {
    if (isMR) return;
    const safePos = !clampedAvg || isNaN(clampedAvg) ? 1 : clampedAvg;
    const toVal = safePos * 20;
    if (!isFinite(toVal)) return;
    Animated.timing(avgTranslateX, {
      toValue: toVal,
      duration: 500,
      useNativeDriver: true,
    }).start();
    const frames = Assets.PlayerPosition[safePos];
    if (!Array.isArray(frames) || !frames.length) return;
    const iv = setInterval(
      () => setAvgFrameIndex(p => (p + 1) % frames.length),
      600,
    );
    return () => clearInterval(iv);
  }, [clampedAvg, isMR]);

  useEffect(() => {
    if (!isMR || !stats) return;
    if (stats.isGoal && !goalHandledRef.current) {
      goalHandledRef.current = true;
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.35,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.88,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
    if (!stats.isGoal) goalHandledRef.current = false;
  }, [stats?.isGoal, stats?.currentCounter, isMR]);

  const displayPosition = rawCounter === 0 ? 1 : playerPosition;
  const mrFrames = Assets.PlayerPosition[displayPosition];
  const positionSrc =
    Array.isArray(mrFrames) && mrFrames.length > 0
      ? mrFrames[frameIndex % mrFrames.length]
      : null;
  const lastMatches = ['2', '0', '0', '1', '2'];

  return (
    <Box paddingHorizontal="m" style={{marginTop: '1%'}}>
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        right={10}>
        <Text
          variant="header"
          fontSize={18}
          fontFamily={'Airstrike Bold'}
          color="white">
          LAST 5 MATCHES
        </Text>
        <Box flexDirection="row" alignItems="center">
          {(() => {
            const goals = isMR ? stats?.last5MatchGoals : flmLast5;
            const totalMatches = isMR
              ? stats?.totalMatches ?? 0
              : flmLast5.filter((g: any) => g !== null).length;
            const playedCount = Math.min(totalMatches, 5);

            // NO reverse — index 0 is already newest from API
            const displayGoals: (number | null)[] = Array(5)
              .fill(null)
              .map((_, i) => {
                if (!goals || i >= playedCount) return null; // unplayed = black circle
                return goals[i] ?? null;
              });
            return displayGoals.map((score, index) => {
              const isEmpty = score === null;
              const numScore = Number(score);
              const isWin = !isEmpty && numScore >= 2;
              const isLoss = !isEmpty && numScore === 0;
              const isDraw = !isEmpty && !isWin && !isLoss;
              const outcomeImg = isWin
                ? Assets.Home.win
                : isLoss
                ? Assets.Home.loss
                : Assets.Home.Draw;

              return (
                <Box key={index} flexDirection="row" alignItems="center">
                  <Box
                    width={38}
                    height={38}
                    borderRadius={19}
                    justifyContent="center"
                    alignItems="center"
                    style={[
                      styles.circleBorder,
                      isEmpty && {
                        backgroundColor: '#000',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.2)',
                        width: 30,
                        height: 30,
                        borderRadius: 19,
                      },
                    ]}>
                    {!isEmpty && (
                      <Image
                        source={outcomeImg}
                        style={{
                          width: 28,
                          height: 30,
                          position: 'absolute',
                        }}
                        resizeMode="contain"
                      />
                    )}
                    {!isEmpty && (
                      <Text color="white" fontWeight="bold" fontSize={13}>
                        {score}
                      </Text>
                    )}
                  </Box>

                  {index < displayGoals.length - 1 && (
                    <Box
                      width={14}
                      height={2}
                      style={{
                        marginHorizontal: -5,
                        borderWidth: 1,
                        backgroundColor: 'rgba(7, 7, 7, 0.4)',
                      }}
                    />
                  )}
                </Box>
              );
            });
          })()}
        </Box>
      </Box>
      <TouchableOpacity
        activeOpacity={isMatchActive ? 0.85 : 1}
        disabled={!isMatchActive}
        onPress={async () => {
          if (!isMatchActive) return;
          const now = Date.now();

          if (now - lastTapRef.current < 300) {
            await fetchData();
            setShowGround(true);
          }

          lastTapRef.current = now;
        }}>
        <Box
          style={styles.bannerBackground}
          borderRadius={15}
          flexDirection="row"
          paddingHorizontal="m"
          alignItems="center"
          justifyContent="space-between"
          height={90}
          overflow="hidden">
          {/* Player Position label top-left */}
          <Box position="absolute" top={6} left={11} zIndex={1}>
            <Text color="white" fontSize={8} letterSpacing={1}>
              Player Position
            </Text>
          </Box>

          {/* Bottom line */}
          <View
            style={{
              position: 'absolute',
              bottom: 2,
              left: 30,
              right: 50,
              height: 2,
              backgroundColor: 'rgba(255,255,255,0.7)',
              borderRadius: 2,
            }}
          />

          <Box flex={1} justifyContent="flex-end" alignItems="flex-start">
            {isMR && positionSrc != null && (
              <Animated.View
                style={{
                  transform: [{translateX}],
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                }}>
                {/* ATTACK: text renders BEFORE player (behind) */}
                {playerPositionText === 'Attack' && rawCounter > 0 && (
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 16,
                      fontFamily: 'Airstrike Bold',
                      letterSpacing: 1,
                      marginBottom: 10,
                      marginRight: 2,
                      textShadowColor: 'rgba(0,0,0,0.9)',
                      textShadowOffset: {width: 1, height: 1},
                      textShadowRadius: 4,
                    }}>
                    {playerPositionText.toUpperCase()}
                  </Text>
                )}

                {/* Player image always in middle */}
                <Image
                  key={frameIndex}
                  source={positionSrc}
                  style={{width: 44, height: 55, top: 20, right: 10}}
                />

                {/* DEFENSE / MIDFIELD: text renders AFTER player (in front) */}
                {playerPositionText !== 'Attack' && rawCounter > 0 && (
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 15,
                      fontFamily: 'Airstrike Bold',
                      letterSpacing: 1,
                      marginBottom: 10,
                      marginLeft: 4,
                      textShadowColor: 'rgba(0,0,0,0.9)',
                      textShadowOffset: {width: 1, height: 1},
                      textShadowRadius: 4,
                    }}>
                    {playerPositionText.toUpperCase()}
                  </Text>
                )}
              </Animated.View>
            )}
            {!isMR && bannerSrc != null && (
              <Animated.View
                style={{
                  transform: [{translateX: avgTranslateX}],
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                }}>
                {getPlayerPositionText(clampedAvg) === 'Attack' && (
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 15,
                      fontFamily: 'Airstrike Bold',
                      letterSpacing: 1,
                      marginBottom: 10,
                      marginRight: 18,
                    }}>
                    {getPlayerPositionText(clampedAvg).toUpperCase()}
                  </Text>
                )}

                <Image
                  key={avgFrameIndex}
                  source={bannerSrc}
                  style={{width: 44, height: 55, top: 15, right: 10}}
                />

                {getPlayerPositionText(clampedAvg) !== 'Attack' && (
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 15,
                      fontFamily: 'Airstrike Bold',
                      letterSpacing: 1,
                      marginBottom: 10,
                      marginRight: 18,
                      marginLeft: 4,
                    }}>
                    {getPlayerPositionText(clampedAvg).toUpperCase()}
                  </Text>
                )}
              </Animated.View>
            )}
          </Box>
          <Image
            source={Assets.Home.icons10}
            style={{width: 60, height: 60, marginBottom: -30, left: 40}}
            resizeMode="contain"
          />
          <Box alignItems="flex-end" bottom={30} left={20}>
            <Text
              color="white"
              fontSize={10}
              fontStyle={'italic'}
              letterSpacing={0.4}>
              Goals
            </Text>
            {/* <Text color="white" fontSize={18}>
              {isMR ? stats?.totalGoals || 0 : totalGoals}
            </Text> */}
          </Box>
          <Text color="white" fontSize={18}>
            {isMR ? stats?.totalGoals || 0 : totalGoals}
          </Text>
        </Box>
      </TouchableOpacity>
      <GroundModal
        key={allMrs.length + '-' + allOppMrs.length}
        visible={showGround}
        onClose={() => setShowGround(false)}
        mrs={allMrs}
        oppMrs={allOppMrs}
        userId={userId}
        bannerCounter={rawCounter}
      />
    </Box>
  );
};

const styles = StyleSheet.create({
  bannerBackground: {backgroundColor: 'rgba(0,0,0,0.5)', marginTop: '2%'},
});

const gm = StyleSheet.create({
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 10,
    zIndex: 99,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeTxt: {color: '#fff', fontSize: 12, fontWeight: 'bold'},

  bannerBackground: {backgroundColor: 'rgba(0,0,0,0.5)', marginTop: '2%'},
  circleBorder: {
    borderColor: 'rgba(255,255,255,0.3)', // default, overridden inline
  },

  badge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
    marginLeft: 100,
  },
  badgeTxt: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontStyle: 'italic',
  },
  chev: {color: '#7b0040', fontSize: 15, fontWeight: '900', lineHeight: 17},

  sliderTrack: {
    width: 3,
    backgroundColor: '#7b0040',
    borderRadius: 2,
    marginHorizontal: 60,
  },
  sliderThumb: {
    position: 'absolute',
    left: -7,
    width: 17,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#c2185b',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#ff00cc',
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 6,
  },

  hdrTxt: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  labelTxt: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontStyle: 'italic',
  },
});

export default MatchSummary;
