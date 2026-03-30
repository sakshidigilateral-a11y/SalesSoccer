import React, {useEffect} from 'react';
import {StatusBar, NativeModules, Platform} from 'react-native';

const AppStatusBar = () => {
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#3a0050');
      StatusBar.setTranslucent(false);
      StatusBar.setBarStyle('light-content');
    }
  }, []);

  return (
    <StatusBar
      backgroundColor="#3a0050"
      barStyle="light-content"
      translucent={false}
    />
  );
};

export default AppStatusBar;