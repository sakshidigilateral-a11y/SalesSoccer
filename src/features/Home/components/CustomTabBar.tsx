import React, {useState, useEffect, useCallback} from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ViewStyle,
  Image,
  ImageSourcePropType,
  Keyboard,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {Box} from '../../../components/themes';
import {Assets} from '../../../assets/images';

const {width} = Dimensions.get('window');

interface TabItem {
  name: string;
  icon: ImageSourcePropType;
  route: string;
}

const TABS: TabItem[] = [
  {name: 'Home', icon: Assets.Home.navHome, route: 'Home'},
  {name: 'Add', icon: Assets.Home.Add, route: 'Upload'},
  {name: 'Leaderboard', icon: Assets.Home.Awards, route: 'Leaderboard'},
  {name: 'Action', icon: Assets.Home.Like, route: 'Action'},
  {name: 'Notify', icon: Assets.Home.Notify, route: 'Notify'},
];

// 1. Define the component clearly
const CustomTabBarComponent = ({state, navigation}: BottomTabBarProps) => {
  const activeIndex = state.index;
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handlePress = useCallback(
    (routeName: string, index: number) => {
      // Safety check to ensure the route exists in the navigator state
      if (!state.routes[index]) return;

      const event = navigation.emit({
        type: 'tabPress',
        target: state.routes[index].key,
        canPreventDefault: true,
      });

      if (state.index !== index && !event.defaultPrevented) {
        navigation.navigate(routeName);
      }
    },
    [navigation, state],
  );

  if (isKeyboardVisible) return null;

  return (
    <Box style={styles.container}>
      <Box style={[StyleSheet.absoluteFill as ViewStyle, styles.background]} />

      {state.routes.map((route, index) => {
        const isActive = activeIndex === index;

        // Find matching icon from TABS config
        const matchedTab = TABS.find(tab => tab.route === route.name);

        if (!matchedTab) return null;

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={() => handlePress(route.name, index)}
            activeOpacity={0.7}>
            <LinearGradient
              colors={['#e14593', '#7b2ed6']}
              useAngle
              angle={145}
              style={[
                styles.gradientCircle,
                isActive && styles.activeGradient,
              ]}>
              <Image
                source={matchedTab.icon}
                fadeDuration={0}
                style={[
                  styles.iconImage,
                  matchedTab.icon === Assets.Home.Like && styles.largeIcon,
                  isActive && styles.activeIcon,
                ]}
              />
            </LinearGradient>

            {isActive && <Box style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 60,
    width: width,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 0,
    zIndex: 100,
  },
  background: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  gradientCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  activeGradient: {
    borderWidth: 1.5,
    borderColor: '#fff',
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width / 5,
  },
  iconImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  largeIcon: {
    width: 40,
    height: 40,
  },
  activeIcon: {
    width: 28,
    height: 28,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#fff',
    marginTop: 4,
    position: 'absolute',
    bottom: -10,
  },
});

// 2. Export the memoized version as DEFAULT
export default React.memo(CustomTabBarComponent);
