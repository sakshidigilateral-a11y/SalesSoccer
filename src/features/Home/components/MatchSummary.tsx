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
import LinearGradient from 'react-native-linear-gradient';
import {PanResponder} from 'react-native';

const {width: SW, height: SH} = Dimensions.get('window');
const BASE_URL = 'http://192.168.1.7:5450/api/user';

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

// Returns a stable random frame from the zone's full image array
const getPlayerAnimationByCounter = (
  counter: number,
  frameSeed: number,
  isOpponent: boolean,
) => {
  const zone = counter <= 2 ? 'DEFENSE' : counter <= 4 ? 'MIDFIELD' : 'ATTACK';

  const frames = isOpponent
    ? Assets.PlayerMoves.OppTeam[zone]
    : Assets.PlayerMoves.MyTeam[zone];

  if (!frames || frames.length === 0) return null;

  return frames[frameSeed % frames.length];
};

// Per-counter unique field position anchors (x=0 left/defense, x=1 right/attack)
const COUNTER_ANCHORS = {
  1: {x: 0.12, y: 0.35},
  2: {x: 0.22, y: 0.65},

  3: {x: 0.4, y: 0.3},
  4: {x: 0.5, y: 0.5},

  5: {x: 0.65, y: 0.7},
  6: {x: 0.78, y: 0.4},

  7: {x: 0.88, y: 0.55},
};

const ZONE_X = {
  DEFENSE: 0.15,
  MIDFIELD: 0.45,
  ATTACK: 0.8,
};

const ZONE_Y_SLOTS = [0.25, 0.5, 0.7, 0.85];

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
  const [showOpp, setShowOpp] = useState(false);
  const zoomRef = useRef<any>(null);
  const tableScrollRef = useRef<ScrollView>(null);
  const scale = useRef(new Animated.Value(1)).current;
  const {width: screenW, height: screenH} = useWindowDimensions();

  // Frame seed ref — stable random frame per player, assigned once
  const mrFrameSeedRef = useRef<Record<string, number>>({});
  const getFrameSeedForMr = (mrId: string): number => {
    if (mrFrameSeedRef.current[mrId] === undefined) {
      mrFrameSeedRef.current[mrId] = Math.floor(Math.random() * 10);
    }
    return mrFrameSeedRef.current[mrId];
  };

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

  const TABLE_W = LS_W * 0.5;
  const COL_NAME = TABLE_W * 0.32;
  const COL_BP = TABLE_W * 0.26;
  const COL_G = TABLE_W * 0.16;
  const COL_POS = TABLE_W * 0.26;
  const HDR_H = 26;
  const ROW_H = 30;
  const TABLE_AREA_H = STATS_H - HDR_H - 10;
  const TRACK_H = TABLE_AREA_H;
  const THUMB_H = 18;

  const activeMrs = showOpp ? oppMrs : mrs;

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

  // ── Positions: each counter maps to its own unique anchor ──
  const myTeamPositions = useMemo(() => {
    const zoneGroups: Record<string, MRStat[]> = {
      DEFENSE: [],
      MIDFIELD: [],
      ATTACK: [],
    };

    mrs.forEach(mr => {
      const counter = Math.min(Math.max(mr.currentCounter || 1, 1), 6);
      const zone =
        counter <= 2 ? 'DEFENSE' : counter <= 4 ? 'MIDFIELD' : 'ATTACK';
      zoneGroups[zone].push(mr);
    });

    return mrs.map(mr => {
      const counter = Math.min(Math.max(mr.currentCounter || 1, 1), 6);
      const zone =
        counter <= 2 ? 'DEFENSE' : counter <= 4 ? 'MIDFIELD' : 'ATTACK';
      const seed = getFrameSeedForMr(mr.mrId);
      const playersInZone = zoneGroups[zone];
      const idx = playersInZone.findIndex(p => p.mrId === mr.mrId);
      const total = playersInZone.length;
      const y = total === 1 ? 0.5 : ZONE_Y_SLOTS[idx % ZONE_Y_SLOTS.length];

      return {
        mr,
        x: ZONE_X[zone], // MY team: Defense=left, Attack=right
        y,
        isOpp: false,
        seed,
      };
    });
  }, [mrs]);

  const oppTeamPositions = useMemo(() => {
    const zoneGroups: Record<string, MRStat[]> = {
      DEFENSE: [],
      MIDFIELD: [],
      ATTACK: [],
    };

    oppMrs.forEach(mr => {
      const counter = Math.min(Math.max(mr.currentCounter || 1, 1), 6);
      const zone =
        counter <= 2 ? 'DEFENSE' : counter <= 4 ? 'MIDFIELD' : 'ATTACK';
      zoneGroups[zone].push(mr);
    });

    return oppMrs.map(mr => {
      const counter = Math.min(Math.max(mr.currentCounter || 1, 1), 6);
      const zone =
        counter <= 2 ? 'DEFENSE' : counter <= 4 ? 'MIDFIELD' : 'ATTACK';
      const seed = getFrameSeedForMr(mr.mrId);
      const playersInZone = zoneGroups[zone];
      const idx = playersInZone.findIndex(p => p.mrId === mr.mrId);
      const total = playersInZone.length;
      const y = total === 1 ? 0.5 : ZONE_Y_SLOTS[idx % ZONE_Y_SLOTS.length];

      return {
        mr,
        x: 1 - ZONE_X[zone], // OPP team: mirrored — their Defense=right, Attack=left
        y,
        isOpp: true,
        seed,
      };
    });
  }, [oppMrs]);

  const allFieldPositions = useMemo(() => {
    return showOpp ? oppTeamPositions : myTeamPositions;
  }, [showOpp, myTeamPositions, oppTeamPositions]);

  const horizontalLock = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > Math.abs(gesture.dy),
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
    const xFlipped = 1 - xFrac; // ADD THIS LINE
    const leftEdge = BL + (TL - BL) * (1 - yFrac);
    const rightEdge = BR + (TR - BR) * (1 - yFrac);
    return {
      px: leftEdge + (rightEdge - leftEdge) * xFlipped, // use xFlipped
      py: G_TOP + grassH * yFrac,
    };
  };

  const selectMr = (mr: MRStat) => {
    setSelectedMr(prev => (prev?.mrId === mr.mrId ? null : mr));
    const idx = sorted.findIndex(m => m.mrId === mr.mrId);
    if (idx >= 0)
      tableScrollRef.current?.scrollTo({y: idx * ROW_H, animated: true});
  };

  // ── detailImg: uses getPlayerAnimationByCounter (not old getPlayerAnimation) ──
  const detailImg = useMemo(() => {
    if (!selectedMr) return null;
    const counter = Math.min(Math.max(selectedMr.currentCounter || 1, 1), 7);
    const seed = getFrameSeedForMr(selectedMr.mrId);
    return getPlayerAnimationByCounter(counter, seed, showOpp);
  }, [selectedMr, showOpp]);

  const gkL = toPixel(0.88, 0.51);
  const gkR = toPixel(0.0, 0.57);
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
    Animated.spring(scale, {toValue: 1.5, useNativeDriver: true}).start();
  };

  const zoomOut = () => {
    Animated.spring(scale, {toValue: 1, useNativeDriver: true}).start();
  };

  const zoomToPoint = (x: number, y: number) => {
    if (!zoomRef.current) return;
    zoomRef.current.zoomToLocation({
      x: x / LS_W,
      y: y / FIELD_H,
      scale: 2.2,
      animated: true,
    });
  };

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
              paddingTop: 6,
              paddingLeft: 2,
            }}>
            <View style={{flex: 1, paddingLeft: 2}}>
              {/* Badge row */}
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
                    {height: HDR_H + TRACK_H, backgroundColor: '#7b0040'},
                  ]}>
                  <View
                    style={[
                      gm.sliderThumb,
                      {top: HDR_H + sliderTop, backgroundColor: '#c2185b'},
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
                          style={{
                            color: 'rgba(255,255,255,0.3)',
                            fontSize: 9,
                          }}>
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

            {/* Team toggle + zoom controls */}
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
                style={{
                  marginLeft: 6,
                  alignItems: 'center',
                  marginBottom: 40,
                }}>
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
                        left: showOpp ? 36 : 2,
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

            {/* Player detail sprite */}
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

          {/* ══ SECTION 2: FIELD ══ */}
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

              {/* ── Players on field ── */}
              {allFieldPositions.map(({mr, x, y, isOpp, seed}, i) => {
                const counter = Math.min(
                  Math.max(mr.currentCounter || 1, 1),
                  7,
                );
                const frame = getPlayerAnimationByCounter(counter, seed, isOpp);
                if (!frame) return null;

                const {px, py} = toPixel(x, y);
                const sel = selectedMr?.mrId === mr.mrId;

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
                    <Image
                      source={frame}
                      style={{width: IMG_SIZE, height: IMG_SIZE}}
                      resizeMode="contain"
                    />
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 8,
                        fontWeight: 'bold',
                        position: 'absolute',
                        top: -BADGE_SIZE * 0.6,
                      }}>
                      {String(mr.totalGoals)}
                    </Text>
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
              style={{
                width: LBL_W,
                height: LBL_H,
                marginBottom: '4%',
                left: 20,
              }}
              resizeMode="contain"
            />
            <Image
              source={
                showOpp ? Assets.Home.AttackLabel : Assets.Home.DefenceLabel
              }
              style={{
                width: LBL_W,
                height: LBL_H,
                marginBottom: '4%',
                left: 30,
              }}
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

  const myApiCounter = allMrs.find(m => m.mrId === userId)?.currentCounter;
  const rawCounter =
    myApiCounter !== undefined ? myApiCounter : stats?.currentCounter ?? 0;
  const playerPosition = rawCounter;
  const playerPositionText = getPlayerPositionText(playerPosition);

  const [avgFrameIndex, setAvgFrameIndex] = useState(0);
  const avgTranslateX = useRef(new Animated.Value(0)).current;
  const safeAvg = Number(avgPosition) || 1;
  const clampedAvg = Math.min(Math.max(safeAvg, 1), 7);

  const avgFrames =
    Assets.PlayerPosition[clampedAvg] || Assets.PlayerPosition[1];
  const bannerCounter = Math.max(1, rawCounter || 1);
  const bannerFrames =
    Assets.PlayerPosition[bannerCounter] || Assets.PlayerPosition[1];
  const bannerSrc =
    Array.isArray(bannerFrames) && bannerFrames.length > 0
      ? bannerFrames[avgFrameIndex % bannerFrames.length]
      : bannerFrames;

  const fetchData = useCallback(async () => {
    if (!userId) return;
    const userRole = (role ?? '').toLowerCase();

    try {
      if (userRole === 'mr') {
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

        setAllMrs(mrJson.data.myTeamMrs || []);
        setAllOppMrs(mrJson.data.opponentMrs || []);
        return;
      }

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

        const userInMyTeam = myTeamData.some(
          (mr: MRStat) => mr.flmId === userId,
        );
        const userInOppTeam = opponentTeamData.some(
          (mr: MRStat) => mr.flmId === userId,
        );

        let actualMyTeam = myTeamData;
        let actualOppTeam = opponentTeamData;

        if (userInOppTeam && !userInMyTeam) {
          actualMyTeam = opponentTeamData;
          actualOppTeam = myTeamData;
        }

        actualMyTeam.forEach((mr: MRStat) => myTeamMap.set(mr.mrId, mr));
        actualOppTeam.forEach((mr: MRStat) => oppTeamMap.set(mr.mrId, mr));
      }

      setAllMrs(Array.from(myTeamMap.values()));
      setAllOppMrs(Array.from(oppTeamMap.values()));
    } catch (err) {
      console.log('Fetch Error:', err);
    }
  }, [userId, role, isMR]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => setTimeout(() => fetchData(), 600);
    socket.on('goalUpdate', refresh);
    socket.on('possessionUpdate', refresh);
    socket.on('matchStatsUpdate', refresh);
    socket.on('playerStatsUpdate', refresh);
    socket.on('uploadStatusChanged', refresh);
    socket.on('matchCompleted', refresh);
    return () => {
      socket.off('goalUpdate', refresh);
      socket.off('possessionUpdate', refresh);
      socket.off('matchStatsUpdate', refresh);
      socket.off('playerStatsUpdate', refresh);
      socket.off('uploadStatusChanged', refresh);
      socket.off('matchCompleted', refresh);
    };
  }, [socket, fetchData]);

  useEffect(() => {
    if (!userId) return;
    fetchData();
  }, [userId, role]);

  useEffect(() => {
    if (showGround) fetchData();
  }, [showGround]);

  useEffect(() => {
    if (!isMR) return;
    const safePos = Math.min(Math.max(rawCounter, 1), 7);
    const LINE_WIDTH = SW - 160;
    const STEP = LINE_WIDTH / 7;
    const toVal = (safePos - 1) * STEP;
    translateX.setValue(toVal);
    Animated.timing(translateX, {
      toValue: toVal,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [rawCounter, isMR]);

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
            const displayGoals: (number | null)[] = Array(5)
              .fill(null)
              .map((_, i) => {
                if (!goals || i >= playedCount) return null;
                return goals[i] ?? null;
              });
            return displayGoals.map((score, index) => {
              const isEmpty = score === null;
              const numScore = Number(score);
              const isWin = !isEmpty && numScore >= 2;
              const isLoss = !isEmpty && numScore === 0;
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
                        style={{width: 28, height: 30, position: 'absolute'}}
                        resizeMode="contain"
                      />
                    )}
                    {!isEmpty && (
                      <Text color="white" fontWeight="bold" fontSize={13}>
                        {String(score)}
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
          <Box position="absolute" top={6} left={11} zIndex={1}>
            <Text color="white" fontSize={8} letterSpacing={1}>
              Player Position
            </Text>
          </Box>

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
                {rawCounter > 0 && playerPositionText === 'Attack' && (
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
                <Image
                  key={frameIndex}
                  source={positionSrc}
                  style={{width: 44, height: 55, top: 20, right: 10}}
                />
                {rawCounter > 0 && playerPositionText !== 'Attack' && (
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
          </Box>
          <Text color="white" fontSize={18}>
            {isMR ? String(stats?.totalGoals || 0) : String(totalGoals)}
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
  circleBorder: {
    borderColor: 'rgba(255,255,255,0.3)',
  },
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
  circleBorder: {borderColor: 'rgba(255,255,255,0.3)'},
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
