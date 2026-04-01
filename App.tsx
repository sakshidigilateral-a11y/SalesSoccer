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
import SplashScreen from './src/features/screens/Splash';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {LogBox} from 'react-native';
import {Text, TextInput} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

// Disable warnings
LogBox.ignoreAllLogs(true);
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.allowFontScaling = false;

(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.allowFontScaling = false;
const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{flex: 1, backgroundColor: 'transparent'}}
        edges={['top', 'bottom', 'left', 'right']}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: {backgroundColor: 'transparent'},
            animation: 'fade', // optional smooth transition
          }}>
          {isLoading ? (
            <Stack.Screen name="Splash" component={SplashScreen} />
          ) : isAuthenticated ? (
            <Stack.Screen name="Maintabs" component={Maintabs} />
          ) : (
            <Stack.Screen name="Login" component={LoginScreens} />
          )}

          <Stack.Screen name="AssetsDownload" component={AssetsDownloadPage} />
        </Stack.Navigator>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider theme={theme}>
          <LinearGradient
            colors={['#b408f3', '#7b2ed6']}
            style={{flex: 1}}>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </LinearGradient>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
