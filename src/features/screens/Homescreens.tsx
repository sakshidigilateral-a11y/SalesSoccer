import React from 'react';
import {
  StyleSheet,
  ImageBackground,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
  View,
} from 'react-native';
import {Assets} from '../../assets/images';
import {Box} from '../../components/themes';
import MatchSlider from '../Home/components/MatchSlider';
import PlayerHeader from '../Home/components/PlayerHeader';
import MatchSummary from '../Home/components/MatchSummary';
import LinearGradient from 'react-native-linear-gradient';

const {width} = Dimensions.get('window');

const HomeScreens = () => {
  return (
    <LinearGradient
      colors={['#3a0050', '#6a0080', '#8b005a', '#5a0040']}
      start={{x: 0.2, y: 0}}
      end={{x: 0.8, y: 1}}
      style={styles.root}>

      <StatusBar
        barStyle="light-content"
        backgroundColor="#000"
        translucent={false}      
      />

      <ImageBackground
        source={Assets.Common.background}
        style={styles.background}
        resizeMode="cover">

        <SafeAreaView style={styles.safeArea}>
          <Box style={styles.container}>
            <PlayerHeader />
            <MatchSummary />
            <Box flex={1}>
              <MatchSlider />
            </Box>
          </Box>
        </SafeAreaView>
      </ImageBackground>
    </LinearGradient>
  );
};

export default HomeScreens;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
  },
});
