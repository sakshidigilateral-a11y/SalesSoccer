import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SplashScreen = ({ navigation }: any) => {
 useEffect(() => {
  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('userToken');

    setTimeout(() => {
      if (token) {
        navigation.replace('Login'); 
      } else {
        navigation.replace('Login');
      }
    }, 1500);
  };

  checkAuth();
}, []);

  return (
    <View style={styles.container}>
      <FastImage
        source={require('../../assets/images/auth/Splashlogo.gif')}
        style={styles.logo}
        resizeMode={FastImage.resizeMode.contain}
      />
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