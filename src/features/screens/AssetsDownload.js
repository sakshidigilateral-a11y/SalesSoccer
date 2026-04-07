import {
  View,
  Text,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FastImage from 'react-native-fast-image';
import * as RNFS from 'react-native-fs';
import DeviceInfo from 'react-native-device-info';
import {LinearGradient} from 'react-native-linear-gradient';

const API_URL = 'http://192.168.1.7:5450';

const TEAM_NAMES = [
  // 'AndhraBlasters',
  // 'BangaloreIndians',
  // 'BhopalTitans',
  // 'ChennaiSuperstars',
  // 'CuttackGladiators',
  // 'DelhiFighters',
  // 'GujaratCommandos',
  // 'GuwahatiChampions',
  // 'HyderabadNawabs',
  // 'KeralaRiders',
  // 'KolkataInvincibles',
  // 'LucknowRoyals',
  // 'MumbaiRunners',
  // 'NagpurLegends',
  // 'PatnaKings',
  // 'PuneWarriors',
  // 'PunjabGiants',
  // 'RaipurChallengers',
  // 'RajasthanStormers',
  // 'RanchiDaredevils',

  'BANGALORECHALLENGERS',
  'CHENNAIKINGS',
  'ERNAKULLAMACHIEVERS',
  'GUJARATTITANS',
  'HUBLIHEROES',
  'INDORETIGERS',
  'LUCKNOWGIANTS',
  'NAGPURBULLS',
  'PUNERIPALTON',
  'RAJASTHANROYALS',
  'BURDWANBIGGIES',
  'DELHICAPITALS',
  'GHAZIABADYODDHA',
  'GUWAHATIGUARDIANS',
  'HYDERABADRISERS',
  'KOLKATASPARTANS',
  'MUMBAIINDIANS',
  'PATNAPIRATES',
  'PUNJABPANTHERS',
  'VIJAYAWADAWARRIORS',
];

const LOADING_MESSAGES = [
  ' Match is ready!',
  ' Stadium is ready!',
  ' Players are warming up...',
  ' Setting up the lineup...',
  ' Kits are being prepared...',
  ' Trophy is polished!',
  ' Fans are arriving...',
  ' Pitch is perfectly mowed!',
  ' Goalkeeper is ready!',
  ' Goal nets are up!',
  ' Referee is on the field!',
  ' Cameras are rolling!',
  ' Players are sprinting in!',
  ' The goals are set!',
  ' Kickoff in moments...',
];

export default function AssetsDownloadPage({navigation}) {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Preparing download...');
  const footballAnim = useRef(new Animated.Value(0)).current; // JS driver — drives left/width
  const ballRotation = useRef(new Animated.Value(0)).current; // native driver — drives rotation only
  const messageIndexRef = useRef(0);
  // const messageIntervalRef = useRef(null);
  const rotationLoopRef = useRef(null);

  // Rotate through fun loading messages
  useEffect(() => {
    if (downloadProgress < 10) {
      setStatusMessage('Match is ready!');
    } else if (downloadProgress < 20) {
      setStatusMessage('Stadium is ready!');
    } else if (downloadProgress < 30) {
      setStatusMessage(' Players are warming up...');
    } else if (downloadProgress < 40) {
      setStatusMessage(' Setting up the lineup...');
    } else if (downloadProgress < 50) {
      setStatusMessage(' Kits are being prepared...');
    } else if (downloadProgress < 60) {
      setStatusMessage(' Trophy is polished!');
    } else if (downloadProgress < 70) {
      setStatusMessage(' Fans are arriving...');
    } else if (downloadProgress < 80) {
      setStatusMessage('Pitch is perfectly mowed!');
    } else if (downloadProgress < 90) {
      setStatusMessage(' Goalkeeper is ready!');
    } else if (downloadProgress < 100) {
      setStatusMessage(' Kickoff in moments...');
    } else {
      setStatusMessage(" All set! Let's play!");
    }
  }, [downloadProgress]);

  // Continuous ball rotation
  useEffect(() => {
    const startRotation = () => {
      ballRotation.setValue(0);
      rotationLoopRef.current = Animated.loop(
        Animated.timing(ballRotation, {
          toValue: 1,
          duration: 600,
          easing: Easing.linear,
          useNativeDriver: true, // ✅ rotation only — safe with native driver
        }),
      );
      rotationLoopRef.current.start();
    };
    startRotation();
    return () => {
      if (rotationLoopRef.current) rotationLoopRef.current.stop();
    };
  }, []);

  // Keep football position in sync with downloadProgress
  useEffect(() => {
   Animated.timing(footballAnim, {
  toValue: downloadProgress,
  duration: 800, // smoother
  easing: Easing.out(Easing.ease),
  useNativeDriver: false,
}).start();
  }, [downloadProgress]);

  const downloadImage = async (url, folder, subfolder, fileName) => {
    try {
      const folderPath = `${RNFS.DocumentDirectoryPath}/${folder}/${subfolder}`;
      const filePath = `${folderPath}/${fileName}`;

      if (!(await RNFS.exists(folderPath))) {
        await RNFS.mkdir(folderPath);
      }

      if (await RNFS.exists(filePath)) {
        console.log(`⏭️ Skipped (exists): ${fileName}`);
        return true;
      }

      const result = RNFS.downloadFile({
        fromUrl: url,
        toFile: filePath,
        progressInterval: 10,
        progressDivider: 1200,
      });

      const downloadResult = await result.promise;

      if (downloadResult.statusCode === 200) {
        console.log(`✅ Downloaded: ${fileName} to ${subfolder}`);
        return true;
      } else {
        console.error(`❌ Download failed for ${fileName}`);
        return false;
      }
    } catch (error) {
      console.error('Error downloading:', fileName, error);
      return false;
    }
  };
  const downloadingRef = useRef(false);
  useEffect(() => {
    const startDownload = async () => {
       if (downloadingRef.current) return;
        downloadingRef.current = true;
      try {
        const baseUrl = `${API_URL}/DIGI`;
        const localBasePath = `${RNFS.DocumentDirectoryPath}/DIGI`;

        const teamName = await AsyncStorage.getItem('teamName');
        const assetsDownloaded = await AsyncStorage.getItem(
          `assetsDownloaded_${teamName}`,
        );

        if (assetsDownloaded === 'true' && (await RNFS.exists(localBasePath))) {
          console.log('✅ Assets already exist');
          setDownloadProgress(100);
          setStatusMessage('🎉 Assets already downloaded!');
          setTimeout(() => navigation.replace('Maintabs'), 500);
          return;
        }

        if (!(await RNFS.exists(localBasePath))) {
          await RNFS.mkdir(localBasePath);
        }
        await RNFS.mkdir(`${localBasePath}/200x200`);
        await RNFS.mkdir(`${localBasePath}/100x100`);

        const sizes = ['200x200', '100x100'];
        let filesToDownload = [];

        TEAM_NAMES.forEach(teamName => {
          sizes.forEach(size => {
            filesToDownload.push({fileName: `${teamName}.png`, size});
          });
        });

        const totalFiles = filesToDownload.length;
        let downloadedCount = 0;

        console.log(`📥 Starting download of ${totalFiles} files...`);

        for (const file of filesToDownload) {
          const url = `${baseUrl}/${file.size}/${file.fileName}`;
          await downloadImage(url, 'DIGI', file.size, file.fileName);
          downloadedCount++;
          const progress = (downloadedCount / totalFiles) * 100;
          setDownloadProgress(progress);
          console.log(`Progress: ${progress.toFixed(0)}%`);
        }
      
        console.log(
          `🎉 Download complete! Downloaded ${downloadedCount}/${totalFiles}`,
        );
        setDownloadProgress(100);
        // clearInterval(messageIntervalRef.current);
        setStatusMessage(" All set! Let's play!");

        await AsyncStorage.setItem(`assetsDownloaded_${teamName}`, 'true');

        setTimeout(() => {
          navigation.replace('Maintabs');
        }, 500);
      } catch (error) {
        console.error('Download failed:', error);
        setStatusMessage('❌ Download failed. Retrying...');
        setTimeout(() => {
          //  navigation.replace('AssetsDownload');
        }, 2000);
      }
    };

    startDownload();
  }, []);

  const TRACK_WIDTH = 250;
  const BALL_SIZE = 32;

  const ballLeft = footballAnim.interpolate({
    inputRange: [0, 100],
   outputRange: [0, TRACK_WIDTH - BALL_SIZE + 6],
    extrapolate: 'clamp',
  });

  const fillWidth = footballAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const rotateDeg = ballRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <ImageBackground
      source={require('../../assets/images/common/background.webp')}
      style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}
      resizeMode="cover">
      <View style={{flex: 1, justifyContent: 'center', marginTop: 110}}>
        <FastImage
          source={require('../../assets/images/auth/SoccerLogo.png')}
          style={{height: 500}}
          resizeMode="contain"
        />
        <StatusBar hidden={false} backgroundColor={'black'} />
        <SafeAreaView
          style={{
            width: TRACK_WIDTH,
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'center',
            alignSelf: 'center',
            marginBottom: 80,
          }}>
          {/* Fun loading message */}
          <Text
            style={{
              color: 'white',
              marginBottom: 6,
              fontSize: 14,
              fontWeight: '600',
              textAlign: 'center',
              textShadowColor: 'rgba(0,0,0,0.8)',
              textShadowOffset: {width: 0, height: 1},
              textShadowRadius: 4,
            }}>
            {statusMessage}
          </Text>

          {/* ── Progress track ── */}
          <View
            style={{
              width: TRACK_WIDTH,
              height: 44,
              justifyContent: 'center',
            }}>
            {/* Track shell — pink border */}
            <View
              style={{
                height: 16,
                width: '100%',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 8,
                borderWidth: 2,
                borderColor: '#ff1bce',
                overflow: 'hidden',
                justifyContent: 'center',
              }}>
              {/* Purple-to-pink gradient fill */}
              <Animated.View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 4,
                  bottom: 0,
                  width: fillWidth,
                  borderRadius: 8,
                  overflow: 'hidden',
                }}>
                <LinearGradient
                  colors={['#c700a6', '#7b2ed6', '#3d00b8']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>

              {/* Yard lines */}
              {[25, 50, 75].map(pct => (
                <View
                  key={pct}
                  style={{
                    position: 'absolute',
                    left: `${pct}%`,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </View>

            <Animated.View
              style={{
                position: 'absolute',
                left: ballLeft,
               top: 6,
                width: BALL_SIZE,
                height: BALL_SIZE,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              {/* Inner view handles ROTATION — native driver */}
              <Animated.View
                style={{
                  transform: [{rotate: rotateDeg}],
                }}>
                <Text style={{fontSize: 28, opacity: 8}}>⚽</Text>
              </Animated.View>
            </Animated.View>
          </View>

          {/* Percentage */}
          <Text
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 13,
              marginTop: 2,
              fontWeight: '700',
              letterSpacing: 1,
            }}>
            {downloadProgress.toFixed(0)}%
          </Text>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({});
