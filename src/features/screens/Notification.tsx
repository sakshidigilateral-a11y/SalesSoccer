import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ImageBackground,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {Assets} from '../../assets/images';
import CustomCalendar from '../Home/components/CustomCalender';
import {position} from '@shopify/restyle';
import AppStatusBar from '../Home/components/AppStatusBar';

const API_URL = 'https://salessoccer.digilateral.com';
const READ_IDS_KEY = 'notification_read_ids';

interface Notification {
  id: string;
  matchId: string;
  mrId: string;
  flmId: string | null;
  notificationType: 'movement' | 'goal';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

const getDateKey = (timestamp: string): string => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatTime = (timestamp: string): string => {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
};

const formatDisplayDate = (dateKey: string): string => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
  if (dateKey === toKey(today)) return 'Today';
  if (dateKey === toKey(yesterday)) return 'Yesterday';
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const loadReadIds = async (): Promise<Set<string>> => {
  try {
    const raw = await AsyncStorage.getItem(READ_IDS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
};

const saveReadIds = async (ids: Set<string>): Promise<void> => {
  try {
    await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids]));
  } catch {}
};

type ListItem =
  | {type: 'divider'; dateKey: string; label: string}
  | {type: 'notification'; data: Notification};

const buildFlatList = (notifications: Notification[]): ListItem[] => {
  if (!notifications.length) return [];
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const result: ListItem[] = [];
  let lastKey = '';
  for (const n of sorted) {
    const key = getDateKey(n.createdAt);
    if (key !== lastKey) {
      result.push({
        type: 'divider',
        dateKey: key,
        label: formatDisplayDate(key),
      });
      lastKey = key;
    }
    result.push({type: 'notification', data: n});
  }
  return result;
};

const highlightMessage = (message: string) => {
  const keywords = ['attacking', 'midfield', 'defensive', 'goal', 'GOAL', 'attack', 'defens'];
  const parts = message.split(
    /\b(attacking|midfield|defensive|goal|GOAL|attack|defens)\b/gi,
  );

  return parts.map((part, index) => {
    const isKeyword = keywords.some(
      kw => kw.toLowerCase() === part.toLowerCase(),
    );
    return isKeyword ? (
      <Text
        key={index}
        style={{
          fontFamily: 'Airstrike Bold',
          color: '#fff',
          fontSize: 13,
        }}>
        {part}
      </Text>
    ) : (
      <Text key={index} style={styles.cardMessage}>
        {part}
      </Text>
    );
  });
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const NotificationScreen = ({navigation}: {navigation: any}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [readIdsLoaded, setReadIdsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<'all' | 'movement' | 'goal'>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);

  const LIMIT = 20;

  const isReadLocally = (id: string) => readIds.has(id);

  const filteredNotifications = selectedDate
    ? notifications.filter(
        n => getDateKey(n.createdAt) === toDateKey(selectedDate),
      )
    : notifications;

  const totalUnread = filteredNotifications.filter(
    n => !isReadLocally(n.id),
  ).length;
  const listData = buildFlatList(filteredNotifications);

  useEffect(() => {
    loadReadIds().then(ids => {
      setReadIds(ids);
      setReadIdsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (readIdsLoaded) fetchNotifications(true);
  }, [filter, readIdsLoaded]);

  useEffect(() => {
    const blurUnsub = navigation.addListener('blur', () =>
      markAllCurrentAsRead(),
    );
    return () => blurUnsub();
  }, [navigation, notifications, readIds]);

  const markAllCurrentAsRead = async () => {
    const currentIds = await loadReadIds();
    let changed = false;
    69;
    for (const n of notifications) {
      if (!currentIds.has(n.id)) {
        currentIds.add(n.id);
        changed = true;
      }
    }
    if (!changed) return;
    setReadIds(new Set(currentIds));
    await saveReadIds(currentIds);
    try {
      await axios.put(`${API_URL}/api/mr/notifications/read-all`);
    } catch (_) {}
  };

  const fetchNotifications = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
        setOffset(0);
      } else setLoadingMore(true);
      const userData = await AsyncStorage.getItem('userData');
      const parsedData = JSON.parse(userData || '{}');
      const mrId = parsedData?.user?.id;
      if (!mrId) return;
      const params: any = {limit: LIMIT, offset: isInitialLoad ? 0 : offset};
      if (filter !== 'all') params.type = filter;
      const response = await axios.get(`${API_URL}/api/mr/tabNotification`, {
        params,
      });
      if (response.data.success) {
        const newNotifications: Notification[] = response.data.data;
        if (isInitialLoad) {
          setNotifications(newNotifications);
          setOffset(LIMIT);
        } else {
          setNotifications(prev => [...prev, ...newNotifications]);
          setOffset(prev => prev + LIMIT);
        }
        setHasMore(newNotifications.length === LIMIT);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setOffset(0);
    setHasMore(true);
    fetchNotifications(true);
  }, [filter]);

  const loadMore = () => {
    if (!loadingMore && hasMore && notifications.length >= LIMIT)
      fetchNotifications(false);
  };

  const handleNotificationTap = async (item: Notification) => {
    const updated = new Set(readIds);
    updated.add(item.id);
    setReadIds(updated);
    await saveReadIds(updated);
    try {
      await axios.put(`${API_URL}/api/mr/notifications/${item.id}/read`);
    } catch (_) {}
    navigation.navigate('NotificationDetail', {notification: item});
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'goal':
        return '⚽';

      case 'movement':
        return Assets.Home.Movement;

      default:
        return Assets.Home.Notification;
    }
  };
  const renderTopBar = () => (
    <View style={styles.topBar}>
      {/* Filter pills */}
      <View style={styles.pillGroup}>
        {(['all', 'goal', 'movement'] as const).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.pill, filter === f && styles.pillActive]}>
            <Text
              style={[styles.pillText, filter === f && styles.pillTextActive]}>
              {f === 'all' ? 'All' : f === 'goal' ? 'Goals' : 'Movement'}
            </Text>
            {/* {f === 'all' && totalUnread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{String(totalUnread)}</Text>
              </View>
            )} */}
          </TouchableOpacity>
        ))}
      </View>

      {/* Calendar button */}
      <TouchableOpacity
        onPress={() => setCalendarVisible(true)}
        style={[styles.calBtn, selectedDate && styles.calBtnActive]}>
        <Text style={styles.calBtnText}>
          {selectedDate
            ? `${String(selectedDate.getDate()).padStart(2, '0')} ${
                MONTH_NAMES[selectedDate.getMonth()]
              } ${selectedDate.getFullYear()}`
            : `${String(new Date().getDate()).padStart(2, '0')} ${
                MONTH_NAMES[new Date().getMonth()]
              } ${new Date().getFullYear()}`}
        </Text>

        {selectedDate && (
          <TouchableOpacity
            onPress={() => setSelectedDate(null)}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <MaterialIcons
              name="close"
              size={12}
              color="rgba(255,255,255,0.8)"
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderFlatItem = ({item}: {item: ListItem}) => {
    if (item.type === 'divider') {
      return (
        <View style={styles.dateDivider}>
          <View style={styles.dividerLine} />
          <View style={styles.datePill}>
            <Text style={styles.datePillText}>{item.label}</Text>
          </View>
          <View style={styles.dividerLine} />
        </View>
      );
    }

    const n = item.data;
    const read = isReadLocally(n.id);
    const icon = getNotificationIcon(n.notificationType);
    return (
      <TouchableOpacity
        onPress={() => handleNotificationTap(n)}
        activeOpacity={0.75}
        style={[styles.card, !read && styles.cardUnread]}>
        <AppStatusBar />

        <LinearGradient
          colors={
            n.notificationType === 'goal'
              ? ['#e14593', '#7b2ed6']
              : ['#7b2ed6', '#e14593']
          }
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.iconWrap}>
          {typeof icon === 'string' ? (
            <Text style={{fontSize: 12}}>{icon}</Text>
          ) : (
            <Image source={icon} style={{width: 10, height: 18}} />
          )}
        </LinearGradient>

        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {n.title}
            </Text>
          </View>
          <View style={styles.cardBottomRow}>
            <Text style={styles.cardMessage} numberOfLines={2}>
              {highlightMessage(n.message)}
            </Text>
            <Text style={styles.cardTime}>{formatTime(n.createdAt)}</Text>

            {!read && <View style={styles.unreadDot} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons
        name="notifications-none"
        size={48}
        color="rgba(255,255,255,0.25)"
      />
      <Text style={styles.emptyText}>No notifications</Text>
      <Text style={styles.emptySubtext}>
        {selectedDate
          ? 'No notifications on this date'
          : "You'll see match updates here"}
      </Text>
    </View>
  );

  const renderFooter = () =>
    loadingMore ? (
      <View style={styles.footerLoader}>
        <ActivityIndicator color="#e14593" size="small" />
      </View>
    ) : null;

  if (loading) {
    return (
      <ImageBackground
        source={Assets.Common.background}
        style={styles.root}
        resizeMode="cover">
        <LinearGradient
          colors={[
            'rgba(225,69,191,0.18)',
            'rgba(19,0,20,0.92)',
            'rgba(203,46,214,0.25)',
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={['rgb(225,69,209)', '#7b2ed6']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.headerGradient}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e14593" />
          <Text style={styles.loadingText}>Loading notifications…</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={Assets.Common.background}
      style={styles.root}
      resizeMode="cover">
      <LinearGradient
        colors={[
          'rgba(225,69,147,0.18)',
          'rgba(13,0,20,0.92)',
          'rgba(123,46,214,0.25)',
        ]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <LinearGradient
        colors={['rgb(225,69,209)', '#7b2ed6']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={styles.headerGradient}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </LinearGradient>

      {renderTopBar()}

      <View style={styles.mainContainer}>
        <FlatList
          data={listData}
          keyExtractor={(item, index) =>
            item.type === 'divider'
              ? `divider-${item.dateKey}`
              : `notif-${item.data.id}-${index}`
          }
          renderItem={renderFlatItem}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#e14593"
              colors={['#e14593', '#7b2ed6']}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <CustomCalendar
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        onSelect={d => {
          setSelectedDate(d);
          setCalendarVisible(false);
        }}
        maxDate={new Date()}
      />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#0D0014', paddingBottom: 45},

  headerGradient: {paddingVertical: 11},
  headerTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },

  // ── Single combined top bar ──────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 2,
  },
  pillGroup: {flexDirection: 'row', gap: 6, flex: 1},
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    gap: 4,
  },
  pillActive: {
    // backgroundColor: 'rgba(235, 230, 238, 0.55)',
    borderColor: 'rgba(167,139,250,0.7)',
  },
  pillText: {color: 'rgba(255,255,255,0.65)', fontFamily: 'Airstrike Bold'},
  pillTextActive: {fontFamily: 'Airstrike Bold'},
  badge: {
    backgroundColor: '#e14593',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {color: '#fff', fontSize: 9, fontWeight: '800'},

  calBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(225,69,147,0.4)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  calBtnActive: {
    backgroundColor: 'rgba(225,69,147,0.25)',
    borderColor: 'rgba(240, 61, 151, 0.7)',
  },
  calBtnText: {color: '#fff', fontSize: 11, fontWeight: '600'},

  mainContainer: {
    flex: 1,
    marginHorizontal: 6,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(136,6,138,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(195,8,202,0.08)',
    overflow: 'hidden',
  },
  listContent: {paddingBottom: 12},

  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dividerLine: {flex: 1, height: 1, backgroundColor: 'rgba(225,69,220,0.22)'},
  datePill: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    backgroundColor: 'rgba(225,69,147,0.18)',
    borderRadius: 10,
    marginHorizontal: 7,
    borderWidth: 1,
    borderColor: 'rgba(225,69,147,0.35)',
  },
  datePillText: {
    color: '#e44896',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Notification card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(225,69,220,0.22)',
    backgroundColor: 'transparent',
  },
  cardUnread: {backgroundColor: 'rgba(194,69,225,0.07)'},
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 10,
    flexShrink: 0,
    overflow: 'hidden',
  },
  cardContent: {flex: 1, top: 0},
  cardTopRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 3},
  cardTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    marginRight: 50,
  },
  cardTime: {
    width: 45,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'right',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardMessage: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 18,
    marginRight: 5,
    marginTop: -10,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e14593',
    marginBottom: 2,
    flexShrink: 0,
  },

  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loadingText: {color: '#fff', marginTop: 10, fontSize: 14},
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyText: {fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 12},
  emptySubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLoader: {paddingVertical: 14, alignItems: 'center'},
});

export default NotificationScreen;
