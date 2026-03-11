import React, {useEffect, useRef} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const {width} = Dimensions.get('window');

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

const ALERT_CONFIG: Record<AlertType, {icon: string; color: string; bg: string}> = {
  success: {icon: '✓', color: '#98069a', bg: 'rgba(74, 222, 128, 0.15)'},
  error:   {icon: '✕', color: '#d70f0f', bg: 'rgba(248, 113, 113, 0.15)'},
  warning: {icon: '!', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)'},
  info:    {icon: 'i', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)'},
};

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  type = 'info',
  title,
  message,
  buttons = [{text: 'OK'}],
  onDismiss,
}) => {
  const scaleAnim     = useRef(new Animated.Value(0.8)).current;
  const opacityAnim   = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(0)).current;

  const config = ALERT_CONFIG[type];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {toValue: 1, useNativeDriver: true, tension: 80, friction: 8}),
        Animated.timing(opacityAnim, {toValue: 1, duration: 200, useNativeDriver: true}),
      ]).start(() => {
        Animated.spring(iconScaleAnim, {toValue: 1, useNativeDriver: true, tension: 120, friction: 6}).start();
      });
    } else {
      iconScaleAnim.setValue(0);
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleButtonPress = (btn: AlertButton) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {toValue: 0.9, duration: 100, useNativeDriver: true}),
      Animated.timing(opacityAnim, {toValue: 0, duration: 150, useNativeDriver: true}),
    ]).start(() => {
      btn.onPress?.();
      onDismiss?.();
    });
  };

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, {opacity: opacityAnim}]}>
        <Animated.View
          style={[styles.cardWrap, {transform: [{scale: scaleAnim}], opacity: opacityAnim}]}>

          {/* ── Full gradient background ── */}
          <LinearGradient
            colors={['#e14593', '#7b2ed6']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.alertBox}>

            {/* Icon Circle */}
            <Animated.View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: config.bg,
                  borderColor: config.color + '55',
                  transform: [{scale: iconScaleAnim}],
                },
              ]}>
              <Text style={[styles.iconText, {color: config.color}]}>{config.icon}</Text>
            </Animated.View>

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Message */}
            <Text style={styles.message}>{message}</Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Buttons */}
            <View style={[styles.buttonRow, buttons.length === 1 && {justifyContent: 'center'}]}>
              {buttons.map((btn, idx) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel      = btn.style === 'cancel';
                const isPrimary     = !isDestructive && !isCancel;

                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleButtonPress(btn)}
                    activeOpacity={0.75}
                    style={[
                      styles.button,
                      buttons.length > 1 && {flex: 1},
                      idx < buttons.length - 1 && {marginRight: 8},
                      isPrimary     && styles.primaryButton,
                      isCancel      && styles.cancelButton,
                      isDestructive && styles.destructiveButton,
                    ]}>
                    <Text
                      style={[
                        styles.buttonText,
                        isPrimary     && {color: '#fff'},
                        isCancel      && {color: 'rgba(255,255,255,0.7)'},
                        isDestructive && {color: '#fca5a5'},
                      ]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Wrapper carries the shadow (shadow on Animated.View, not inside gradient)
  cardWrap: {
    width: width * 0.82,
    borderRadius: 24,
    shadowColor: '#7b2ed6',
    shadowOffset: {width: 0, height: 20},
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 20,
  },
  // LinearGradient is the full card surface
  alertBox: {
    borderRadius: 24,
    paddingTop: 32,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {fontSize: 28, fontWeight: '700'},
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  message: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginBottom: 16,
  },
  buttonRow: {flexDirection: 'row', width: '100%'},
  button: {
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 16,
  },
  primaryButton:    {backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.4)'},
  cancelButton:     {backgroundColor: 'rgba(0,0,0,0.15)',       borderColor: 'rgba(255,255,255,0.2)'},
  destructiveButton:{backgroundColor: 'rgba(248,113,113,0.2)',  borderColor: 'rgba(248,113,113,0.45)'},
  buttonText: {fontSize: 15, fontWeight: '600', letterSpacing: 0.2},
});

export default CustomAlert;
