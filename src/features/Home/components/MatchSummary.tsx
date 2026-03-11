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
  if (counter <= 2) return 'ATTACK';
  if (counter <= 5) return 'MIDFIELD';
  return 'DEFENSE';
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

const getPlayerPositionText = (counter: number) => {
  if (counter <= 2) return 'Attack';
  if (counter <= 5) return 'Midfield';
  return 'Defense';
};

const getPositionLabel = (counter: number): string => {
  switch (getZone(counter)) {
    case 'DEFENSE':
      return 'Defense';
    case 'MIDFIELD':
      return 'Midfield';
    case 'ATTACK':
      return 'Attack';
    default:
      return 'Midfield';
  }
};

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

const getPlayerAnimation = (
  counter: number,
  index: number,
  isOpponent: boolean,
) => {
  const zone = getZone(counter);

  const frames = isOpponent
    ? Assets.PlayerMoves.OppTeam[zone]
    : Assets.PlayerMoves.MyTeam[zone];

  if (!frames || frames.length === 0) return null;

  return frames[index % frames.length];
};

const GroundModal = ({
  visible,
  onClose,
  mrs,
  oppMrs,
}: {
  visible: boolean;
  onClose: () => void;
  mrs: MRStat[]; // my team
  oppMrs: MRStat[]; // opponent team
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

  // Perspective trapezoid
  const G_TOP = FIELD_H * 0.4;
  const G_BOT = FIELD_H * 0.85;
  const grassH = G_BOT - G_TOP;
  const TL = LS_W * 0.28;
  const TR = LS_W * 0.6;
  const BL = LS_W * 0.0;
  const BR = LS_W * 1.0;

  const IMG_SIZE = 40;
  const BADGE_SIZE = 13;
  const GK_SIZE = 28;

  // Table
  const TABLE_W = LS_W * 0.42;
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

  const sorted = useMemo(
    () =>
      [...activeMrs].sort(
        (a, b) => b.totalGoals - a.totalGoals || b.totalPoints - a.totalPoints,
      ),
    [activeMrs],
  );

  // const zoneGroups = useMemo(() => {
  //   const g: Record<string, MRStat[]> = {DEFENSE: [], MIDFIELD: [], ATTACK: []};
  //   sorted.forEach(mr => g[getZone(mr.currentCounter || 4)].push(mr));
  //   return g;
  // }, [sorted]);

  // const playerPositions = useMemo(() => {
  //   const pos: {mr: MRStat; x: number; y: number}[] = [];
  //   (['ATTACK', 'MIDFIELD', 'DEFENSE'] as const).forEach(zone => {
  //     const grp = zoneGroups[zone];
  //     grp.forEach((mr, i) =>
  //       pos.push({
  //         mr,
  //         x: getXFrac(mr.currentCounter || 4, i, grp.length),
  //         y: getYFrac(i, grp.length),
  //       }),
  //     );
  //   });
  //   return pos;
  // }, [zoneGroups]);
  const ZONE_ANCHORS = {
    ATTACK: [
      {x: 0.18, y: 0.5},
      {x: 0.22, y: 0.56},
      {x: 0.26, y: 0.62},
      {x: 0.3, y: 0.68},
      {x: 0.24, y: 0.74},
      {x: 0.28, y: 0.8},
    ],

    MIDFIELD: [
      {x: 0.44, y: 0.5},
      {x: 0.48, y: 0.56},
      {x: 0.52, y: 0.62},
      {x: 0.56, y: 0.68},
      {x: 0.5, y: 0.74},
      {x: 0.54, y: 0.8},
    ],

    DEFENSE: [
      {x: 0.7, y: 0.5},
      {x: 0.74, y: 0.56},
      {x: 0.78, y: 0.62},
      {x: 0.82, y: 0.68},
      {x: 0.76, y: 0.74},
      {x: 0.8, y: 0.8},
    ],
  };

  const POSITION_ANCHORS = {
    1: {x: 0.18, y: 0.35},
    2: {x: 0.24, y: 0.55},

    3: {x: 0.44, y: 0.3},
    4: {x: 0.5, y: 0.5},
    5: {x: 0.56, y: 0.7},

    6: {x: 0.78, y: 0.4},
    7: {x: 0.84, y: 0.65},
  };

  const getStripIndex = (counter: number) => {
    if (counter <= 6) return counter - 1;
    if (counter <= 12) return counter - 7;
    return counter - 13;
  };

  const playerPositions = useMemo(() => {
    const zoneGroups: Record<'ATTACK' | 'MIDFIELD' | 'DEFENSE', MRStat[]> = {
      ATTACK: [],
      MIDFIELD: [],
      DEFENSE: [],
    };

    sorted.forEach(mr => {
      const zone = getZone(mr.currentCounter || 4);
      zoneGroups[zone].push(mr);
    });

    const pos: {mr: MRStat; x: number; y: number}[] = [];

    (['ATTACK', 'MIDFIELD', 'DEFENSE'] as const).forEach(zone => {
      const players = zoneGroups[zone];
      const anchors = ZONE_ANCHORS[zone];
      //  const playerPositionText = getPlayerPositionText(playerPosition);
      players.forEach((mr, i) => {
        const anchor = anchors[i % anchors.length];

        const offsetX = ((i % 3) - 1) * 0.02;
        const offsetY = (Math.floor(i / 3) - 1) * 0.02;

        pos.push({
          mr,
          x: anchor.x + offsetX,
          y: anchor.y + offsetY,
        });
      });
    });

    return pos;
  }, [sorted]);

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
    const leftEdge = TL + (BL - TL) * yFrac;
    const rightEdge = TR + (BR - TR) * yFrac;

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
    ? getPlayerAnimation(selectedMr.currentCounter, 0, showOpp)
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
    {label: 'BALL\nPOSSESSION', w: COL_BP},
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
  const activeHdr: [string, string] = showOpp
    ? oppColor
    : ['#c2185b', '#7b0040'];

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
              alignItems: 'flex-start',
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
                      backgroundColor: showOpp ? '#6b0000' : '#7b0040',
                    },
                  ]}>
                  <View
                    style={[
                      gm.sliderThumb,
                      {
                        top: HDR_H + sliderTop,
                        backgroundColor: showOpp ? '#cc2222' : '#c2185b',
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
                    {sorted.length === 0 ? (
                      <View
                        style={{
                          height: ROW_H * 2,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                        <Text
                          style={{color: 'rgba(255,255,255,0.3)', fontSize: 9}}>
                          No data
                        </Text>
                      </View>
                    ) : (
                      sorted.map(mr => {
                        const sel = selectedMr?.mrId === mr.mrId;
                        const vals = [
                          mr.mrName,
                          String(mr.totalPoints),
                          String(mr.totalGoals),
                          getPositionLabel(mr.currentCounter),
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
                                backgroundColor: sel
                                  ? showOpp
                                    ? '#7a1010'
                                    : '#5535a0'
                                  : '#2e1060',
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
                                        ? 'rgb(239, 107, 202)'
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
                marginRight: '25%',
                paddingTop: 60,
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
              {playerPositions.map(({mr, x, y}, i) => {
                const sel = selectedMr?.mrId === mr.mrId;
                const frame = getPlayerAnimation(
                  mr.currentCounter || 4,
                  i,
                  showOpp,
                );
                if (!frame) return null;
                const {px, py} = toPixel(x, y);
                const zone = getZone(mr.currentCounter || 4);
                const zc = showOpp
                  ? '#fff'
                  : zone === 'ATTACK'
                  ? '#fff'
                  : zone === 'MIDFIELD'
                  ? '#fff'
                  : '#fff';

                return (
                  <Pressable
                    key={mr.mrId}
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
              source={Assets.Home.AttackLabel}
              style={{width: LBL_W, height: LBL_H, marginBottom: '4%'}}
              resizeMode="contain"
            />
            <Image
              source={Assets.Home.MidfieldLabel}
              style={{width: LBL_W, height: LBL_H, marginBottom: '4%'}}
              resizeMode="contain"
            />
            <Image
              source={Assets.Home.DefenceLabel}
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
  console.log('PLAYER STATS:', stats);
  const isMatchActive = isMR ? stats?.isMatchOn === 1 : true;

  const [totalGoals, setTotalGoals] = useState(0);
  const [allMrs, setAllMrs] = useState<MRStat[]>([]);
  const [allOppMrs, setAllOppMrs] = useState<MRStat[]>([]);
  const [avgPosition, setAvgPosition] = useState(1);
  const [showGround, setShowGround] = useState(false);

  const [frameIndex, setFrameIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const goalHandledRef = useRef(false);
  const rawCounter = Number(stats?.currentCounter ?? 1);
  const playerPosition = Math.min(Math.max(rawCounter, 1), 7);
  const playerPositionText = getPlayerPositionText(playerPosition);

  const [avgFrameIndex, setAvgFrameIndex] = useState(0);
  const avgTranslateX = useRef(new Animated.Value(0)).current;
  const clampedAvg = Math.min(
    Math.max(isNaN(avgPosition) || !avgPosition ? 1 : avgPosition, 1),
    7,
  );

  const avgFrames = Assets.PlayerPosition[clampedAvg];
  const avgPositionSrc =
    Array.isArray(avgFrames) && avgFrames.length > 0
      ? avgFrames[avgFrameIndex % avgFrames.length]
      : null;

  console.log('roleeeses', role);
  console.log('roleeeses', userId);
  console.log('roleeeses', isMR);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    console.log('call ho raha hai');

    const userRole = (role ?? '').toLowerCase();
    const apiRole = userRole === 'mr' ? 'flm' : userRole;

    try {
      if (userRole === 'mr') {
        const matchId = stats?.fastestGoalMatchId;

        if (!matchId) {
          console.log('No matchId for MR');
          return;
        }
        //console.log("MR MATCH ID:", stats?.matchId);
        const mrRes = await fetch(
          `${BASE_URL}/matches/${stats?.fastestGoalMatchId}/mr-stats?userId=${userId}&userRole=mr`,
        );

        const mrJson = await mrRes.json();

        console.log('MR STATS RESPONSE:', mrJson);

        if (!mrJson.success || !mrJson.data) return;

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

        setAllMrs(myTeamData);
        setAllOppMrs(opponentTeamData);

        return;
      }
      console.log('yaha tak aaya');
      const matchRes = await fetch(
        `${BASE_URL}/active-matches-stats?userId=${userId}&userRole=${userRole}`,
      );

      console.log('matchRessss', matchRes);
      const matchJson = await matchRes.json();

      // if (!matchJson.success || !Array.isArray(matchJson.data?.matches)) return;

      const matches: MatchStat[] = matchJson.data.matches;

      // total goals
      setTotalGoals(
        matches.reduce((sum, m) => sum + (Number(m.totalGoalsByMyMRs) || 0), 0),
      );

      // average position
      const medianSum = matches.reduce(
        (sum, m) => sum + (Number(m.medianCounter) || 1),
        0,
      );

      const avg =
        matches.length > 0 ? Math.round(medianSum / matches.length) : 1;

      setAvgPosition(isNaN(avg) || avg < 1 ? 1 : Math.min(avg, 7));

      // arrays to collect data
      const myTeam: MRStat[] = [];
      const opponentTeam: MRStat[] = [];
      console.log('gtrtrrrrrrrrrrrrrrrrrrr');
      for (const m of matches) {
        const mrRes = await fetch(
          `${BASE_URL}/matches/${m.matchId}/mr-stats?userId=${userId}&userRole=${userRole}`,
        );
        // console.log('ressssssssssssss:' matches,)
        const mrJson = await mrRes.json();
        console.log('MR API RESPONSE:', JSON.stringify(mrJson, null, 2));

        if (!mrJson.success || !mrJson.data) continue;
        console.log('MY TEAM RAW:', mrJson.data.myTeamMrs);
        console.log('OPP TEAM RAW:', mrJson.data.opponentMrs);
        const myTeamData = (mrJson.data.myTeamMrs || []).map((mr: MRStat) => ({
          ...mr,
          currentCounter: Math.max(1, Number(mr.currentCounter) || 1),
          totalGoals: Number(mr.totalGoals) || 0,
          totalPoints: Number(mr.totalPoints) || 0,
        }));
        console.log('MY TEAM AFTER MAP:', myTeamData);
        const opponentTeamData = (mrJson.data.opponentMrs || []).map(
          (mr: MRStat) => ({
            ...mr,
            currentCounter: Math.max(1, Number(mr.currentCounter) || 1),
            totalGoals: Number(mr.totalGoals) || 0,
            totalPoints: Number(mr.totalPoints) || 0,
          }),
        );

        myTeam.push(...myTeamData);
        opponentTeam.push(...opponentTeamData);
      }

      console.log('loggggggggggggggggggggggggs:');
      // update state once
      setAllMrs(myTeam);
      setAllOppMrs(opponentTeam);

      console.log('MY TEAM:', myTeam);
      console.log('OPP TEAM:', opponentTeam);
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
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!socket) return;

    const h = () => fetchData();

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

  const mrFrames = Assets.PlayerPosition[playerPosition];
  const positionSrc =
    Array.isArray(mrFrames) && mrFrames.length > 0
      ? mrFrames[frameIndex % mrFrames.length]
      : null;
  const lastMatches = ['2', '0', '0', '1', '2'];
  return (
    <Box paddingHorizontal="m" style={{marginTop: '1%'}}>
      <TouchableOpacity
        activeOpacity={isMatchActive ? 0.85 : 1}
        disabled={!isMatchActive}
        onPress={() => {
          if (isMatchActive) {
            setShowGround(true);
          }
        }}>
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between">
          <Text variant="header" fontSize={16} fontStyle="italic" color="white">
            LAST 5 MATCHES
          </Text>
          <Box flexDirection="row" alignItems="center">
            {stats?.last5MatchGoals?.map((score, index) => {
              const numScore = Number(score);

              // ── decide outcome ──
              // adjust this logic to match your actual data structure
              const isWin = numScore >= 2;
              const isLoss = numScore === 0;
              const isDraw = !isWin && !isLoss;

              // const borderColor = isWin ? '#00e676' : isLoss ? '#ff1744' : '#ffeb3b';
              const outcomeImg = isWin
                ? Assets.Home.win // 👈 replace with your actual asset key
                : isLoss
                ? Assets.Home.loss // 👈 replace with your actual asset key
                : Assets.Home.Draw; // 👈 replace with your actual asset key

              return (
                <Box key={index} flexDirection="row" alignItems="center">
                  <Box
                    width={38}
                    height={38}
                    borderRadius={19}
                    //  backgroundColor="transparentPurple"
                    justifyContent="center"
                    alignItems="center"
                    //  borderWidth={1.5}
                    style={[styles.circleBorder]}>
                    {/* ── outcome image ── */}
                    <Image
                      source={outcomeImg}
                      style={{
                        width: 30,
                        height: 30,
                        position: 'absolute',
                        //  opacity: 0.25,   // subtle background icon
                      }}
                      resizeMode="contain"
                    />

                    {/* ── score number on top ── */}
                    <Text color="white" fontWeight="bold" fontSize={13}>
                      {score}
                    </Text>
                  </Box>

                  {index < (stats?.last5MatchGoals?.length ?? 0) - 1 && (
                    <Box
                      width={14}
                      height={2}
                      style={{
                        marginHorizontal: -1,
                        borderWidth:1,
                        backgroundColor: 'rgba(7, 7, 7, 0.4)', // ← just add this line
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
        <Box
          style={styles.bannerBackground}
          borderRadius={15}
          flexDirection="row"
          paddingHorizontal="m"
          alignItems="center"
          justifyContent="space-between"
          height={90}
          overflow="hidden">
          <Box position="absolute" top={6} left={11} zIndex={1}>
            <Text color="white" fontSize={8} letterSpacing={1}>
              Player Position
            </Text>

            <Text
              color="white"
              fontSize={8}
              fontWeight="600"
              marginTop="xs"
              fontFamily={'Orbitron-Black'}>
              {playerPositionText}
            </Text>
          </Box>
          <View
            style={{
              position: 'absolute',
              bottom: 2,
              left: 40,
              right: 40,
              height: 2,
              backgroundColor: 'rgba(255,255,255,0.7)',
              borderRadius: 2,
            }}
          />
          <Box flex={1} justifyContent="center" alignItems="flex-start">
            {isMR
              ? positionSrc != null && (
                  <Animated.View style={{transform: [{translateX}]}}>
                    <Image
                      key={frameIndex}
                      source={positionSrc}
                      style={{width: 50, height: 60, marginTop: 30, right: 8}}
                    />
                  </Animated.View>
                )
              : avgPositionSrc != null && (
                  <Animated.View
                    style={{transform: [{translateX: avgTranslateX}]}}>
                    <Image
                      key={avgFrameIndex}
                      source={avgPositionSrc}
                      style={{width: 50, height: 60, marginTop: 30, right: 50}}
                    />
                  </Animated.View>
                )}
          </Box>
          <Image
            source={Assets.Home.icons10}
            style={{width: 60, height: 60, marginBottom: -4, left: 25}}
            resizeMode="contain"
          />
          <Box alignItems="flex-end" bottom={30} left={10}>
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
        visible={showGround}
        onClose={() => setShowGround(false)}
        mrs={allMrs}
        oppMrs={allOppMrs}
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
