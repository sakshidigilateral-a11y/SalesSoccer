import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import CustomTabBar from '../features/Home/components/CustomTabBar';
import HomeScreens from '../features/screens/Homescreens';
import Uploadscreens from '../features/screens/Uploadscreens';
import LeaderboardScreen from '../features/screens/Leaderboard';
import Action from '../features/screens/Action';
import NotificationScreen from '../features/screens/Notification';
import {useSelector} from 'react-redux';
import {RootState} from '../redux/store';
import { SafeAreaProvider } from 'react-native-safe-area-context';


const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const role = useSelector((state: RootState) => state.auth.role);
  console.log('Redux Role:', role);
  console.log(
    'Full auth state:',
    useSelector((state: RootState) => state.auth),
  );
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        // This ensures the screen doesn't "jump" when the keyboard appears
        tabBarHideOnKeyboard: true,
      }}
      // Pass props correctly to your optimized memoized tab bar
      tabBar={props => <CustomTabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeScreens} />
      {/* IMPORTANT: The name "Upload" here must match exactly 
         what you navigate to in CustomTabBar handlePress 
      */}
      {role?.toUpperCase() === 'MR' && (
        <Tab.Screen name="Upload" component={Uploadscreens} />
      )}

      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Action" component={Action} />
      <Tab.Screen name="Notify" component={NotificationScreen} />
    </Tab.Navigator>
  );
};

export default MainTabs;
