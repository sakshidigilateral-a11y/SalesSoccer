import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';

const SplashScreen = ({ navigation }: any) => {
  const [showGif, setShowGif] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('Login');
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {showGif && (
        <FastImage
          source={require('../../assets/images/auth/Splashlogo.gif')}
          style={styles.logo}
          resizeMode={FastImage.resizeMode.contain}
        />
      )}
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 250,
    height: 250,
  },
});