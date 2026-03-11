// App.tsx
import 'react-native-gesture-handler';
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ThemeProvider} from '@shopify/restyle';
import {Provider, useSelector} from 'react-redux';
import {theme} from './src/components/themes';
import {LoginScreens} from './src/features/screens';
import Maintabs from './src/navigation/MainTabs';
import {store, persistor} from './src/redux/store';
import {RootState} from './src/redux/store';
import {PersistGate} from 'redux-persist/integration/react';
import AssetsDownloadPage from './src/features/screens/AssetsDownload';
import LeaderboardScreen from './src/features/screens/Leaderboard';
import NotificationScreen from './src/features/screens/Notification';
import SplashScreen from './src/features/screens/Splash';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );

  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoading ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : isAuthenticated ? (
        <Stack.Screen name="Maintabs" component={Maintabs} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreens} />
      )}

      <Stack.Screen
        name="AssetsDownload"
        component={AssetsDownloadPage}
      />
    </Stack.Navigator>
  );
};
const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider theme={theme}>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
