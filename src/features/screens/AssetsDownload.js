import {
  View,
  Text,
  ImageBackground,
  SafeAreaView,
  Image,
  StatusBar,
  StyleSheet,
  Animated,
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FastImage from 'react-native-fast-image';
import * as RNFS from 'react-native-fs';
import DeviceInfo from 'react-native-device-info';
// import {BASE} from '../config'; // Your API base URL
// import bgimage from '../../assets/images/common/background.webp';

const API_URL = 'https://salessoccer.digilateral.com'

const TEAM_NAMES = [
  'AndhraBlasters',
  'BangaloreIndians',
  'BhopalTitans',
  'ChennaiSuperstars',
  'CuttackGladiators',
  'DelhiFighters',
  'GujaratCommandos',
  'GuwahatiChampions',
  'HyderabadNawabs',
  'KeralaRiders',
  'KolkataInvincibles',
  'LucknowRoyals',
  'MumbaiRunners',
  'NagpurLegends',
  'PatnaKings',
  'PuneWarriors',
  'PunjabGiants',
  'RaipurChallengers',
  'RajasthanStormers',
  'RanchiDaredevils',
  // 'SouthThalaivas',
  // 'WestWarriors',
  // 'NorthDabangs',
  // 'EastTigers',
];

// const SPECIAL_FILES = [
//   'MOM.png',
//   'NoMatch.png',
//   'upcomingMatch.png',
//   'MatchWinnerBanner.png',
//   'ManOfTheMatchBanner.png',
// ];

export default function AssetsDownloadPage({navigation}) {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Preparing download...');

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

  useEffect(() => {
    const startDownload = async () => {
      try {
        const baseUrl = `${API_URL}/DIGI`; // e.g., http://192.168.1.19:5450/assets/DIGI
        const localBasePath = `${RNFS.DocumentDirectoryPath}/DIGI`;

        // Check if assets already downloaded
        const assetsDownloaded = await AsyncStorage.getItem('assetsDownloaded');
        
        if (assetsDownloaded === 'true' && (await RNFS.exists(localBasePath))) {
          console.log('✅ Assets already exist');
          setDownloadProgress(100);
          setStatusMessage('Assets already downloaded');
          setTimeout(() => navigation.replace('Home'), 500);
          return;
        }

        // Create directories
        setStatusMessage('Creating directories...');
        if (!(await RNFS.exists(localBasePath))) {
          await RNFS.mkdir(localBasePath);
        }
        await RNFS.mkdir(`${localBasePath}/200x200`);
        await RNFS.mkdir(`${localBasePath}/100x100`);

        const sizes = ['200x200', '100x100'];
        let filesToDownload = [];

        // Build download list
        TEAM_NAMES.forEach(teamName => {
          sizes.forEach(size => {
            filesToDownload.push({
              fileName: `${teamName}.png`,
              size,
            });
          });
        });

        // SPECIAL_FILES.forEach(fileName => {
        //   sizes.forEach(size => {
        //     filesToDownload.push({
        //       fileName,
        //       size,
        //     });
        //   });
        // });

        const totalFiles = filesToDownload.length;
        let downloadedCount = 0;

        console.log(`📥 Starting download of ${totalFiles} files...`);
        setStatusMessage(`Downloading ${totalFiles} files...`);

        // Download all files
        for (const file of filesToDownload) {
          const url = `${baseUrl}/${file.size}/${file.fileName}`;
          const success = await downloadImage(
            url,
            'DIGI',
            file.size,
            file.fileName,
          );

          downloadedCount++;
          const progress = (downloadedCount / totalFiles) * 100;
          setDownloadProgress(progress);
          setStatusMessage(
            `Downloaded ${downloadedCount}/${totalFiles} files`,
          );
          console.log(`Progress: ${progress.toFixed(0)}%`);
        }

        console.log(
          `🎉 Download complete! Downloaded ${downloadedCount}/${totalFiles}`,
        );
        setDownloadProgress(100);
        setStatusMessage('Download complete!');

        // Mark assets as downloaded
        await AsyncStorage.setItem('assetsDownloaded', 'true');

        setTimeout(() => {
          navigation.replace('Maintabs');
        }, 500);
      } catch (error) {
        console.error('Download failed:', error);
        setStatusMessage('Download failed. Retrying...');
        
        // Retry after 2 seconds
        setTimeout(() => {
          navigation.replace('AssetsDownload');
        }, 2000);
      }
    };

    startDownload();
  }, [navigation]);

  return (
    <ImageBackground
      source={
        DeviceInfo.getDeviceType() === 'Tablet'
          ? require('../../assets/images/common/background.webp')
          : require('../../assets/images/common/background.webp')
      }
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
            width: 250,
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'center',
            alignSelf: 'center',
            marginBottom: 80,
          }}>
          <Text style={{color: 'white', marginBottom: 10}}>
            {statusMessage}
          </Text>
          <View
            style={{
              height: 30,
              flexDirection: 'row',
              width: '100%',
              backgroundColor: 'black',
              borderRadius: 5,
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
            }}>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: '#7b2ed6',
                  width: `${downloadProgress.toFixed(0)}%`,
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'absolute',
                  left: 0,
                  right: 0,
                },
              ]}>
              <Animated.Text
                style={{
                  color: 'white',
                  fontWeight: 'bold',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <Text>{downloadProgress.toFixed(0)}%</Text>
              </Animated.Text>
            </Animated.View>
          </View>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}
