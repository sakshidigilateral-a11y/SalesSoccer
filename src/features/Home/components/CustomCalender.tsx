import React, {useState} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AntdesignIcon from 'react-native-vector-icons/AntDesign';

const {width} = Dimensions.get('window');

interface CustomCalendarProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  maxDate?: Date;
  minDate?: Date;
}

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
  const [showYearPicker, setShowYearPicker] = useState(false);

  const MONTHS = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December',
  ];
  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const maxYear = maxDate.getFullYear();
  const minYear = minDate ? minDate.getFullYear() : maxYear - 100;
  const years = Array.from(
    {length: maxYear - minYear + 1},
    (_, i) => maxYear - i,
  );

  const getDaysInMonth = (y: number, m: number) =>
    new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y: number, m: number) =>
    new Date(y, m, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    const next = new Date(viewYear, viewMonth + 1, 1);
    if (next > maxDate) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    const tooLate = d > maxDate;
    const tooEarly = minDate ? d < minDate : false;
    return tooLate || tooEarly;
  };

  const isPicked = (day: number) => {
    if (!picked) return false;
    return (
      picked.getDate() === day &&
      picked.getMonth() === viewMonth &&
      picked.getFullYear() === viewYear
    );
  };

  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const totalDays = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);
  const cells: (number | null)[] = Array(firstDay)
    .fill(null)
    .concat(Array.from({length: totalDays}, (_, i) => i + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  const handleClose = () => {
    setPicked(null);
    setShowYearPicker(false);
    onClose();
  };

  const handleConfirm = () => {
    if (!picked) return;
    onSelect(picked);
    handleClose();
  };

  // ── PICKED DATE LABEL ─────────────────────────────────────────
  // ✅ FIX: Build label string safely — no text outside <Text>
  const getPickedLabel = (): string => {
    if (!picked) return 'Select a date';
    const dayName = DAYS[new Date(picked).getDay()];
    const dayNum = picked.getDate();
    const monthName = MONTHS[picked.getMonth()].slice(0, 3);
    return `${dayName}, ${dayNum} ${monthName}`;
  };

  // ── YEAR PICKER VIEW ──────────────────────────────────────────
  const renderYearPicker = () => (
    <View style={styles.yearPickerWrapper}>
      <LinearGradient
        colors={['#6a0dad', '#4a0080']}
        style={styles.yearPickerBox}>

        {/* Header */}
        <View style={styles.yearPickerHeader}>
          {/* ✅ FIX: Text always inside <Text> component */}
          <Text style={styles.yearPickerTitle}>{'Select Year'}</Text>
          <TouchableOpacity
            onPress={() => setShowYearPicker(false)}
            accessible={true}
            accessibilityLabel="Close year picker"
            accessibilityRole="button">
            {/* ✅ FIX: Icon wrapped in View — no inline style on icon */}
            <View style={styles.iconWrapper}>
              <AntdesignIcon name="close" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Year List */}
        <FlatList
          data={years}
          keyExtractor={item => item.toString()}
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: 48,
            offset: 48 * index,
            index,
          })}
          initialScrollIndex={Math.max(0, years.indexOf(viewYear))}
          renderItem={({item}) => {
            const isSelected = item === viewYear;
            return (
              <TouchableOpacity
                onPress={() => {
                  setViewYear(item);
                  setShowYearPicker(false);
                }}
                style={[
                  styles.yearItem,
                  isSelected && styles.yearItemSelected,
                ]}
                accessible={true}
                accessibilityLabel={`Year ${item}`}
                accessibilityRole="button"
                accessibilityState={{selected: isSelected}}>
                {/* ✅ FIX: item is number — must be String() inside <Text> */}
                <Text
                  style={[
                    styles.yearItemText,
                    isSelected && styles.yearItemTextSelected,
                  ]}>
                  {String(item)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </LinearGradient>
    </View>
  );

  // ── CALENDAR VIEW ─────────────────────────────────────────────
  const renderCalendar = () => (
    <LinearGradient
      colors={['#6a0dad', '#c700a6']}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.container}>

      {/* ── HEADER ── */}
      <LinearGradient
        colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
        style={styles.header}>
        {/* ✅ FIX: viewYear is number — String() ensures safe render */}
        <Text style={styles.headerYear}>{String(viewYear)}</Text>
        <Text style={styles.headerDate}>{getPickedLabel()}</Text>
      </LinearGradient>

      {/* ── MONTH NAV ── */}
      <View style={styles.nav}>

        {/* Prev */}
        <TouchableOpacity
          onPress={prevMonth}
          style={styles.navBtn}
          accessible={true}
          accessibilityLabel="Previous month"
          accessibilityRole="button">
          <View style={styles.iconWrapper}>
            <AntdesignIcon name="left" size={16} color="#ff00ea" />
          </View>
        </TouchableOpacity>

        {/* Month + Year label — tappable to open year picker */}
        <TouchableOpacity
          onPress={() => setShowYearPicker(true)}
          style={styles.navMonthBtn}
          accessible={true}
          accessibilityLabel={`${MONTHS[viewMonth]} ${viewYear}, tap to select year`}
          accessibilityRole="button">
          {/* ✅ FIX: All text in one <Text>, no mixed children */}
          <Text style={styles.navMonth}>
            {`${MONTHS[viewMonth]} ${String(viewYear)}`}
          </Text>
          {/* ✅ FIX: Icon in its own View, no style prop on icon directly */}
          <View style={styles.caretWrapper}>
            <AntdesignIcon name="caretdown" size={10} color="#ff00b7" />
          </View>
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity
          onPress={nextMonth}
          style={styles.navBtn}
          accessible={true}
          accessibilityLabel="Next month"
          accessibilityRole="button">
          <View style={styles.iconWrapper}>
            <AntdesignIcon name="right" size={16} color="#ff00fb" />
          </View>
        </TouchableOpacity>

      </View>

      {/* ── DAY LABELS ── */}
      <View style={styles.weekRow}>
        {DAYS.map(d => (
          // ✅ FIX: Each day label is a plain string in its own <Text>
          <Text key={d} style={styles.weekLabel}>
            {d}
          </Text>
        ))}
      </View>

      {/* ── GRID ── */}
      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (day === null) {
            return <View key={`empty-${idx}`} style={styles.cell} />;
          }
          const disabled = isDisabled(day);
          const selected = isPicked(day);
          const todayCell = isToday(day);
          return (
            <TouchableOpacity
              key={`day-${idx}`}
              style={styles.cell}
              disabled={disabled}
              onPress={() => setPicked(new Date(viewYear, viewMonth, day))}
              accessible={true}
              accessibilityLabel={
                `${String(day)} ${MONTHS[viewMonth]} ${String(viewYear)}` +
                (todayCell ? ', today' : '')
              }
              accessibilityRole="button"
              accessibilityState={{
                disabled: disabled,
                selected: selected,
              }}>
              <View
                style={[
                  styles.dayCircle,
                  selected && styles.selectedCircle,
                  todayCell && !selected && styles.todayCircle,
                ]}>
                {/* ✅ FIX: day is number — String() prevents "text not in Text" */}
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

      {/* ── FOOTER ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.cancelBtn}
          accessible={true}
          accessibilityLabel="Cancel"
          accessibilityRole="button">
          <Text style={styles.cancelText}>{'CANCEL'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleConfirm}
          style={[styles.okBtn, !picked && {opacity: 0.4}]}
          disabled={!picked}
          accessible={true}
          accessibilityLabel="Confirm selected date"
          accessibilityRole="button"
          accessibilityState={{disabled: !picked}}>
          <Text style={styles.okText}>{'OK'}</Text>
        </TouchableOpacity>
      </View>

    </LinearGradient>
  );

  // ── SINGLE MODAL ──────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        {showYearPicker ? renderYearPicker() : renderCalendar()}
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
    width: width * 0.88,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
  },

  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerYear: {
    color: 'rgba(255,255,255,0.7)',
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

  // ── Nav ──
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  navBtn: {
    padding: 6,
  },
  navMonthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navMonth: {
    color: '#ff00ee',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // ✅ Caret icon sits in its own View with marginLeft
  caretWrapper: {
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ✅ Generic icon wrapper — replaces inline style on AntdesignIcon
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Week Labels ──
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Grid ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCircle: {
    backgroundColor: '#ff00c8',
  },
  todayCircle: {
    borderWidth: 1.5,
    borderColor: '#ff00c3',
  },
  dayText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  disabledText: {
    color: 'rgba(255,255,255,0.2)',
  },
  selectedText: {
    color: '#000',
    fontWeight: 'bold',
  },
  todayText: {
    color: '#ff00e1',
    fontWeight: 'bold',
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  cancelText: {
    color: '#ff00bf',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  okBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  okText: {
    color: '#ff00c8',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // ── Year Picker ──
  yearPickerWrapper: {
    width: width * 0.65,
    maxHeight: 380,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
  },
  yearPickerBox: {
    flex: 1,
  },
  yearPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  yearPickerTitle: {
    color: '#ff00c3',
    fontSize: 15,
    fontWeight: '700',
  },
  yearItem: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  yearItemSelected: {
    backgroundColor: '#ff00a2',
  },
  yearItemText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  yearItemTextSelected: {
    color: '#000',
    fontWeight: 'bold',
  },
});
