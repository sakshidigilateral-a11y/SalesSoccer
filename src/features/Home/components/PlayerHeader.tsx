import React, {useEffect, useState, useRef} from 'react';
import {Image, StyleSheet, ActivityIndicator, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNFS from 'react-native-fs';
import {Box, Text} from '../../../components/themes';
import {Assets} from '../../../assets/images';
import Svg, {Path, Text as SvgText, TextPath} from 'react-native-svg';
import axios from 'axios';
import io, {Socket} from 'socket.io-client';
import {useDispatch, useSelector} from 'react-redux'; // ✅ Add useSelector
import {
  setPlayerStats,
  setLoading as setLoadingAction,
  setError,
  updatePossessionCount,
  updateGoalCount,
} from '../../../redux/playerSlice';
import {AppDispatch, RootState} from '../../../redux/store'; // ✅ Add RootState
import LinearGradient from 'react-native-linear-gradient';

const API_URL = 'https://salessoccer.digilateral.com';

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

const PlayerHeader = () => {
  const dispatch = useDispatch<AppDispatch>();

  // ✅ Get loading and stats from Redux instead of local state
  const {stats, loading} = useSelector((state: RootState) => state.player);
  const {mrId, role} = useSelector((state: RootState) => state.auth);
  console.log('ressssssssssss:', stats);
  const [teamLogoUri, setTeamLogoUri] = useState<string | null>(null);
  // const [mrId, setMrId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // const FONT_SIZE = 25;
  const TOP_Y = 70;
  const CURVE_HEIGHT = 30;
  // const GAP = FONT_SIZE * 1.5;
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
      // const userData = await AsyncStorage.getItem('userData');
      // const res = JSON.parse(userData || '{}');
      const userId = mrId;

      console.log('socket idddddddddddddddddd', userId);

      if (!userId) {
        console.error('No user ID found for socket connection');
        return;
      }

      // setMrId(userId);

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

      // ✅ Listen for upload created (handles both goals AND possession)
      socketRef.current.on('uploadCreated', data => {
        console.log('Upload created received:', data);

        // Check if this upload belongs to current user
        if (data.mrId !== userId) return;

        // Update goal count if available
        // if (data.individualMrGoalCount !== undefined) {
        //   console.log('Updating goal count to:', data.individualMrGoalCount);
        //   fetchPlayerStats();
        // }

        // Update possession/rxn count if available
        if (data.rxCount !== undefined) {
          console.log('Updating possession count to:', data.rxCount);
        }
      });

      // ✅ Listen for upload status changes (when boss approves/rejects)
      socketRef.current.on('uploadStatusChanged', data => {
        console.log('Upload status changed:', data);

        if (data.mrId !== userId) return;

        if (data.status === 'approved') {
          // Refresh full stats when upload is approved
          console.log('Upload approved, refreshing stats...');
          fetchPlayerStats();
        }
      });

      // ✅ Listen for goal updates
      socketRef.current.on('goalUpdate', data => {
        console.log('Goal update received:', data);

        // If this event has individual MR data, update it
        if (data.mrId === userId && data.goalCount !== undefined) {
          dispatch(updateGoalCount(data.goalCount));
        }
      });

      // ✅ Listen for possession updates
      socketRef.current.on('possessionUpdate', data => {
        console.log('Possession update received:', data);

        if (data.mrId === userId && data.possessionCount !== undefined) {
          dispatch(updatePossessionCount(data.possessionCount));
        }
      });

      // ✅ Listen for match stats updates (full stats refresh)
      socketRef.current.on('matchStatsUpdate', data => {
        console.log('Match stats update received:', data);

        if (data.playerStats) {
          dispatch(setPlayerStats(data.playerStats));
        }
      });

      // ✅ Listen for match completion
      socketRef.current.on('matchCompleted', data => {
        console.log('Match completed:', data);
        fetchPlayerStats();
      });

      // ✅ Listen for direct player stats update
      socketRef.current.on('playerStatsUpdate', data => {
        if (data.mrId !== userId) return;

        console.log('🔥 LIVE STATS UPDATE:', data.stats);

        dispatch(setPlayerStats(data.stats));
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

      // ✅ Use Redux auth state instead of AsyncStorage
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
        dispatch(setPlayerStats(playerData));
        await loadTeamLogo(playerData.teamName);
      }
    } catch (error) {
      console.error('Error fetching player stats:', error);
      dispatch(setError(error?.message || 'Failed to fetch stats'));
    } finally {
      dispatch(setLoadingAction(false));
    }
  };

  // const getTextOffset = (text: string, isFirstLine: boolean = true) => {
  //   const textLength = text.length;

  //   if (isFirstLine) {
  //    if (textLength <= 3) return '50%';
  //     if (textLength <= 6) return '30%';
  //     if (textLength <= 10) return '12%';
  //     return '5%';
  //   }

  //   if (textLength <= 3) return '45%';
  //   if (textLength <= 6) return '20%';
  //   if (textLength <= 10) return '10%';
  //   return '10%';
  // };
  const getDynamicFontSize = (text: string) => {
    const length = text.length;

    if (length <= 8) return 25;
    if (length <= 12) return 21;
    if (length <= 16) return 18;
    if (length <= 20) return 16;
    return 14; // very long names
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
      return {firstName: parts[0], lastName: ''};
    }
    const firstName = parts.slice(0, -1).join(' ');
    const lastName = parts[parts.length - 1];
    return {firstName, lastName};
  };

  const formatTeamName = (teamName?: string | null) => {
    if (!teamName) return '';

    return teamName.replace(/([a-z])([A-Z])/g, '$1\n$2').toUpperCase();
  };

  // ✅ Now loading comes from Redux
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

  // ✅ Now stats comes from Redux
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

  const {firstName, lastName} = getNameParts(
    stats.mrName || stats.flmName || '',
  );
  const firstFontSize = getDynamicFontSize(firstName);
  const lastFontSize = getDynamicFontSize(lastName);
  const formattedTeamName = formatTeamName(stats.teamName);

  return (
    <Box padding="xs" style={{marginTop: '-10%'}}>
      {/* Jersey and Team Info */}
      <Box flexDirection="row" alignItems="center">
        <Box
          width="110%"
          height={120}
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
              top: '25%',
              left: '-10%',
              width: '76%',
              alignItems: 'center',
            }}>
            {(firstName + lastName).length > 18 ? (
              // LONG NAME → STRAIGHT TEXT
              <Text
                style={{
                  textAlign: 'center',
                  fontWeight: '900',
                  fontStyle: 'italic',
                  color: '#8B0000',
                  fontSize: 30,
                }}>
                {(firstName + ' ' + lastName).toUpperCase()}
              </Text>
            ) : (
              // SHORT NAME → CURVED SVG
              <Svg viewBox="0 0 400 220" width="100%" height={120}>
                {/* More aggressive curve */}
                <Path
                  id="curveTop"
                  d="M 20,120 Q 200,20 380,120"
                  fill="transparent"
                />

                <Path
                  id="curveBottom"
                  d="M 40,165 Q 200,60 360,165"
                  fill="transparent"
                />
                <SvgText
                  fill="#8B0000"
                  fontSize={26}
                  fontWeight="900"
                  fontStyle="italic"
                  textAnchor="middle">
                  <TextPath href="#curveTop" startOffset="50%">
                    {firstName.toUpperCase()}
                  </TextPath>
                </SvgText>

                {lastName ? (
                  <SvgText
                    fill="#8B0000"
                    fontSize={26}
                    fontWeight="900"
                    fontStyle="italic"
                    textAnchor="middle">
                    <TextPath href="#curveBottom" startOffset="50%">
                      {lastName.toUpperCase()}
                    </TextPath>
                  </SvgText>
                ) : null}
              </Svg>
            )}
          </View>
          <Text
            style={{
              position: 'absolute',
              top: 20,
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
            <Image
              source={{uri: teamLogoUri}}
              resizeMode="contain"
              style={styles.jerseyLogo}
            />
          ) : (
            <Image
              source={Assets.Home.Tshirt_logo}
              resizeMode="stretch"
              style={styles.jerseyLogo}
            />
          )}

          <Text
            variant="header"
            fontSize={10}
            fontStyle="italic"
            fontWeight="900"
            position="absolute"
            top={71}
            left={65}
            width="100%"
            textAlign="center"
            numberOfLines={2}>
            {formattedTeamName}
          </Text>
        </Box>
      </Box>

      <LinearGradient
        colors={['#c997ba99', '#c593b899', '#c293b499']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={styles.infoRow}>
        <Text style={styles.infoText}>Region: {stats.region || 'N/A'}</Text>

        <Text style={styles.infoText}>Area: {stats.area || 'N/A'}</Text>

        <Text style={styles.infoText}>Zone: {stats.zone || 'N/A'}</Text>
      </LinearGradient>

      {/* <View
        style={{
          borderBottomColor: '#eaeaea',
          borderBottomWidth: 0.2,
          marginTop: 3,
        }}></View> */}

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
              <Text style={styles.statValueLarge1}>{stats.totalGoals}</Text>
            </View>

            <View style={{alignItems: 'center', marginTop: 0}}>
              <Text style={styles.statLabel2}>Average Goals</Text>
              <Text style={styles.statSubLabel2}>Per Match</Text>

              <Text style={styles.statValueLarge}>
                {stats.totalMatches > 0
                  ? (stats.totalGoals / stats.totalMatches).toFixed(2)
                  : '0'}
              </Text>
            </View>
          </View>

          {/* Average Goals */}
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
            <Text style={styles.miniStatValue}>
              {stats.totalApprovedUploads}
            </Text>
            <Text style={styles.miniStatLabel}>Ball Possession</Text>
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
                {typeof stats.fastestGoalTime === 'number'
                  ? Math.floor(stats.fastestGoalTime)
                  : '-'}
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
                {typeof stats.averageTimePerGoal === 'number'
                  ? Math.min(Math.floor(stats.averageTimePerGoal), 999)
                  : '-'}
              </Text>
              {/* <Text style={styles.unitText}>Hrs</Text> */}
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
    height: '150%',
    alignSelf: 'center',
    marginTop: -25,
    // marginLeft: -5,
  },
  jerseyLogo: {
    position: 'absolute',
    width: 90,
    height: 90,
    top: '25%',
    right: '6%',
    alignSelf: 'center',
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
  // Stats Container
  statsContainer: {
    // marginTop: 1,
    // paddingHorizontal: 10,
  },

  // Top Row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // marginBottom: 5,
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
    // fontWeight: 'bold',
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
    // fontWeight: 'bold',
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

  // W/L/D Box
  wldContainer: {
    // gap: 1,
    marginTop: -5,
  },
  wldBox: {
    // backgroundColor: '#9B2C8A', // Purple/magenta color from your screenshot
    // borderRadius: 4,
    // paddingHorizontal: -6,
    // paddingVertical: -6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 45, // Adjust based on your needs
    paddingLeft: 17,
  },

  wldBox1: {
    // backgroundColor: '#9B2C8A', // Purple/magenta color from your screenshot
    // paddingHorizontal: -6,
    // paddingVertical: -6,
    // flexDirection: 'row',
    // justifyContent: 'space-between',
    alignItems: 'center',
    width: 30, // Adjust based on your needs
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

  // Bottom Row
  bottomRow: {
    flexDirection: 'row',
    // justifyContent: 'space-between',
    // marginTop: 1,
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
    // backgroundColor: 'rgba(244, 146, 239, 0.4)',
    // gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderRadius: 4,
  },
  infoBox: {
    flex: 1,
    //  backgroundColor: 'rgba(244, 146, 239, 0.4)',
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
    // marginTop: 2,
    fontStyle: 'italic',
  },
  valueWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 500,
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
