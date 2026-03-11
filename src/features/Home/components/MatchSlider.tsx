import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Image,
  Dimensions,
  StyleSheet,
  Animated,
  Easing,
  ImageBackground,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNFS from 'react-native-fs';
import LinearGradient from 'react-native-linear-gradient';
import {Box, Text} from '../../../components/themes';
import {Assets} from '../../../assets/images';
import {Shadow} from 'react-native-shadow-2';
import axios from 'axios';
import {useSelector} from 'react-redux';
import {RootState} from '@reduxjs/toolkit/query';
import io, {Socket} from 'socket.io-client';
import {Text as RNText} from 'react-native';

const {width} = Dimensions.get('window');
const cardWidth = width * 0.88;
const CARD_SPACING = 1;
const API_URL = 'https://salessoccer.digilateral.com';

interface MRUpload {
  mrId: string;
  mrName: string;
  flmId: string;
  goalsEarned: number;
  totalNoOfRxns: number;
  lastUploadTime: string;
  [key: string]: any;
}

interface Team {
  flmId: string;
  flmName: string;
  teamName: string;
  goals: number;
  mrs?: MRUpload[];
  rank?: number;
}

interface Match {
  id: string;
  matchId: number;
  startTime: string;
  endTime: string;
  teams: Team[];
}

interface SlideData {
  title: string;
  headerImg: any;
  bgImg: any;
  status: 'active' | 'upcoming' | 'completed';
  matches: Match[];
}

const SLIDES_CONFIG = [
  {
    title: 'END MATCH',
    headerImg: Assets.Home.EndMatch,
    bgImg: Assets.Home.Header2,
    status: 'completed' as const,
  },
  {
    title: 'LIVE',
    headerImg: Assets.Home.Live,
    bgImg: Assets.Home.Header2,
    status: 'active' as const,
  },
  {
    title: 'UPCOMING',
    headerImg: Assets.Home.Upcoming,
    bgImg: Assets.Home.Header2,
    status: 'upcoming' as const,
  },
];

const fmtTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
};

const fmtHeaderDate = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('en-US', {
    month: 'short',
  })}-${d.getFullYear()}`;
};

interface MatchDetailModalProps {
  visible: boolean;
  match: Match | null;
  status: 'active' | 'completed' | 'upcoming';
  teamLogos: {[key: string]: string};
  token: string | null;
  stats: any;
  onClose: () => void;
  formatTeamName: (name: string) => string;
}

// ─── UPDATED MatchDetailModal — matches new scoreboard design ────────────────
const MatchDetailModal = ({
  visible,
  match,
  status,
  teamLogos,
  token,
  stats,
  onClose,
  formatTeamName,
}: MatchDetailModalProps) => {
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (visible) setActiveTab(0);
  }, [visible, match?.id]);

  if (!match) return null;

  const teamA = match.teams[0];
  const teamB = match.teams[1];
  const currentTeam = activeTab === 0 ? teamA : teamB;
  const rows: MRUpload[] = [...(currentTeam?.mrs || [])].sort((a, b) => {
    if (b.totalNoOfRxns !== a.totalNoOfRxns)
      return b.totalNoOfRxns - a.totalNoOfRxns;
    return b.goalsEarned - a.goalsEarned;
  });

  // Winner text for completed matches
  let winnerText = '';
  if (status === 'completed') {
    const diff = Math.abs((teamA?.goals || 0) - (teamB?.goals || 0));
    if ((teamA?.goals || 0) > (teamB?.goals || 0)) {
      winnerText = `${formatTeamName(teamA.teamName)} Won by ${diff} GOAL${
        diff !== 1 ? 'S' : ''
      }!`;
    } else if ((teamB?.goals || 0) > (teamA?.goals || 0)) {
      winnerText = `${formatTeamName(teamB.teamName)} Won by ${diff} GOAL${
        diff !== 1 ? 'S' : ''
      }!`;
    } else {
      winnerText = 'Match Draw';
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      {/* Full-screen gradient background */}
      <ImageBackground
        source={Assets.Common.background}
        resizeMode="cover"
        style={D.fullScreen}>
        {/* Decorative blobs in background */}

        {/* Card container */}
        <View style={D.card}>         
          {/* ── Header: date row ── */}
          <View style={D.headerDateRow}>
            <RNText style={D.headerDate}>
              {fmtHeaderDate(match.startTime)}
            </RNText>
            <RNText style={D.matchBadgeText}>
              {`Match ${match.matchId}`}
              {status === 'active' ? '  🔴' : ''}
            </RNText>
            <RNText style={D.headerDate}>{fmtHeaderDate(match.endTime)}</RNText>
          </View>

          {/* ── Score section ── */}
          <View style={D.scoreSection}>
            {/* Team A */}
            <View style={D.teamBlock}>
              <Image
                source={
                  teamLogos[teamA?.teamName]
                    ? {uri: teamLogos[teamA.teamName]}
                    : Assets.Home.Banglore
                }
                style={D.teamLogo}
              />
              <RNText style={D.teamScore}>{String(teamA?.goals || 0)}</RNText>
            </View>

            {/* VS */}
            <RNText style={D.vsText}>{'vs'}</RNText>

            {/* Team B */}
            <View style={D.teamBlock}>
              <Image
                source={
                  teamLogos[teamB?.teamName]
                    ? {uri: teamLogos[teamB.teamName]}
                    : Assets.Home.Bhopal
                }
                style={D.teamLogo}
              />
              <RNText style={D.teamScore}>{String(teamB?.goals || 0)}</RNText>
            </View>
          </View>

          {/* Winner text */}
          {winnerText !== '' && (
            <RNText style={D.winnerText}>{winnerText}</RNText>
          )}
          {status === 'active' && (
            <RNText style={D.winnerText}>{'🔴 Match is Live'}</RNText>
          )}

          {/* ── Tab switcher ── */}
          <View style={{flexDirection: 'row', height: 44, width: '100%'}}>
            {[teamA, teamB].map((team, idx) => {
              const isLeft = idx === 0;
              const isActive = activeTab === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  style={{
                    flex: 1,
                    height: 44,
                    zIndex: isLeft ? 2 : 1,
                    marginRight: isLeft ? -18 : 0,
                  }}
                  onPress={() => setActiveTab(idx)}
                  activeOpacity={0.9}>
                  {/* ── Background image layer ── */}
                  <View style={isLeft ? D.tabBgLeft : D.tabBgRight}>
                    <ImageBackground
                      source={
                        isLeft
                          ? Assets.Home.ScoreBoard
                          : Assets.Home.ScoreBoard1
                      }
                      resizeMode="cover"
                      style={D.tabBgImage}
                    />
                  </View>

                  {/* ── Text label layer ── */}
                  <View style={isLeft ? D.tabLabelLeft : D.tabLabelRight}>
                    <RNText
                      numberOfLines={1}
                      style={[
                        D.tabText,
                        {color: isActive ? '#fff' : 'rgba(255,255,255,0.60)'},
                      ]}>
                      {formatTeamName(team?.teamName || `Team ${idx + 1}`)}
                    </RNText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Column headers ── */}
          <View style={D.colRow}>
            <RNText style={[D.colTxt, {flex: 3, textAlign: 'left'}]}>
              {'Players Name'}
            </RNText>
            <RNText style={D.colTxt}>{'⏱'}</RNText>
            <RNText style={D.colTxt}>{'Goals'}</RNText>
            <RNText style={D.colTxt}>{'RxBP'}</RNText>
          </View>

          {/* ── Player list ── */}
          {rows.length === 0 ? (
            <View style={D.centerBox}>
              <RNText style={D.emptyTxt}>{'No data available'}</RNText>
            </View>
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(item, i) => item.mrId || String(i)}
              showsVerticalScrollIndicator={false}
              style={D.list}
              renderItem={({item, index}) => {
                const hasUploads = item.totalNoOfRxns > 0;
                const hasGoals = item.goalsEarned > 0;
                const hasTime = hasUploads && !!item.lastUploadTime;
                const isTopUploader = index === 0 && hasUploads;
                return (
                  <View
                    style={[D.playerRow, index % 2 !== 0 && D.playerRowAlt]}>
                    <View style={[D.playerNameCell, {flex: 3}]}>
                      <RNText style={D.playerNum}>
                        {String(index + 1).padStart(2, '0') + '.'}
                      </RNText>
                      <RNText style={D.playerName} numberOfLines={1}>
                        {item.mrName}
                      </RNText>
                      {isTopUploader && <RNText style={D.crown}>👑</RNText>}
                    </View>
                    <RNText style={[D.cellTxt, hasTime && D.timeTxt]}>
                      {hasTime ? fmtTime(item.lastUploadTime) : ''}
                    </RNText>
                    <RNText style={[D.cellTxt, hasGoals && D.goalHighlight]}>
                      {hasGoals ? String(item.goalsEarned) : ''}
                    </RNText>
                    <RNText
                      style={[D.cellTxt, hasUploads && D.uploadHighlight]}>
                      {hasUploads ? String(item.totalNoOfRxns) : ''}
                    </RNText>
                  </View>
                );
              }}
            />
          )}
        </View>

        <TouchableOpacity onPress={onClose} style={D.closeBtn}>
          <RNText style={D.closeBtnTxt}>{'✕'}</RNText>
        </TouchableOpacity>
      </ImageBackground>
    </Modal>
  );
};

const D = StyleSheet.create({
  fullScreen: {
    flex: 1,
    width: '100%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Decorative background blobs ──
  card: {
    // flex: 1,
    height: '89%',
    width: '90%',
    backgroundColor: 'rgba(180,100,190,0.90)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  // ── Tab background views ──
  // ✅ AFTER
  tabBgLeft: {
    position: 'absolute',
    top: -15,
    bottom: -16,
    left: -2,
    gap: 4, // bleed slightly left
    right: -5, // extend right to cover the -18 overlap gap
  },
  tabBgRight: {
    position: 'absolute',
    top: -8,
    bottom: -6,
    gap: 12,
    left: -2, // slightly overlap left tab edge
    right: -4, // bleed slightly right
  },
  tabBgImage: {
    flex: 1,
  },

  // ── Tab label views ──
  tabLabelLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 18, // compensate for the -18 marginRight overlap
    bottom: -10,
  },
  tabLabelRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 18, // compensate for the overlap from left tab
    bottom: -10,
  },

  // ── Tab text ──
  tabText: {
    fontSize: 13,
    fontWeight: '800',
    fontStyle: 'italic',
    flexShrink: 1,
    bottom: 5,
  },
  // tabRow: {
  //   flexDirection: 'row',
  //   width: '100%',
  //   height: 42,
  // },

  // tabContainer: {
  //   flex: 1,
  //   overflow: 'hidden',
  // },

  // leftTab: {
  //   zIndex: 2,
  //   marginRight: -20, // overlap right tab
  // },

  // rightTab: {
  //   zIndex: 1,
  // },

  // tabGradient: {
  //   flex: 1,
  //   paddingVertical: 10,
  //   paddingHorizontal: 24,
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   transform: [{skewX: '-15deg'}],
  // },

  // tabTxt: {
  //   color: 'rgba(255,255,255,0.65)',
  //   fontSize: 14,
  //   fontWeight: '700',
  //   fontStyle: 'italic',
  //   transform: [{skewX: '15deg'}], // counter-skew so text stays upright
  // },

  // tabTxtActive: {
  //   color: '#fff',
  //   fontWeight: '900',
  // },

  // tabDimOverlay: {
  //   ...StyleSheet.absoluteFillObject,
  //   backgroundColor: 'rgba(95, 9, 148, 0.45)',
  // },

  headerDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },

  headerDate: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  matchBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  scoreSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  teamBlock: {
    alignItems: 'center',
    flex: 1,
  },

  teamLogo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  tabInactive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  teamScore: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    fontStyle: 'italic',
    marginTop: 4,
  },
  vsText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    marginBottom: 20,
  },

  winnerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },

  tab: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 0,
  },
  tabActive: {
    backgroundColor: 'rgba(80,10,120,0.85)',
  },

  // ── Column headers ──
  colRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  colTxt: {
    flex: 1,
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // ── Player list ──
  list: {flex: 1},
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  playerRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  playerNameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playerNum: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '700',
    fontStyle: 'italic',
    width: 30,
  },
  playerName: {
    fontSize: 13,
    color: '#fff',
  },
  cellTxt: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  goalHighlight: {color: '#fff', fontWeight: '900', fontSize: 14},
  uploadHighlight: {color: '#fff', fontWeight: '800', fontSize: 14},
  centerBox: {height: 160, justifyContent: 'center', alignItems: 'center'},
  emptyTxt: {color: 'rgba(255,255,255,0.5)', fontSize: 13, fontStyle: 'italic'},
  crown: {fontSize: 13, marginLeft: 3},
  timeTxt: {color: '#fff', fontWeight: '700'},

  // ── Close button ──
  closeBtn: {
    position: 'absolute',
    top: 15,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnTxt: {color: '#fff', fontSize: 13, fontWeight: '700'},
});

const MatchSlider = () => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<any>(null);

  const rotateValue = useRef(new Animated.Value(0)).current;
  const socketRef = useRef<Socket | null>(null);

  const [slides, setSlides] = useState<SlideData[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamLogos, setTeamLogos] = useState<{[key: string]: string}>({});
  const [pollVisible, setPollVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailMatch, setDetailMatch] = useState<Match | null>(null);
  const [detailStatus, setDetailStatus] = useState<
    'active' | 'completed' | 'upcoming'
  >('active');
  const [predictions, setPredictions] = useState<{
    [key: string]: {teamA: number; teamB: number};
  }>({});
  const [alreadyVoted, setAlreadyVoted] = useState<{[key: string]: boolean}>(
    {},
  );
  const [voting, setVoting] = useState(false);
  const stats = useSelector((state: RootState) => state.player.stats);
  const token = useSelector((state: RootState) => state.auth.token);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [voteMessage, setVoteMessage] = useState('');

  useEffect(() => {
    fetchAllMatches();
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({index: 1, animated: false});
    }, 300);
    startRotation();
    initializeSocket();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const initializeSocket = () => {
    socketRef.current = io(API_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      slides.forEach(slide => {
        if (slide.status === 'active')
          slide.matches.forEach(m =>
            socketRef.current?.emit('joinMatch', m.id),
          );
      });
    });

    socketRef.current.on('goalUpdate', data => {
      setSlides(prev =>
        prev.map(slide => {
          if (slide.status !== 'active') return slide;
          return {
            ...slide,
            matches: slide.matches.map(m =>
              m.id === data.matchId
                ? {
                    ...m,
                    teams: [
                      {...m.teams[0], goals: data.teamAGoal},
                      {...m.teams[1], goals: data.teamBGoal},
                    ],
                  }
                : m,
            ),
          };
        }),
      );
      setDetailMatch(prev =>
        prev && prev.id === data.matchId
          ? {
              ...prev,
              teams: [
                {...prev.teams[0], goals: data.teamAGoal},
                {...prev.teams[1], goals: data.teamBGoal},
              ],
            }
          : prev,
      );
    });

    socketRef.current.on('matchCompleted', () => fetchAllMatches());
    socketRef.current.on('disconnect', () =>
      console.log('Match slider socket disconnected'),
    );
  };

  const joinMatchRooms = (matchesData: SlideData[]) => {
    if (!socketRef.current?.connected) return;
    matchesData.forEach(slide => {
      if (slide.status === 'active')
        slide.matches.forEach(m => socketRef.current?.emit('joinMatch', m.id));
    });
  };

  const startRotation = () => {
    rotateValue.setValue(0);
    Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  };

  const formatTeamName = (name: string): string => {
    if (!name) return '';
    return name
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  };

  const handleVote = async (matchId: string, teamId: string) => {
    if (voting || alreadyVoted[matchId] || !token) {
      if (!token) setVoteMessage('User not authenticated');
      return;
    }
    setVoting(true);
    setVoteMessage('');
    try {
      const res = await axios.post(
        `${API_URL}/api/mr/matches/${matchId}/vote`,
        {votedTeamId: teamId},
        {headers: {Authorization: `Bearer ${token}`}},
      );
      const d = res.data.data;
      setPredictions(prev => ({
        ...prev,
        [matchId]: {
          teamA: d.teams.teamA.percentage,
          teamB: d.teams.teamB.percentage,
        },
      }));
      setAlreadyVoted(prev => ({...prev, [matchId]: true}));
      setVoteMessage('Vote cast successfully');
    } catch (error: any) {
      if (error.response?.status === 409) {
        setAlreadyVoted(prev => ({...prev, [matchId]: true}));
        setVoteMessage('You have already voted');
      } else {
        setVoteMessage(error.response?.data?.message || 'Something went wrong');
      }
    } finally {
      setVoting(false);
    }
  };

  const fetchAllMatches = async () => {
    try {
      setLoading(true);
      const userDataString = await AsyncStorage.getItem('userData');
      if (!userDataString) return;
      const userData = JSON.parse(userDataString);
      const adminId = userData.user.adminId;
      const userToken = userData.token;
      if (!userToken) return;

      const [activeRes, upcomingRes, completedRes] = await Promise.all([
        axios.post(`${API_URL}/api/user/matches`, {
          creatorId: adminId,
          status: 'active',
        }),
        axios.post(`${API_URL}/api/user/matches`, {
          creatorId: adminId,
          status: 'upcoming',
        }),
        axios.post(`${API_URL}/api/user/matches`, {
          creatorId: adminId,
          status: 'completed',
        }),
      ]);

      const processedSlides: SlideData[] = [
        {...SLIDES_CONFIG[0], matches: completedRes.data.data || []},
        {...SLIDES_CONFIG[1], matches: activeRes.data.data || []},
        {...SLIDES_CONFIG[2], matches: upcomingRes.data.data || []},
      ];

      setSlides(processedSlides);
      joinMatchRooms(processedSlides);

      await loadTeamLogos([
        ...(activeRes.data.data || []),
        ...(upcomingRes.data.data || []),
        ...(completedRes.data.data || []),
      ]);

      for (const _match of processedSlides.find(s => s.status === 'upcoming')
        ?.matches || []) {
        try {
          const voteRes = await axios.get(
            `${API_URL}/api/mr/matches/upcoming/vote-stats`,
            {headers: {Authorization: `Bearer ${userToken}`}},
          );
          const fp: {[k: string]: {teamA: number; teamB: number}} = {};
          voteRes.data.data.forEach((m: any) => {
            fp[m.matchId] = {
              teamA: m.teams.teamA.percentage,
              teamB: m.teams.teamB.percentage,
            };
          });
          setPredictions(fp);
        } catch {}
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamLogos = async (matches: Match[]) => {
    const logos: {[k: string]: string} = {};
    for (const match of matches) {
      for (const team of match.teams) {
        if (team.teamName && !logos[team.teamName]) {
          const p = `${RNFS.DocumentDirectoryPath}/DIGI/100x100/${team.teamName}.png`;
          if (await RNFS.exists(p)) logos[team.teamName] = `file://${p}`;
        }
      }
    }
    setTeamLogos(logos);
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getDate()} ${dt.toLocaleString('en-US', {month: 'short'})}`;
  };
  const getDateRange = (s: string, e: string) =>
    `${formatDate(s)} - ${formatDate(e)}`;

  const spin = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const openDetailModal = (
    match: Match,
    st: 'active' | 'completed' | 'upcoming',
  ) => {
    setDetailMatch(match);
    setDetailStatus(st);
    setDetailVisible(true);
  };

  if (loading) {
    return (
      <Box height={300} justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" color="white" />
        <Text color="white" marginTop="m">
          Loading matches...
        </Text>
      </Box>
    );
  }

  return (
    <>
      <Box>
        <Animated.FlatList
          horizontal
          data={slides}
          ref={flatListRef}
          initialScrollIndex={1}
          getItemLayout={(_, index) => ({
            length: cardWidth + CARD_SPACING,
            offset: (cardWidth + CARD_SPACING) * index,
            index,
          })}
          keyExtractor={item => item.title}
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + CARD_SPACING}
          decelerationRate="fast"
          contentContainerStyle={{paddingHorizontal: (width - cardWidth) / 2.3}}
          onScroll={Animated.event(
            [{nativeEvent: {contentOffset: {x: scrollX}}}],
            {useNativeDriver: true},
          )}
          scrollEventThrottle={16}
          renderItem={({item, index}) => {
            const scale = scrollX.interpolate({
              inputRange: [
                (index - 1) * (cardWidth + CARD_SPACING),
                index * (cardWidth + CARD_SPACING),
                (index + 1) * (cardWidth + CARD_SPACING),
              ],
              outputRange: [0.95, 1, 0.95],
              extrapolate: 'clamp',
            });
            const isTappable =
              item.status === 'active' || item.status === 'completed';

            return (
              <Animated.View
                style={[styles.cardWrapper, {transform: [{scale}]}]}>
                <View style={styles.headerContainer}>
                  <ImageBackground
                    source={Assets.Home.Header1}
                    style={styles.leftHeaderIcon}
                    resizeMode="contain">
                    {item.status === 'active' ? (
                      <Animated.View style={{transform: [{rotate: spin}]}}>
                        <Text style={styles.ballEmoji}>⚽</Text>
                      </Animated.View>
                    ) : (
                      <Text style={styles.ballEmoji}>⚽</Text>
                    )}
                  </ImageBackground>
                  <ImageBackground
                    source={item.bgImg}
                    style={styles.headerBack}
                    resizeMode="stretch">
                    <Image
                      source={item.headerImg}
                      style={styles.headerImage}
                      resizeMode="contain"
                    />
                  </ImageBackground>
                  <Image
                    source={Assets.Home.Header3}
                    style={styles.rightHeaderIcon}
                    resizeMode="contain"
                  />
                  <Image
                    source={Assets.Home.Header3}
                    style={styles.rightHeaderIcon}
                    resizeMode="contain"
                  />
                </View>

                <LinearGradient
                  colors={['#c997ba99', '#c593b899', '#c293b499']}
                  style={styles.card}>
                  {item.matches.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>
                        No {item.title.toLowerCase()} matches
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={styles.scrollView}
                      showsVerticalScrollIndicator={false}>
                      {item.matches.map((match, i) => {
                        const teamA = match.teams[0];
                        const teamB = match.teams[1];
                        let winnerText = '';

                        if (item.status === 'completed') {
                          const diff = Math.abs(
                            (teamA?.goals || 0) - (teamB?.goals || 0),
                          );

                          if (teamA?.goals > teamB?.goals) {
                            winnerText = `${formatTeamName(
                              teamA.teamName,
                            )} won by ${diff} goal${diff > 1 ? 's' : ''}`;
                          } else if (teamB?.goals > teamA?.goals) {
                            winnerText = `${formatTeamName(
                              teamB.teamName,
                            )} won by ${diff} goal${diff > 1 ? 's' : ''}`;
                          } else {
                            winnerText = 'Match Draw';
                          }
                        }
                        const Wrapper: any = isTappable
                          ? TouchableOpacity
                          : View;
                        const wrapperProps = isTappable
                          ? {
                              activeOpacity: 0.75,
                              onPress: () =>
                                openDetailModal(match, item.status),
                            }
                          : {};

                        return (
                          <Wrapper
                            key={match.id}
                            {...wrapperProps}
                            style={[
                              styles.matchRow,
                              i === item.matches.length - 1 && {
                                borderBottomWidth: 0,
                              },
                            ]}>
                            <View style={styles.teamSide}>
                              <Text style={styles.date}>
                                {getDateRange(match.startTime, match.endTime)}
                              </Text>
                              <View style={styles.logoWrapper}>
                                <Shadow
                                  distance={12}
                                  offset={[0, 0]}
                                  containerStyle={styles.shadowContainer}
                                  style={styles.shadowRadius}>
                                  <Image
                                    source={
                                      teamLogos[teamA?.teamName]
                                        ? {uri: teamLogos[teamA.teamName]}
                                        : Assets.Home.Banglore
                                    }
                                    style={styles.logo}
                                  />
                                </Shadow>
                              </View>
                            </View>

                            <View style={styles.center}>
                              {item.status !== 'upcoming' && (
                                <Text style={styles.goalsLabel}>GOALS</Text>
                              )}

                              {item.status === 'upcoming' ? (
                                (() => {
                                  const p = predictions[match.id] || {
                                    teamA: 0,
                                    teamB: 0,
                                  };
                                  return (
                                    <>
                                      <View style={styles.percentRow}>
                                        <Text
                                          style={[
                                            styles.percentText,
                                            {color: '#ffa500'},
                                          ]}>
                                          {p.teamA}%
                                        </Text>
                                        <TouchableOpacity
                                          style={styles.titleWrapper}
                                          onPress={() => {
                                            setSelectedMatch(match);
                                            setPollVisible(true);
                                          }}>
                                          <Text style={styles.poll}>
                                            WIN PREDICTION POLL
                                          </Text>
                                        </TouchableOpacity>
                                        <Text
                                          style={[
                                            styles.percentText,
                                            {color: '#4da6ff'},
                                          ]}>
                                          {p.teamB}%
                                        </Text>
                                      </View>
                                      <Text style={styles.vote}>
                                        Tap to cast your vote
                                      </Text>
                                    </>
                                  );
                                })()
                              ) : (
                                <View style={styles.scoreContainer}>
                                  <View style={styles.scoreRow}>
                                    <Text style={styles.bigScore}>
                                      {teamA?.goals || 0}
                                    </Text>
                                    <Text style={styles.scoreSeparator}>:</Text>
                                    <Text style={styles.bigScore}>
                                      {teamB?.goals || 0}
                                    </Text>
                                  </View>

                                  {item.status === 'completed' && (
                                    <Text style={styles.winnerText}>
                                      {winnerText}
                                    </Text>
                                  )}
                                </View>
                              )}
                            </View>

                            <View style={styles.teamSide}>
                              <Text style={styles.matchNo}>
                                Match {match.matchId}
                              </Text>
                              <View style={styles.logoWrapper}>
                                <Shadow
                                  distance={12}
                                  offset={[0, 0]}
                                  containerStyle={styles.shadowContainer}
                                  style={styles.shadowRadius}>
                                  <Image
                                    source={
                                      teamLogos[teamB?.teamName]
                                        ? {uri: teamLogos[teamB.teamName]}
                                        : Assets.Home.Bhopal
                                    }
                                    style={styles.logo}
                                  />
                                </Shadow>
                              </View>
                            </View>
                          </Wrapper>
                        );
                      })}
                    </ScrollView>
                  )}
                </LinearGradient>
              </Animated.View>
            );
          }}
        />
      </Box>

      {/* ── Poll modal ── */}
      <Modal
        visible={pollVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPollVisible(false)}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#9e09e8', '#c278b5', '#a855a0']}
            style={styles.modalContent}>
            <TouchableOpacity
              style={styles.pollCloseBtn}
              onPress={() => {
                setVoteMessage('');
                setSelectedMatch(null);
                setSelectedTeamId(null);
                setPollVisible(false);
              }}>
              <RNText style={styles.pollCloseTxt}>✕</RNText>
            </TouchableOpacity>
            <RNText style={styles.modalSubtitle}>
              Select a team and cast your vote
            </RNText>
            {(voteMessage !== '' ||
              (selectedMatch && alreadyVoted[selectedMatch.id])) && (
              <RNText
                style={{
                  marginBottom: 10,
                  color:
                    voteMessage.includes('successfully') ||
                    (selectedMatch &&
                      alreadyVoted[selectedMatch.id] &&
                      voteMessage === '')
                      ? '#2E8B57'
                      : '#FF4444',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}>
                {alreadyVoted[selectedMatch?.id || ''] && voteMessage === ''
                  ? '✅ You have already voted for this match'
                  : voteMessage}
              </RNText>
            )}
            {selectedMatch && (
              <>
                <View style={styles.checkboxRow}>
                  {[0, 1].map(idx => (
                    <TouchableOpacity
                      key={idx}
                      disabled={voting || alreadyVoted[selectedMatch?.id || '']}
                      style={[
                        styles.checkboxTeamCard,
                        selectedTeamId === selectedMatch.teams[idx].flmId &&
                          styles.checkboxTeamCardSelected,
                        (voting || alreadyVoted[selectedMatch?.id || '']) && {
                          opacity: 0.5,
                        },
                      ]}
                      onPress={() =>
                        setSelectedTeamId(selectedMatch.teams[idx].flmId)
                      }>
                      <Image
                        source={
                          teamLogos[selectedMatch.teams[idx]?.teamName]
                            ? {
                                uri: teamLogos[
                                  selectedMatch.teams[idx].teamName
                                ],
                              }
                            : idx === 0
                            ? Assets.Home.Banglore
                            : Assets.Home.Bhopal
                        }
                        style={styles.voteLogo}
                      />
                      <RNText style={styles.voteTeamName}>
                        {formatTeamName(selectedMatch.teams[idx]?.teamName)}
                      </RNText>
                      <View
                        style={[
                          styles.checkbox,
                          selectedTeamId === selectedMatch.teams[idx].flmId &&
                            styles.checkboxChecked,
                        ]}>
                        {selectedTeamId === selectedMatch.teams[idx].flmId && (
                          <RNText style={styles.checkmark}>✓</RNText>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  disabled={
                    voting ||
                    !selectedTeamId ||
                    alreadyVoted[selectedMatch?.id || '']
                  }
                  style={[
                    styles.castVoteButton,
                    (!selectedTeamId ||
                      alreadyVoted[selectedMatch?.id || '']) && {opacity: 0.4},
                  ]}
                  onPress={() => {
                    if (selectedTeamId)
                      handleVote(selectedMatch.id, selectedTeamId);
                  }}>
                  <RNText style={styles.castVoteText}>
                    {voting ? 'Voting...' : 'Cast Vote'}
                  </RNText>
                </TouchableOpacity>
              </>
            )}
          </LinearGradient>
        </View>
      </Modal>

      {/* ✅ Detail modal */}
      <MatchDetailModal
        visible={detailVisible}
        match={detailMatch}
        status={detailStatus}
        teamLogos={teamLogos}
        token={token}
        stats={stats}
        onClose={() => setDetailVisible(false)}
        formatTeamName={formatTeamName}
      />
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: -24,
    alignSelf: 'center',
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  leftHeaderIcon: {
    width: 45,
    height: 45,
    marginRight: -10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  ballEmoji: {fontSize: 16},
  rightHeaderIcon: {width: 35, height: 45, marginLeft: -15},
  headerBack: {
    width: 190,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  winnerText: {
    color: '#fff',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 6,
    textAlign: 'center',
    opacity: 0.9,
  },
  headerImage: {width: 110, height: 20},
  cardWrapper: {
    width: cardWidth,
    marginHorizontal: CARD_SPACING / 2,
    marginTop: 30,
  },
  card: {borderRadius: 32, paddingTop: 6, paddingHorizontal: 6, height: 350},
  scrollView: {flex: 1},
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  teamSide: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  center: {flex: 2, alignItems: 'center', justifyContent: 'center'},
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigScore: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    marginHorizontal: 4,
  },
  scoreSeparator: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    opacity: 0.7,
  },
  pollCloseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pollCloseTxt: {color: '#fff', fontSize: 13, fontWeight: '700'},
  goalsLabel: {
    color: '#fff',
    fontSize: 9,
    fontStyle: 'italic',
    letterSpacing: 1.5,
    opacity: 0.9,
    marginBottom: 2,
    textAlign: 'center',
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  titleWrapper: {
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 95,
  },
  poll: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  percentText: {
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    marginTop: 12,
  },
  vote: {
    color: '#fff',
    fontSize: 10,
    opacity: 0.8,
    fontStyle: 'italic',
    marginTop: 10,
  },
  date: {color: '#fff', fontSize: 8, textAlign: 'center', marginBottom: 8},
  matchNo: {
    color: '#fff',
    fontSize: 8,
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.9,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    alignSelf: 'center',
  },
  shadowContainer: {borderRadius: 50, alignSelf: 'center'},
  shadowRadius: {borderRadius: 50, width: 45, height: 45},
  logo: {width: 48, height: 48, resizeMode: 'contain'},
  emptyContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyText: {color: '#fff', fontSize: 14, fontStyle: 'italic', opacity: 0.7},
  modalContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  modalContent: {
    width: '90%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    overflow: 'hidden',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#ffe0f7',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  checkboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
  },
  checkboxTeamCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  checkboxTeamCardSelected: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#aaa',
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {borderColor: '#6a0dad', backgroundColor: '#6a0dad'},
  checkmark: {color: '#fff', fontSize: 14, fontWeight: 'bold'},
  castVoteButton: {
    backgroundColor: '#6a0dad',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 10,
  },
  castVoteText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
  cancelButton: {marginTop: 6, paddingVertical: 8},
  cancelButtonText: {color: '#ffe0f7', fontSize: 13, textAlign: 'center'},
  voteLogo: {width: 80, height: 80, resizeMode: 'contain', marginBottom: 8},
  voteTeamName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#fff',
  },
});

export default MatchSlider;
