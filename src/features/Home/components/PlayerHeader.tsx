import React, {useEffect, useState, useRef} from 'react';
import {
  Image,
  StyleSheet,
  ActivityIndicator,
  View,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNFS from 'react-native-fs';
import {Box, Text} from '../../../components/themes';
import {Assets} from '../../../assets/images';
import Svg, {Path, Text as SvgText, TextPath} from 'react-native-svg';
import axios from 'axios';
import io, {Socket} from 'socket.io-client';
import {useDispatch, useSelector} from 'react-redux';
import {
  setPlayerStats,
  setLoading as setLoadingAction,
  setError,
  updatePossessionCount,
  updateGoalCount,
} from '../../../redux/playerSlice';
import {AppDispatch, RootState} from '../../../redux/store';
import LinearGradient from 'react-native-linear-gradient';
import {setPlayerStatsFromAPI} from '../../../redux/playerSlice';
import {Animated, Easing} from 'react-native';

const API_URL = 'http://192.168.1.7:5450';
const {width: SW, height: SH} = Dimensions.get('window');

interface PlayerStats {
  mrName: string;
  flmName?: string;
  teamName: string;
  totalMatches: number;
  totalGoals: number;
  totalApprovedUploads: number;
  wins: number;
  losses: number;
  draws: number;
  fastestGoalTime: number | null;
  averageTimePerGoal: number | null;
  matchesWithHighestPrescriptions: number;
}

const MarqueeTeamName = ({text}: {text: string}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const flatText = text.replace(/\n/g, ' ');

  useEffect(() => {
    translateX.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(translateX, {
          toValue: -SW, // ✅ slide full screen width
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(300),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [text]);

  return (
    <View style={{overflow: 'hidden', flex: 1}}>
      <Animated.Text
        numberOfLines={1}
        style={{
          transform: [{translateX}],
          fontSize: 12,
          fontWeight: '900',
          fontStyle: 'italic',
          color: 'white',
          width: SW, // ✅ full screen width so text never wraps
        }}>
        {flatText}
      </Animated.Text>
    </View>
  );
};

const PlayerHeader = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {stats, loading} = useSelector((state: RootState) => state.player);
  const {mrId, role} = useSelector((state: RootState) => state.auth);
  console.log('ressssssssssss:', stats);
  const [teamLogoUri, setTeamLogoUri] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const TOP_Y = 70;
  const CURVE_HEIGHT = 30;
  const TOP_OFFSET = 10;
  const GAP = 40;

  useEffect(() => {
    fetchPlayerStats();
    initializeSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const initializeSocket = async () => {
    try {
      const userId = mrId;

      console.log('socket idddddddddddddddddd', userId);

      if (!userId) {
        console.error('No user ID found for socket connection');
        return;
      }

      socketRef.current = io(API_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected:', socketRef.current?.id);
        socketRef.current?.emit('joinMR', userId);
      });

      socketRef.current.on('uploadCreated', data => {
        console.log('Upload created received:', data);
        if (data.mrId !== userId) return;
        if (data.rxCount !== undefined) {
          console.log('Updating possession count to:', data.rxCount);
        }
      });

      socketRef.current.on('uploadStatusChanged', data => {
        console.log('Upload status changed:', data);
        if (data.mrId !== userId) return;

        // Refresh stats for BOTH approved and rejected
        if (data.status === 'approved' || data.status === 'rejected') {
          console.log('Upload status changed, refreshing stats...');
          fetchPlayerStats();
        }
      });

      socketRef.current.on('goalUpdate', data => {
        if (data.goalCount !== undefined) {
          dispatch(updateGoalCount(data.goalCount));
        }
      });

      socketRef.current.on('possessionUpdate', data => {
        if (data.possessionCount !== undefined) {
          dispatch(updatePossessionCount(data.possessionCount));
        }
      });

      socketRef.current.on('matchStatsUpdate', data => {
        console.log('Match stats update received:', data);
        if (data.playerStats) {
          dispatch(setPlayerStats(data.playerStats));
        }
      });

      socketRef.current.on('matchCompleted', data => {
        console.log('Match completed:', data);
        fetchPlayerStats();
      });

      // socketRef.current.on('playerStatsUpdate', data => {
      //   if (data.mrId !== userId) return;
      //   console.log('🔥 LIVE STATS UPDATE:', data.stats);
      //   dispatch(setPlayerStats(data.stats));
      // });

      socketRef.current.on('playerStatsUpdate', data => {
        console.log('🔥 LIVE STATS UPDATE:', data);

        if (data.stats) {
          dispatch(setPlayerStats(data.stats));
        }
      });

      socketRef.current.on('matchPlayersUpdate', () => {
        console.log('Players updated, refetch match data');
        // Call your fetchData() from MatchSummary here via event or redux flag
      });

      socketRef.current.on('matchCreated', () => {
        console.log('Match created → refresh player stats');
        fetchPlayerStats();
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      socketRef.current.on('error', error => {
        console.error('Socket error:', error);
      });
    } catch (error) {
      console.error('Error initializing socket:', error);
    }
  };

  const fetchPlayerStats = async () => {
    try {
      dispatch(setLoadingAction(true));

      if (!mrId || !role) {
        console.error('No user ID or role found in Redux');
        dispatch(setError('User not authenticated'));
        return;
      }

      console.log('Fetching stats for userId:', mrId, 'with role:', role);

      const response = await axios.get(
        `${API_URL}/api/user/stats?userId=${mrId}&userRole=${role}`,
      );

      if (response.data.success) {
        const playerData = response.data.data;
        dispatch(setPlayerStatsFromAPI(playerData));
        console.log(
          '=== API RESPONSE KEYS..................... ===',
          playerData,
        );
        console.log(
          '=== FULL API DATA ===',
          JSON.stringify(playerData, null, 2),
        );

        await loadTeamLogo(playerData.teamName);
      }
    } catch (error) {
      console.error('Error fetching player stats:', error);
      dispatch(setError(error?.message || 'Failed to fetch stats'));
    } finally {
      dispatch(setLoadingAction(false));
    }
  };

  const getDynamicFontSize = (text: string) => {
    const length = text.length;
    if (length <= 8) return 25;
    if (length <= 12) return 21;
    if (length <= 16) return 18;
    if (length <= 20) return 16;
    return 14;
  };

  const getDynamicLetterSpacing = (text: string) => {
    return text.length > 14 ? 0 : 1;
  };

  const loadTeamLogo = async (teamName: string) => {
    try {
      const logoPath = `${RNFS.DocumentDirectoryPath}/DIGI/200x200/${teamName}.png`;
      if (await RNFS.exists(logoPath)) {
        setTeamLogoUri(`file://${logoPath}`);
        console.log('✅ Team logo loaded:', teamName);
      } else {
        console.log('⚠️ Team logo not found:', logoPath);
      }
    } catch (error) {
      console.error('Error loading team logo:', error);
    }
  };

  const getNameParts = (fullName: string) => {
    console.log('Full Name:', fullName);
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) {
      return {firstName: parts[0], middleName: '', lastName: ''};
    }
    if (parts.length === 2) {
      return {firstName: parts[0], middleName: '', lastName: parts[1]};
    }
    return {
      firstName: parts[0],
      middleName: parts.slice(1, -1).join(' '),
      lastName: parts[parts.length - 1],
    };
  };

  const formatTeamName = (teamName?: string | null) => {
    if (!teamName) return '';
    return teamName.replace(/([a-z])([A-Z])/g, '$1\n$2').toUpperCase();
  };

  if (loading) {
    return (
      <Box
        padding="m"
        margin="m"
        justifyContent="center"
        alignItems="center"
        height={220}>
        <ActivityIndicator size="large" color="white" />
        <Text color="white" marginTop="m">
          Loading player stats...
        </Text>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box
        padding="m"
        margin="m"
        justifyContent="center"
        alignItems="center"
        height={220}>
        <Text color="white">Failed to load player stats</Text>
      </Box>
    );
  }

  const {firstName, middleName, lastName} = getNameParts(
    stats.mrName || stats.flmName || '',
  );
  const firstFontSize = getDynamicFontSize(firstName);
  const lastFontSize = getDynamicFontSize(lastName);
  const formattedTeamName = formatTeamName(stats.teamName);

  const svgFontTop =
    firstName.length > 12 ? 17 : firstName.length > 8 ? 21 : 26;
  const svgFontBottom =
    lastName.length > 12 ? 17 : lastName.length > 8 ? 21 : 26;

  return (
    <Box padding="xs" style={{marginTop: '-10%'}}>
      {/* Jersey and Team Info */}
      <Box flexDirection="row" alignItems="center">
        <Box
          width="110%"
          height={SH * 0.2}
          style={{marginLeft: -10}}
          overflow="hidden"
          justifyContent="flex-start">
          <Image
            source={Assets.Home.jersy2}
            style={styles.jerseyBase}
            resizeMode="contain"
          />

          {/* NAME ON JERSEY */}
          <View
            style={{
              position: 'absolute',
              top: SH * 0.055,
              left: '-10%',
              width: '76%',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {(() => {
              const fullName = (stats.mrName || stats.flmName || '')
                .toUpperCase()
                .trim();

              const splitNameIntoLines = (name: string, maxChars = 12) => {
                const words = name.split(' ');
                const lines: string[] = [];
                let currentLine = '';

                words.forEach(word => {
                  if ((currentLine + ' ' + word).trim().length > maxChars) {
                    lines.push(currentLine.trim());
                    currentLine = word;
                  } else {
                    currentLine += ' ' + word;
                  }
                });

                if (currentLine) lines.push(currentLine.trim());
                return lines.slice(0, 4);
              };

              const nameLines = splitNameIntoLines(fullName);
              const lineCount = nameLines.length;

              const jerseyFontSize =
                lineCount === 1
                  ? 22
                  : lineCount === 2
                  ? 21
                  : lineCount === 3
                  ? 20
                  : 19;

              // Compact spacing
              const topY = 65; // top limit of name area
              const bottomY = 115; // bottom limit of name area

              const availableHeight = bottomY - topY;
              const gap = lineCount > 1 ? availableHeight / (lineCount - 1) : 0;

              const startY = lineCount === 1 ? 90 : topY;

              const getCurvePaths = () => {
                const paths = [];

                const centerY = 105; // center of jersey text area
                const lineSpacing = 28; // space between lines (adjust this)
                const totalHeight = (lineCount - 1) * lineSpacing;
                const startY = centerY - totalHeight / 2;

                for (let i = 0; i < lineCount; i++) {
                  const y = startY + i * lineSpacing;

                  // Curved jersey arc
                  paths.push(`M 30,${y} Q 200,${y - 45} 370,${y}`);
                }

                return paths;
              };
              const curvePaths = getCurvePaths();

              return (
                <Svg viewBox="0 0 400 200" width="100%" height={120}>
                  {curvePaths.map((d, i) => (
                    <Path key={i} id={`curve${i}`} d={d} fill="transparent" />
                  ))}

                  {nameLines.map((line, i) => (
                    <SvgText
                      key={i}
                      fill="#8B0000"
                      fontSize={jerseyFontSize}
                      fontWeight="900"
                      fontStyle="italic"
                      textAnchor="middle"
                      transform="skewX(-5)">
                      <TextPath href={`#curve${i}`} startOffset="50%">
                        {line}
                      </TextPath>
                    </SvgText>
                  ))}
                </Svg>
              );
            })()}
          </View>

          {/* HQ TEXT */}
          <Text
            style={{
              position: 'absolute',
              top: SH * 0.04,
              left: 65,
              width: '100%',
              textAlign: 'center',
              fontSize: 14,
              color: 'white',
              fontWeight: '900',
              fontStyle: 'italic',
            }}>
            HQ: {stats.hq || 'N/A'}
          </Text>

          {/* TEAM LOGO */}
          {teamLogoUri ? (
            <View style={styles.jerseyLogoCircle}>
              <Image
                source={{uri: teamLogoUri}}
                resizeMode="contain"
                style={styles.jerseyLogo}
              />
            </View>
          ) : (
            <View style={styles.jerseyLogoCircle}>
              <Image
                source={Assets.Home.Tshirt_logo}
                resizeMode="stretch"
                style={styles.jerseyLogo}
              />
            </View>
          )}

          {/* TEAM NAME */}
          {/* TEAM NAME */}
          <View
            style={{
              position: 'absolute',
              top: SH * 0.1, // below HQ text, above logo center
              // left: SW * 0.2,
              left: '52%', // starts after jersey left edge
              right: SW * 0.26, // stops before logo circle (logo is right: 8%)
              height: 16,
              overflow: 'hidden',
              zIndex: 0, // ✅ behind logo (logo has elevation: 12)
            }}>
            <MarqueeTeamName text={formattedTeamName} />
          </View>
          <View
            style={{
              position: 'absolute',
              top: '35%',
              right: '8%',
              width: 60,
              height: 60,
              borderRadius: 40,
             // backgroundColor: 'rgba(253, 246, 246, 0.0)', // same as jerseyLogoCircle bg
              zIndex: 5,
            }}
          />

          {/* TEAM LOGO — stays on top */}
          {teamLogoUri ? (
            <View style={[styles.jerseyLogoCircle, {zIndex: 10}]}>
              <Image
                source={{uri: teamLogoUri}}
                resizeMode="contain"
                style={styles.jerseyLogo}
              />
            </View>
          ) : (
            <View style={[styles.jerseyLogoCircle, {zIndex: 10}]}>
              <Image
                source={Assets.Home.Tshirt_logo}
                resizeMode="stretch"
                style={styles.jerseyLogo}
              />
            </View>
          )}
        </Box>
      </Box>

      <LinearGradient
        colors={['#c997ba99', '#c593b899', '#c293b499']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={[styles.infoRow, {marginTop: -SH * 0.03}]}>
        <Text style={styles.infoText}>Region: {stats.region || 'N/A'}</Text>
        {/* <Text style={styles.infoText}>Area: {stats.area || 'N/A'}</Text> */}
        <Text style={styles.infoText}>Zone: {stats.zone || 'N/A'}</Text>
      </LinearGradient>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        {/* Top Row: Total Goals + Average Goals + Matches */}
        <View style={styles.topRow}>
          {/* Total Goals */}
          <View
            style={[
              styles.statBox,
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 20,
              },
            ]}>
            <View style={{alignItems: 'center', marginTop: 6}}>
              <Text style={[styles.statLabel, {fontWeight: 'bold'}]}>
                GOALS
              </Text>
              <Text style={styles.statValueLarge1}>
                {Math.min(stats.totalGoals, 999)}
              </Text>
            </View>

            <View style={{alignItems: 'center', marginTop: 0}}>
              <Text style={styles.statLabel2}>Average Goals</Text>
              <Text style={styles.statSubLabel2}>Per Match</Text>
              <Text style={styles.statValueLarge}>
                {stats.totalMatches > 0
                  ? (() => {
                      const avg = stats.totalGoals / stats.totalMatches;
                      return avg >= 3 ? '2.99' : avg.toFixed(2);
                    })()
                  : '0.00'}
              </Text>
            </View>
          </View>

          {/* Matches + WLD */}
          <View
            style={[
              styles.statBox,
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginLeft: 40,
              },
            ]}>
            <View style={{alignItems: 'center', marginTop: -25}}>
              <Text style={[styles.statLabel, {marginTop: 10}]}>Matches</Text>
              <Text style={styles.statValueMedium}>{stats.totalMatches}</Text>
            </View>
            <View style={styles.wldContainer}>
              <View style={{flexDirection: 'row', gap: 1}}>
                <View
                  style={[
                    styles.wldBox1,
                    {
                      borderTopLeftRadius: 4,
                      borderWidth: 1,
                      borderColor: '#da90cf',
                    },
                  ]}>
                  <Text style={styles.wldLabel}>W</Text>
                </View>
                <View
                  style={[
                    styles.wldBox,
                    {
                      borderTopRightRadius: 4,
                      borderWidth: 1,
                      borderColor: '#da90cf',
                    },
                  ]}>
                  <Text style={styles.wldValue}>{stats.wins}</Text>
                </View>
              </View>
              <View style={{flexDirection: 'row', gap: 1}}>
                <View
                  style={[
                    styles.wldBox1,
                    {borderWidth: 1, borderColor: '#da90cf'},
                  ]}>
                  <Text style={styles.wldLabel}>L</Text>
                </View>
                <View
                  style={[
                    styles.wldBox,
                    {borderWidth: 1, borderColor: '#da90cf'},
                  ]}>
                  <Text style={styles.wldValue}>{stats.losses}</Text>
                </View>
              </View>
              <View style={{flexDirection: 'row', gap: 1}}>
                <View
                  style={[
                    styles.wldBox1,
                    {
                      borderBottomLeftRadius: 4,
                      borderWidth: 1,
                      borderColor: '#da90cf',
                    },
                  ]}>
                  <Text style={styles.wldLabel}>D</Text>
                </View>
                <View
                  style={[
                    styles.wldBox,
                    {
                      borderBottomRightRadius: 4,
                      borderWidth: 1,
                      borderColor: '#da90cf',
                    },
                  ]}>
                  <Text style={styles.wldValue}>{stats.draws}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Row: 4 Stats */}
        <View style={styles.bottomRow}>
          {/* Ball Possession */}
          <View style={styles.miniStatBox}>
            <View style={styles.valueWithUnit}>
              <Image
                source={Assets.Home.PlayerLogin}
                resizeMode="contain"
                style={{width: 20, height: 20, marginRight: 5}}
              />
              <Text style={styles.miniStatValue}>
                {typeof stats.totalApprovedUploads === 'number'
                  ? Math.min(Math.floor(stats.totalApprovedUploads), 999)
                  : typeof stats.ballPossession === 'number'
                  ? Math.min(Math.floor(stats.ballPossession), 999)
                  : '-'}
              </Text>
            </View>
            <Text style={styles.miniStatLabel}>Dribble</Text>
          </View>

          {/* Fastest Goal */}
          <View style={styles.miniStatBox}>
            <View style={styles.valueWithUnit}>
              <Image
                source={Assets.Home.fastest_goal}
                resizeMode="contain"
                style={styles.fastestgoal}
              />
              <Text style={styles.miniStatValue}>
                {stats?.fastestGoalTime ??
                  stats?.fastestGoal ??
                  stats?.minGoalTime ??
                  '-'}
              </Text>
              <Text style={styles.unitText}>Hrs</Text>
            </View>
            <Text style={styles.miniStatLabel}>Fastest Goal</Text>
          </View>

          {/* Hrs per Goal */}
          <View style={styles.miniStatBox}>
            <View style={styles.valueWithUnit}>
              <Image
                source={Assets.Home.Hrs_Per_goal}
                resizeMode="contain"
                style={styles.HrsPergoal}
              />
              <Text style={styles.miniStatValue}>
                {(() => {
                  if (stats.averageTimePerGoal != null) {
                    return Math.min(
                      Math.floor(Number(stats.averageTimePerGoal)),
                      999,
                    );
                  }
                  if (
                    stats.totalMatches > 0 &&
                    stats.totalGoals > 0 &&
                    stats.fastestGoalTime != null
                  ) {
                    const avg =
                      (Number(stats.fastestGoalTime) * stats.totalMatches) /
                      stats.totalGoals;
                    return Math.min(Math.floor(avg), 999);
                  }
                  return '-';
                })()}
              </Text>
            </View>
            <Text style={styles.miniStatLabel}>Hrs per Goal</Text>
          </View>

          {/* Player du' Match */}
          <View style={styles.miniStatBox}>
            <View style={styles.valueWithUnit}>
              <Image
                source={Assets.Home.Players_Duration}
                resizeMode="contain"
                style={styles.fastestgoal}
              />
              <Text style={styles.miniStatValue}>{stats.potmCount}</Text>
            </View>
            <Text style={styles.miniStatLabel}>Player du' Match</Text>
          </View>
        </View>
      </View>
    </Box>
  );
};

const styles = StyleSheet.create({
  jerseyBase: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
    marginTop: 0,
  },
  jerseyLogoCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    top: '35%',
    right: '8%',
    borderRadius: 40,
    backgroundColor: 'rgba(227, 217, 217, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#110101',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 0,
    zIndex: 10,
  },
  jerseyLogo: {
    width: 50,
    height: 50,
  },
  HrsPergoal: {
    width: 20,
    height: 20,
    marginRight: 5,
  },
  fastestgoal: {
    width: 20,
    height: 20,
    marginRight: 3,
  },
  statsContainer: {},
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 65,
    paddingHorizontal: 5,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  statSubLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    textAlign: 'center',
  },
  statLabel2: {
    color: '#FFFFFF',
    fontSize: 11,
    textAlign: 'center',
  },
  statSubLabel2: {
    color: '#FFFFFF',
    fontSize: 9,
    textAlign: 'center',
  },
  statLabel3: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statSubLabel3: {
    color: '#FFFFFF',
    fontSize: 9,
    textAlign: 'center',
  },
  statValueLarge: {
    color: '#e1dada',
    fontSize: 25,
    fontWeight: '600',
  },
  statValueLarge1: {
    color: '#e1dada',
    fontSize: 40,
    fontWeight: '900',
  },
  statValueMedium: {
    color: '#e1dada',
    fontSize: 28,
    fontWeight: '900',
  },
  wldContainer: {
    marginTop: -5,
  },
  wldBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 45,
    paddingLeft: 17,
  },
  wldBox1: {
    alignItems: 'center',
    width: 30,
    paddingTop: 3,
  },
  wldLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  wldValue: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
  },
  miniStatBox: {
    alignItems: 'center',
    flex: 1,
  },
  miniStatValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderRadius: 4,
  },
  infoBox: {
    flex: 1,
  },
  infoText: {
    fontSize: 10,
    fontWeight: 'bold',
    flexWrap: 'wrap',
  },
  miniStatLabel: {
    color: '#FFFFFF',
    fontSize: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  valueWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
    marginTop: 10,
  },
});

const StatBox = ({
  label,
  Value,
  isLong,
}: {
  label: string;
  Value: string;
  isLong?: boolean;
}) => (
  <Box
    alignItems="center"
    flex={isLong ? 1.4 : 1}
    position="absolute"
    top={100}
    right={isLong ? -20 : 0}>
    <Text
      color="white"
      fontSize={8}
      fontWeight="bold"
      numberOfLines={1}
      adjustsFontSizeToFit>
      {label}
    </Text>
    <Text color="white" fontSize={18} fontWeight="bold">
      {Value}
    </Text>
  </Box>
);

export default PlayerHeader;
