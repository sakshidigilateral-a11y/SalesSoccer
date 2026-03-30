import React, {useRef, useCallback, useState, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  ViewToken,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AntdesignIcon from 'react-native-vector-icons/AntDesign';
import WheelScrollPicker from 'react-native-wheel-scrollview-picker';

const {width} = Dimensions.get('window');

const CALENDAR_WIDTH = width * 0.88;
const GRID_PADDING = 8;
const CELL_SIZE = Math.floor((CALENDAR_WIDTH - GRID_PADDING * 2) / 7);

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 7; // must be odd — centre row = selected
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const SPACER_COUNT = Math.floor(VISIBLE_ITEMS / 2); // items to pad top & bottom

interface CustomCalendarProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  maxDate?: Date;
  minDate?: Date;
}

// ─── DrumPicker ──────────────────────────────────────────────────────────────
// Uses FlatList with getItemLayout + snapToInterval for pixel-perfect snapping.
// onViewableItemsChanged fires reliably mid-scroll to track the centred item,
// completely eliminating the double-fire / jump glitch of onScrollEnd.
interface DrumPickerProps {
  data: string[];
  selectedIndex: number;
  onIndexChange: (idx: number) => void;
  keyPrefix: string;
} 

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 60,
};

const DrumPicker = ({data, selectedIndex, onIndexChange}: DrumPickerProps) => {
  return (
    <View style={{height: PICKER_HEIGHT, justifyContent: 'center'}}>
      <WheelScrollPicker
        dataSource={data}
        selectedIndex={selectedIndex}
        onValueChange={(data, index) => onIndexChange(index)}
        wrapperHeight={PICKER_HEIGHT}
        wrapperWidth={150}
        itemHeight={ITEM_HEIGHT}
        highlightColor="rgba(255,0,200,0.25)"
        highlightBorderWidth={2}
        wrapperBackground="transparent"
        itemBackground="transparent"
        renderItem={(data, index, isSelected) => {
          return (
            <View
              style={{
                height: ITEM_HEIGHT,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Text
                style={{
                  color: isSelected ? '#fff' : '#000',
                  fontSize: 16,
                  fontWeight: 'bold',
                }}>
                {data}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
};

const drumStyles = StyleSheet.create({
  wrapper: {
    height: PICKER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  itemTextSelected: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#fff',
  },
  band: {
    position: 'absolute',
    top: ITEM_HEIGHT * SPACER_COUNT,
    left: 10,
    right: 10,
    height: ITEM_HEIGHT,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: 'rgba(255, 0, 220, 0.75)',
    backgroundColor: 'rgba(255, 0, 200, 0.1)',
    borderRadius: 10,
    zIndex: 10,
  },
  mask: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * SPACER_COUNT,
    zIndex: 9,
  },
  maskTop: {
    // backgroundColor: 'rgba(60, 0, 110, 0.55)',
  },
  maskBottom: {
    //backgroundColor: 'rgba(173, 114, 221, 0.55)',
  },
});

// ─── Main Calendar ────────────────────────────────────────────────────────────
const CustomCalendar = ({
  visible,
  onClose,
  onSelect,
  maxDate = new Date(),
  minDate,
}: CustomCalendarProps) => {
  const today = new Date();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [picked, setPicked] = useState<Date | null>(null);
  const [view, setView] = useState<'calendar' | 'picker'>('calendar');

  useEffect(() => {
    if (visible) {
      const today = new Date();
      setPicked(today);
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
  }, [visible]);

  const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const currentYear = new Date().getFullYear();
  const minYear = minDate ? minDate.getFullYear() : currentYear - 100;
  const maxYear = currentYear; // only till current year

  const years = Array.from(
    {length: maxYear - minYear + 1},
    (_, i) => minYear + i,
  );
  const yearIndex = Math.max(0, years.indexOf(viewYear));

  const getDaysInMonth = (y: number, m: number) =>
    new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y: number, m: number) => new Date(y, m, 1).getDay();

  const prevMonth = () => {
    const newDate = new Date(viewYear, viewMonth - 1, 1);

    if (
      minDate &&
      newDate < new Date(minDate.getFullYear(), minDate.getMonth(), 1)
    ) {
      return;
    }

    setViewYear(newDate.getFullYear());
    setViewMonth(newDate.getMonth());
  };

  const nextMonth = () => {
    const newDate = new Date(viewYear, viewMonth + 1, 1);

    if (newDate > maxDate) {
      return;
    }

    setViewYear(newDate.getFullYear());
    setViewMonth(newDate.getMonth());
  };

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    return d > maxDate || (minDate ? d < minDate : false);
  };

  const isPicked = (day: number) =>
    !!picked &&
    picked.getDate() === day &&
    picked.getMonth() === viewMonth &&
    picked.getFullYear() === viewYear;

  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const totalDays = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({length: totalDays}, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = Array.from({length: cells.length / 7}, (_, i) =>
    cells.slice(i * 7, i * 7 + 7),
  );

  const handleClose = () => {
    setPicked(null);
    setView('calendar');
    onClose();
  };

  const handleConfirm = () => {
    if (!picked) return;
    onSelect(picked);
    handleClose();
  };

  const getPickedLabel = (): string => {
    if (!picked) return 'Select a date';
    return `${DAYS[picked.getDay()]}, ${picked.getDate()} ${MONTHS[
      picked.getMonth()
    ].slice(0, 3)}`;
  };

  // ── DRUM PICKER VIEW ──────────────────────────────────────────
  const renderPicker = () => (
    <LinearGradient
      colors={['#6a0dad', '#c700a6']}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.container}>
      <LinearGradient
        colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
        style={styles.header}>
        <Text style={styles.headerYear}>{String(viewYear)}</Text>
        <Text style={styles.headerDate}>{getPickedLabel()}</Text>
      </LinearGradient>

      <View style={styles.pickerLabels}>
        <Text style={styles.pickerLabelText}>{'MONTH'}</Text>
        <Text style={styles.pickerLabelText}>{'YEAR'}</Text>
      </View>

      <View style={styles.pickerRow}>
        <View
          style={{
            position: 'absolute',
            left: 10,
            right: 10,
            top: PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2,
            height: ITEM_HEIGHT,
            borderTopWidth: 1.5,
            borderBottomWidth: 1.5,
            borderColor: 'rgba(255,0,200,0.8)',
          }}
        />
        <LinearGradient
          colors={['#6a0dad', '#c700a6']}
          style={styles.pickerCol}>
          <DrumPicker
            keyPrefix="month"
            data={MONTHS}
            selectedIndex={viewMonth}
            onIndexChange={idx => setViewMonth(idx)}
          />
        </LinearGradient>
        <View style={styles.pickerDivider} />
        <LinearGradient
          colors={['#6a0dad', '#c700a6']}
          style={styles.pickerCol}>
          <DrumPicker
            data={years.map(String)}
            selectedIndex={yearIndex}
            onIndexChange={idx => {
              if (years[idx] <= currentYear) {
                setViewYear(years[idx]);
              }
            }}
          />
        </LinearGradient>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => setView('calendar')}
          style={styles.cancelBtn}>
          <Text style={styles.cancelText}>{'BACK'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setView('calendar')}
          style={styles.okBtn}>
          <Text style={styles.okText}>{'DONE'}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  // ── CALENDAR VIEW ─────────────────────────────────────────────
  const renderCalendar = () => (
    <LinearGradient
      colors={['#6a0dad', '#c700a6']}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.container}>
      <LinearGradient
        colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
        style={styles.header}>
        <Text style={styles.headerYear}>{String(viewYear)}</Text>
        <Text style={styles.headerDate}>{getPickedLabel()}</Text>
      </LinearGradient>

      <View style={styles.nav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <View style={styles.iconWrapper}>
            <AntdesignIcon name="left" size={16} color="#ff00ea" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navMonthBtn}
          onPress={() => {
            setView('picker');
          }}
          accessibilityRole="button"
          accessibilityLabel="Open month and year picker">
          <Text style={styles.navMonth}>
            {MONTHS[viewMonth]} {viewYear}
          </Text>
          <View style={[styles.iconWrapper, {marginLeft: 5}]}>
            <AntdesignIcon name="caretdown" size={9} color="#ff00ee" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <View style={styles.iconWrapper}>
            <AntdesignIcon name="right" size={16} color="#ff00fb" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {DAYS.map(d => (
          <View key={d} style={styles.cell}>
            <Text style={styles.weekLabel}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {rows.map((row, rIdx) => (
          <View key={`r${rIdx}`} style={styles.gridRow}>
            {row.map((day, cIdx) => {
              if (day === null)
                return <View key={`e${rIdx}${cIdx}`} style={styles.cell} />;
              const disabled = isDisabled(day);
              const selected = isPicked(day);
              const todayCell = isToday(day);
              return (
                <TouchableOpacity
                  key={`d${rIdx}${cIdx}`}
                  style={styles.cell}
                  disabled={disabled}
                  onPress={() => setPicked(new Date(viewYear, viewMonth, day))}>
                  <View
                    style={[
                      styles.dayCircle,
                      selected && styles.selectedCircle,
                      todayCell && !selected && styles.todayCircle,
                    ]}>
                    <Text
                      style={[
                        styles.dayText,
                        disabled && styles.disabledText,
                        selected && styles.selectedText,
                        todayCell && !selected && styles.todayText,
                      ]}>
                      {String(day)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>{'CANCEL'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleConfirm}
          style={[styles.okBtn, !picked && {opacity: 0.4}]}
          disabled={!picked}>
          <Text style={styles.okText}>{'OK'}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        {view === 'picker' ? renderPicker() : renderCalendar()}
      </View>
    </Modal>
  );
};

export default CustomCalendar;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: CALENDAR_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
  },
  header: {paddingHorizontal: 20, paddingVertical: 18},
  headerYear: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  headerDate: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 2,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  navBtn: {padding: 6},
  navMonthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  navMonth: {
    color: '#ff00ee',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  iconWrapper: {justifyContent: 'center', alignItems: 'center'},
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: GRID_PADDING,
    paddingTop: 10,
    paddingBottom: 4,
  },
  weekLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  grid: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 8,
    minHeight: CELL_SIZE * 7, // always space for 6 rows
  },
  gridRow: {flexDirection: 'row'},
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCircle: {backgroundColor: '#ff00c8'},
  todayCircle: {borderWidth: 1.5, borderColor: '#ff00c3'},
  dayText: {color: '#fff', fontSize: 13, fontWeight: '500'},
  disabledText: {color: 'rgba(255,255,255,0.2)'},
  selectedText: {color: '#000', fontWeight: 'bold'},
  todayText: {color: '#ff00e1', fontWeight: 'bold'},
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cancelBtn: {paddingVertical: 8, paddingHorizontal: 20},
  cancelText: {
    color: '#e699d5',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  okBtn: {paddingVertical: 8, paddingHorizontal: 20},
  okText: {
    color: '#e699d5',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  pickerLabels: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 2,
  },
  pickerLabelText: {
    flex: 1,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  pickerRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  pickerCol: {flex: 1},
  pickerDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 12,
  },
});
