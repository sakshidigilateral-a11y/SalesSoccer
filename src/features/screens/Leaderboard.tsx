import React, {useState, useEffect, useCallback} from 'react';
import {
  ImageBackground,
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNFS from 'react-native-fs';
import {Box, Text} from '../../components/themes';
import {Assets} from '../../assets/images';
import axios from 'axios';
import LinearGradient from 'react-native-linear-gradient';

const {width, height} = Dimensions.get('window');
const API_URL = 'https://salessoccer.digilateral.com';

type TabType = 'Player Rank' | 'Team Rank' | 'Compare Players';

// ── Dynamic types from API ──────────────────────────────────────────
interface WeekData {
  weekNumber: number;
  startDate: string;
  endDate: string;
  days: string[];
}

interface MonthData {
  year: number;
  month: number;
  monthName: string;
  weeks: WeekData[];
}

interface PlayerData {
  rank: number;
  mrId: string;
  playerName: string;
  teamName: string;
  flmId: string;
  flmName: string;
  goals: number;
  prescriptions: number;
  points: number;
}

interface TeamData {
  rank: number;
  flmId: string;
  flmName: string;
  teamName: string;
  totalMRs: number;
  goals: number;
  prescriptions: number;
  points: number;
}

interface ComparePlayerStats {
  mrId: string;
  mrName: string;
  teamName: string;
  totalGoals: number;
  avgGoals: number;
  totalPrescriptions: number;
  totalMatches: number;
  wins: number;
  fastestGoalTime: number | null;
  playerDuMatch: number;
  hrsPerGoal: number | null;
}

// ── helpers ─────────────────────────────────────────────────────────
const formatDateRange = (startDate: string, endDate: string): string => {
  const fmt = (d: string) => {
    const dt = new Date(d);
    return `${dt.getDate()} ${dt.toLocaleString('default', {month: 'short'})}`;
  };
  return `${fmt(startDate)} - ${fmt(endDate)}`;
};

// ────────────────────────────────────────────────────────────────────
const LeaderboardScreen = () => {
  const [activeTab, setActiveTab] = useState<TabType>('Player Rank');

  // dynamic month/week state
  const [months, setMonths] = useState<MonthData[]>([]);
  const [activeMonth, setActiveMonth] = useState<MonthData | null>(null);
  const [activeWeek, setActiveWeek] = useState<WeekData | null>(null);
  const [loadingPeriods, setLoadingPeriods] = useState(true);

  // leaderboard state
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [playerData, setPlayerData] = useState<PlayerData[]>([]);
  const [teamData, setTeamData] = useState<TeamData[]>([]);
  const [teamLogos, setTeamLogos] = useState<{[key: string]: string}>({});

  // compare state
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [selectingPlayer, setSelectingPlayer] = useState<1 | 2>(1);
  const [allPlayers, setAllPlayers] = useState<ComparePlayerStats[]>([]);
  const [player1, setPlayer1] = useState<ComparePlayerStats | null>(null);
  const [player2, setPlayer2] = useState<ComparePlayerStats | null>(null);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const tabs: TabType[] = ['Player Rank', 'Team Rank', 'Compare Players'];

  // ── 1. Fetch months & weeks on mount ───────────────────────────────
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        setLoadingPeriods(true);
        const res = await axios.get(`${API_URL}/api/mr/months-weeks-days`);
        if (res.data.success && Array.isArray(res.data.data?.months)) {
          const data: MonthData[] = res.data.data.months;
          setMonths(data);
          // default: All (no month filter)
          setActiveMonth(null);
          setActiveWeek(null);
        }
      } catch (err) {
        console.error('Error fetching periods:', err);
      } finally {
        setLoadingPeriods(false);
      }
    };
    fetchPeriods();
  }, []);

  // ── 2. Fetch leaderboard whenever tab / month / week changes ───────
  useEffect(() => {
    if (activeTab === 'Compare Players') {
      fetchPlayersForComparison();
    } else {
      fetchLeaderboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeMonth, activeWeek]);

  const buildParams = () => {
    if (!activeMonth) return {period: 'all'};
    if (activeWeek) {
      // week-level filter
      return {
        period: 'weekly',
        month: activeMonth.month,
        year: activeMonth.year,
        startDate: activeWeek.startDate,
        endDate: activeWeek.endDate,
      };
    }
    // month-level filter
    return {
      period: 'monthly',
      month: activeMonth.month,
      year: activeMonth.year,
    };
  };

  const fetchLeaderboardData = async (isRefreshing = false) => {
    try {
      isRefreshing ? setRefreshing(true) : setLoading(true);
      const params = buildParams();

      if (activeTab === 'Player Rank') {
        const res = await axios.get(`${API_URL}/api/mr/player-leaderboard`, {
          params,
        });
        if (res.data.success) {
          setPlayerData(res.data.data);
          await loadTeamLogos(res.data.data);
        }
      } else if (activeTab === 'Team Rank') {
        const res = await axios.get(`${API_URL}/api/mr/team-leaderboard`, {
          params,
        });
        if (res.data.success) {
          setTeamData(res.data.data);
          await loadTeamLogos(res.data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPlayersForComparison = async () => {
    try {
      setLoadingPlayers(true);
      const res = await axios.get(`${API_URL}/api/mr/players-compare`);
      if (res.data.success) {
        setAllPlayers(res.data.data);
        await loadTeamLogos(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching comparison players:', err);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const onRefresh = () => fetchLeaderboardData(true);

  const loadTeamLogos = async (data: any[]) => {
    const logos: {[key: string]: string} = {};
    for (const item of data) {
      const teamName = item.teamName;
      if (teamName && !logos[teamName]) {
        const logoPath = `${RNFS.DocumentDirectoryPath}/DIGI/100x100/${teamName}.png`;
        if (await RNFS.exists(logoPath)) {
          logos[teamName] = `file://${logoPath}`;
        }
      }
    }
    setTeamLogos(logos);
  };

  // ── month / week selection ──────────────────────────────────────────
  const handleMonthPress = (month: MonthData) => {
    // Always switch to the tapped month and clear week
    setActiveMonth(month);
    setActiveWeek(null);
  };

  const handleAllPress = () => {
    // "All" = no month filter
    setActiveMonth(null);
    setActiveWeek(null);
  };

  const handleWeekPress = (week: WeekData) => {
    if (activeWeek?.weekNumber === week.weekNumber) {
      // deselect week → back to full month
      setActiveWeek(null);
    } else {
      setActiveWeek(week);
    }
  };

  // ── compare helpers ─────────────────────────────────────────────────
  const handlePlayerSelect = (player: ComparePlayerStats) => {
    selectingPlayer === 1 ? setPlayer1(player) : setPlayer2(player);
    setShowPlayerModal(false);
  };

  const openPlayerSelector = (n: 1 | 2) => {
    setSelectingPlayer(n);
    setShowPlayerModal(true);
  };

  const getFilteredPlayers = () =>
    selectingPlayer === 1
      ? player2
        ? allPlayers.filter(p => p.mrId !== player2.mrId)
        : allPlayers
      : player1
      ? allPlayers.filter(p => p.mrId !== player1.mrId)
      : allPlayers;

  // ── render helpers ──────────────────────────────────────────────────
  const renderPlayerItem = ({item}: {item: PlayerData}) => (
    <View style={styles.playerRow}>
      <View style={styles.rankColumn}>
        <Text style={styles.rankText}>{item.rank}</Text>
      </View>
      <View style={styles.playerColumn}>
        <Text style={styles.playerNameText} numberOfLines={1}>
          {item.playerName}
        </Text>
      </View>
      <View style={styles.teamColumn}>
        {teamLogos[item.teamName] ? (
          <Image
            source={{uri: teamLogos[item.teamName]}}
            style={styles.teamLogo}
          />
        ) : (
          <View style={styles.teamLogoPlaceholder} />
        )}
      </View>
      <View style={styles.goalsColumn}>
        <Text style={styles.statsText}>
          {item.goals ? String(item.goals).slice(0, 4) : '0'}
        </Text>
      </View>
      <View style={styles.rxbpColumn}>
        <Text style={styles.statsText}>
          {item.prescriptions ? String(item.prescriptions).slice(0, 5) : '0'}
        </Text>
      </View>
    </View>
  );

  const renderTeamItem = ({item}: {item: TeamData}) => (
    <View style={styles.playerRow}>
      <View style={styles.rankColumn}>
        <Text style={styles.rankText}>{item.rank}</Text>
      </View>
      <View style={styles.playerColumn}>
        <Text style={styles.playerNameText} numberOfLines={1}>
          {item.teamName}
        </Text>
      </View>
      <View style={styles.teamColumn}>
        {teamLogos[item.teamName] ? (
          <Image
            source={{uri: teamLogos[item.teamName]}}
            style={styles.teamLogo}
          />
        ) : (
          <View style={styles.teamLogoPlaceholder} />
        )}
      </View>
      <View style={styles.goalsColumn}>
        <Text style={styles.statsText}>{item.goals}</Text>
      </View>
      <View style={styles.rxbpColumn}>
        <Text style={styles.statsText}>{item.prescriptions}</Text>
      </View>
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No data available</Text>
      <Text style={styles.emptySubText}>Pull down to refresh</Text>
    </View>
  );

  const safeNumber = (value: any, decimals = 0): string => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    const num = Number(value);
    return decimals > 0 ? num.toFixed(decimals) : Math.floor(num).toString();
  };

  const renderComparisonStat = (
    label: string,
    value1: number | string | null | undefined,
    value2: number | string | null | undefined,
  ) => {
    const num1 =
      value1 !== null && value1 !== undefined
        ? typeof value1 === 'string'
          ? parseFloat(value1) || 0
          : value1
        : 0;
    const num2 =
      value2 !== null && value2 !== undefined
        ? typeof value2 === 'string'
          ? parseFloat(value2) || 0
          : value2
        : 0;
    const total = num1 + num2;
    const percentage1 = total > 0 ? (num1 / total) * 100 : 50;
    const percentage2 = total > 0 ? (num2 / total) * 100 : 50;

    return (
      <View style={styles.comparisonRow}>
        <View style={styles.barSection}>
          <View style={styles.valueRow}>
            <Text style={styles.statValueLeft}>{value1 ?? 0}</Text>
            <Text style={styles.statLabelSport}>{label}</Text>
            <Text style={styles.statValueRight}>{value2 ?? 0}</Text>
          </View>
          <View style={styles.barWrapper}>
            <LinearGradient
              colors={['#6a0dad', '#c700a6']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.barTrack}
            />
            <LinearGradient
              colors={['#ff4ecd', '#c700a6']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={[styles.progressBarLeft, {width: `${percentage1}%`}]}
            />
            <LinearGradient
              colors={['#9d4edd', '#6a0dad']}
              start={{x: 1, y: 0}}
              end={{x: 0, y: 0}}
              style={[styles.progressBarRight, {width: `${percentage2}%`}]}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderCompareContent = () => {
    if (loadingPlayers) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      );
    }
    return (
      <ScrollView
        style={styles.compareContainer}
        contentContainerStyle={{paddingBottom: 100}}
        showsVerticalScrollIndicator={false}>
        <View style={styles.compareHeader}>
          <View>
            <Text style={styles.playerLabel}>Player 1</Text>
            <Image
              source={require('../../assets/images/common/ComparePlayerLabel.png')}
              style={styles.compareHeaderImage}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.playerLabel}>Player 2</Text>
            <Image
              source={require('../../assets/images/common/ComparePlayerLabel.png')}
              style={styles.compareHeaderImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.playerSelectionRow}>
          <TouchableOpacity
            style={styles.playerCard}
            onPress={() => openPlayerSelector(1)}>
            <View style={styles.playerCardGradient}>
              {/* Indicator line */}
              <View style={styles.player1Indicator} />

              {player1 ? (
                <View style={styles.selectedPlayerInfo}>
                  <Text style={styles.selectedPlayerName} numberOfLines={1}>
                    {player1.mrName.toUpperCase()}
                  </Text>

                  {teamLogos[player1.teamName] && (
                    <Image
                      source={{uri: teamLogos[player1.teamName]}}
                      style={styles.selectedTeamLogo}
                    />
                  )}

                  {/* Indicator line */}
                  <View style={styles.player1Line} />
                </View>
              ) : (
                <Text style={styles.selectText}>Tap to Select</Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playerCard}
            onPress={() => openPlayerSelector(2)}>
            <View style={styles.playerCardGradient}>
              {/* Indicator line */}
              <View style={styles.player2Indicator} />

              {player2 ? (
                <View style={styles.selectedPlayerInfo}>
                  <Text style={styles.selectedPlayerName} numberOfLines={1}>
                    {player2.mrName.toUpperCase()}
                  </Text>

                  {teamLogos[player2.teamName] && (
                    <Image
                      source={{uri: teamLogos[player2.teamName]}}
                      style={styles.selectedTeamLogo}
                    />
                  )}

                  {/* Indicator line */}
                  <View style={styles.player2Line} />
                </View>
              ) : (
                <Text style={styles.selectText}>Tap to Select</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {player1 && player2 && (
          <View style={styles.statsComparisonContainer}>
            {renderComparisonStat(
              'GOALS',
              player1.totalGoals,
              player2.totalGoals,
            )}
            {renderComparisonStat(
              'AVG. GOALS',
              safeNumber(player1.avgGoals, 1),
              safeNumber(player2.avgGoals, 1),
            )}
            {renderComparisonStat(
              'BALL POSSESSION (RXN)',
              player1.totalPrescriptions,
              player2.totalPrescriptions,
            )}
            {renderComparisonStat(
              'MATCHES',
              player1.totalMatches,
              player2.totalMatches,
            )}
            {renderComparisonStat('WON', player1.wins, player2.wins)}
            {renderComparisonStat(
              '⚡ FASTEST GOAL',
              safeNumber(player1.fastestGoalTime),
              safeNumber(player2.fastestGoalTime),
            )}
            {renderComparisonStat(
              "🏆 PLAYER DU' MATCH",
              player1.playerDuMatch,
              player2.playerDuMatch,
            )}
            {renderComparisonStat(
              '⏱ HRS PER GOAL',
              safeNumber(player1.hrsPerGoal),
              safeNumber(player2.hrsPerGoal),
            )}
          </View>
        )}

        {!player1 && !player2 && (
          <View style={styles.emptyCompareContainer}>
            <Text style={styles.emptyCompareText}>
              Select two players to compare their stats
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  // ── dynamic period rows ─────────────────────────────────────────────
  const renderPeriodRows = () => {
    if (loadingPeriods) {
      return (
        <View style={{paddingVertical: 10, alignItems: 'center'}}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      );
    }

    // short month names for the tab row
    const shortName = (m: MonthData) => m.monthName.slice(0, 3);
    const isMonthActive = (m: MonthData) =>
      activeMonth?.month === m.month && activeMonth?.year === m.year;

    // weeks of the currently selected month
    const currentWeeks = activeMonth?.weeks ?? [];

    return (
      <>
        {/* ── Month row ── */}
        <LinearGradient
          colors={['rgba(214,171,215,0.8)', 'rgba(57,12,89,0.5)']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.periodContainer}>
          {/* ALL button */}
          <TouchableOpacity
            style={[
              styles.periodButton,
              !activeMonth && styles.activePeriodButton,
            ]}
            onPress={handleAllPress}>
            <Text
              style={[
                styles.periodText,
                !activeMonth && styles.activePeriodText,
              ]}>
              All
            </Text>
          </TouchableOpacity>
          {months.map(m => (
            <TouchableOpacity
              key={`${m.year}-${m.month}`}
              style={[
                styles.periodButton,
                isMonthActive(m) && styles.activePeriodButton,
              ]}
              onPress={() => handleMonthPress(m)}>
              <Text
                style={[
                  styles.periodText,
                  isMonthActive(m) && styles.activePeriodText,
                ]}>
                {shortName(m)}
              </Text>
            </TouchableOpacity>
          ))}
        </LinearGradient>

        {/* ── Week date-range row (horizontal scroll) ── */}
        <LinearGradient
          colors={['rgba(214,171,215,0.8)', 'rgba(57,12,89,0.5)']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.weekContainer}>
          {currentWeeks.length === 0 ? (
            <Text style={styles.noWeekText}>— Select a month —</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekScrollContent}>
              {currentWeeks.map(w => {
                const isActive = activeWeek?.weekNumber === w.weekNumber;
                return (
                  <TouchableOpacity
                    key={w.weekNumber}
                    style={[
                      styles.weekButton,
                      isActive && styles.activeWeekButton,
                    ]}
                    onPress={() => handleWeekPress(w)}>
                    <Text
                      style={[
                        styles.dateRangeText,
                        isActive && styles.activeDateRangeText,
                      ]}>
                      {formatDateRange(w.startDate, w.endDate)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </LinearGradient>
      </>
    );
  };

  // ── main render ─────────────────────────────────────────────────────
  return (
    <ImageBackground source={Assets.Common.background} style={styles.container}>
      <Box flex={1} paddingTop="l">
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab !== 'Compare Players' && (
          <>
            {renderPeriodRows()}

            {/* Table Header */}
            <LinearGradient
              colors={['rgba(214,171,215,0.8)', 'rgba(57,12,89,0.5)']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.HeaderContainer}>
              <View style={styles.rankColumn}>
                <Text style={styles.headerText}>Rk</Text>
              </View>
              <View style={styles.playerColumn}>
                <Text style={styles.headerText}>
                  {activeTab === 'Player Rank' ? 'Players' : 'Team'}
                </Text>
              </View>
              <View style={styles.teamColumn}>
                <Text style={styles.headerText}>Team</Text>
              </View>
              <View style={styles.goalsColumn}>
                <Text style={styles.headerText}>Goals</Text>
              </View>
              <View style={styles.rxbpColumn}>
                <Text style={styles.headerText}>RxBP</Text>
              </View>
            </LinearGradient>
          </>
        )}

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : activeTab === 'Compare Players' ? (
          renderCompareContent()
        ) : (
          <FlatList
            data={activeTab === 'Player Rank' ? playerData : teamData}
            renderItem={
              activeTab === 'Player Rank' ? renderPlayerItem : renderTeamItem
            }
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyComponent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#fff']}
                tintColor="#fff"
                title="Pull to refresh"
                titleColor="#fff"
              />
            }
          />
        )}
      </Box>

      {/* Player Selection Modal */}
      <Modal
        visible={showPlayerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlayerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select Player {selectingPlayer}
              </Text>
              <TouchableOpacity
                onPress={() => setShowPlayerModal(false)}
                style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={getFilteredPlayers()}
              keyExtractor={item => item.mrId}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.modalPlayerItem}
                  onPress={() => handlePlayerSelect(item)}>
                  <View style={styles.modalPlayerInfo}>
                    {teamLogos[item.teamName] && (
                      <Image
                        source={{uri: teamLogos[item.teamName]}}
                        style={styles.modalTeamLogo}
                      />
                    )}
                    <View style={styles.modalPlayerDetails}>
                      <Text style={styles.modalPlayerName}>{item.mrName}</Text>
                      <Text style={styles.modalPlayerTeam}>
                        {item.teamName}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.modalPlayerGoals}>
                    {item.totalGoals} goals
                  </Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
};

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1},
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(106,13,173,0.5)',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tab: {flex: 1, alignItems: 'center', paddingVertical: 8},
  activeTab: {borderBottomWidth: 3, borderBottomColor: '#ff3f3f'},
  tabText: {color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600'},
  activeTabText: {color: '#fff', fontWeight: 'bold'},

  periodContainer: {
    flexDirection: 'row',
    paddingVertical: 1,
    paddingHorizontal: 8,
    marginBottom: 3,
  },
  weekContainer: {
    paddingVertical: 0,
    marginBottom: 3,
  },
  weekScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  player1Indicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#f606f2', // pink
  },
  player2Indicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#9105b0', // blue
  },
//   player1Line: {
//   height: 3,
//   width: '60%',
//   backgroundColor: '#ff4fa3',
//   marginTop: 6,
//   borderRadius: 3,
// },

// player2Line: {
//   height: 3,
//   width: '60%',
//   backgroundColor: '#3b82f6',
//   marginTop: 6,
//   borderRadius: 3,
// },
  noWeekText: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 4,
    opacity: 0.6,
  },
  HeaderContainer: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 3,
  },
  periodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  activePeriodButton: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
  },
  periodText: {color: '#fff', fontSize: 12, fontWeight: '400'},
  activePeriodText: {color: '#fff', fontWeight: 'bold', fontSize: 12},

  // week buttons
  weekButton: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  activeWeekButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderColor: '#fff',
    borderRadius: 8,
  },
  dateRangeText: {color: '#FFF', fontSize: 10, textAlign: 'center'},
  activeDateRangeText: {fontWeight: 'bold', fontSize: 11, color: '#fff'},

  headerText: {color: '#fff', fontSize: 10, textAlign: 'center'},
  rankColumn: {width: 40, justifyContent: 'center', alignItems: 'center'},
  playerColumn: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  teamColumn: {width: 50, justifyContent: 'center', alignItems: 'center'},
  goalsColumn: {width: 50, justifyContent: 'center', alignItems: 'center'},
  rxbpColumn: {width: 60, justifyContent: 'center', alignItems: 'center'},

  playerRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139,0,139,0.7)',
    paddingVertical: -6,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    marginBottom: 0.5,
  },
  rankText: {color: '#fff', fontSize: 10},
  playerNameText: {color: '#fff', fontSize: 14, textAlign: 'center'},
  teamLogo: {width: 40, height: 40, resizeMode: 'contain'},
  teamLogoPlaceholder: {
    width: 10,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  statsText: {color: '#fff', fontSize: 10},
  listContent: {paddingBottom: 100, flexGrow: 1},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {color: '#fff', fontSize: 18, fontWeight: 'bold'},
  emptySubText: {color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 8},

  // compare
  compareContainer: {flex: 1, padding: 14},
  compareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -35,
  },
  compareHeaderImage: {width: 150, height: 40, resizeMode: 'contain'},
  playerSelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  playerCard: {width: '48%', height: 140, borderRadius: 15, overflow: 'hidden'},
  playerCardGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(42,26,46,0.5)',
  },
  playerLabel: {color: '#FFF', fontSize: 12, top: 28, left: 50},
  selectedPlayerInfo: {alignItems: 'center'},
  selectedPlayerName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
  },
  selectedTeamLogo: {width: 50, height: 50, resizeMode: 'contain'},
  selectText: {color: 'rgba(255,255,255,0.6)', fontSize: 14},
  statsComparisonContainer: {
    backgroundColor: 'rgba(42,26,46,0.5)',
    borderRadius: 7,
    padding: 16,
  },
  comparisonRow: {marginBottom: 25},
  barSection: {paddingHorizontal: 10},
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  statValueLeft: {
    width: 36,
    textAlign: 'left',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  statValueRight: {
    width: 36,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabelSport: {
    fontFamily: 'Orbitron-Black',
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    color: '#fff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  barWrapper: {
    height: 5,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    marginHorizontal: 6,
  },
  barTrack: {
    position: 'absolute',
    width: '100%',
    height: 5,
    borderRadius: 10,
    opacity: 0.25,
  },
  progressBarLeft: {
    position: 'absolute',
    left: 0,
    height: 10,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  progressBarRight: {
    position: 'absolute',
    right: 0,
    height: 10,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  emptyCompareContainer: {marginTop: 100, alignItems: 'center'},
  emptyCompareText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
  },

  // modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.7,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {color: '#fff', fontSize: 18, fontWeight: 'bold'},
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {color: '#fff', fontSize: 18, fontWeight: 'bold'},
  modalPlayerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalPlayerInfo: {flexDirection: 'row', alignItems: 'center', flex: 1},
  modalTeamLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginRight: 12,
  },
  modalPlayerDetails: {flex: 1},
  modalPlayerName: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
  modalPlayerTeam: {color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2},
  modalPlayerGoals: {
    color: '#7b2ed6',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
  },

  activePeriodGradient: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LeaderboardScreen;
8;
