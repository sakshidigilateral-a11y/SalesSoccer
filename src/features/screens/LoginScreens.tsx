import React, {useState} from 'react';
import {
  ImageBackground,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Assets} from '../../assets/images';
import {Box, Text} from '../../components/themes';
import {LinearGradient} from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome';
import {loginUser} from '../../services/authService';
import {useDispatch} from 'react-redux';
import {setCredentials} from '../../redux/authSlice';
import axios from 'axios';
import {jwtDecode} from 'jwt-decode';
import {clearPlayerStats} from '../../redux/playerSlice';
import * as RNFS from 'react-native-fs';
import CustomAlert from './../Home/components/CustomAlert';

const {width} = Dimensions.get('window');

const LoginScreen = ({navigation}: any) => {
  const dispatch = useDispatch();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [userPlaceholder, setUserPlaceholder] = useState('Player ID');
  const [passPlaceholder, setPassPlaceholder] = useState('Player PIN');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const hasNavigated = useRef(false);
  const [alertType, setAlertType] = useState<
    'success' | 'error' | 'warning' | 'info'
  >('info');

  const togglePasswordVisibilty = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const showAlert = (title: string, message: string, type = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type as any);
    setAlertVisible(true);
  };

  const handleLogin = async () => {
    if (!userId || !password) {
      showAlert('Error', 'Please enter ID and Password', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        'http://192.168.1.7:5450/api/auth/login',
        {
          userId: userId,
          password: password,
        },
      );

      if (response.status === 200 || response.status === 201) {
        const {token} = response.data;

        // Decode token
        const decoded: any = jwtDecode(token);

        dispatch(clearPlayerStats());

        // Save in Redux
        dispatch(
          setCredentials({
            mrId: decoded.id,
            token: token,
            role: decoded.role,
          }),
        );

        console.log('Login Successful', response.data);
        await AsyncStorage.setItem('userToken', response.data.token);
        await AsyncStorage.setItem('mrId', userId);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data));

        // ✅ NEW: Check if assets are downloaded
        // const assetsDownloaded = await AsyncStorage.getItem('assetsDownloaded');

        const folder100x100 = RNFS.DocumentDirectoryPath + '/DIGI/100x100';
        const folder200x200 = RNFS.DocumentDirectoryPath + '/DIGI/200x200';

        const folder100x100Exists = await RNFS.exists(folder100x100);
        const folder200x200Exists = await RNFS.exists(folder200x200);

        const teamName = await AsyncStorage.getItem('teamName');
        const assetsDownloaded = await AsyncStorage.getItem(
          `assetsDownloaded_${teamName}`,
        );

        setTimeout(() => {
          if (
            assetsDownloaded === 'true' &&
            folder100x100Exists &&
            folder200x200Exists
          ) {
            navigation.replace('Maintabs');
          } else {
            navigation.replace('AssetsDownload');
          }
        }, 400); // 300–600ms is ideal

        // if (assetsDownloaded === 'true') {
        //   // Assets already downloaded, go to Home
        //   navigation.replace('Home');
        // } else {
        //   // First time login, download assets
        //   navigation.replace('AssetsDownload');
        // }
      }
    } catch (error: any) {
      console.log('Full Error Object', error.response);
      const errorMessage = error.response?.data?.message || 'Login Failed';
      showAlert('Login Error', errorMessage, 'error');
      console.log('Login Error', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={Assets.Common.background}
      style={styles.background}
      resizeMode="cover">
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <Box
          flex={1}
          justifyContent="center"
          alignItems="center"
          paddingHorizontal="l">
          <Box marginBottom="xl">
            <Image
              source={Assets.Auth.logo}
              style={styles.logo}
              resizeMode="contain"
            />
          </Box>

          <Box width="100%">
            {/* User Id */}
            <Box
              style={{backgroundColor: 'rgba(0,0,0,0.5)'}}
              height={55}
              borderRadius={19}
              marginBottom="m"
              flexDirection="row"
              alignItems="center"
              paddingHorizontal="m"
              overflow="hidden">
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.2)']}
                start={{x: 0.7, y: 0.5}}
                end={{x: 1, y: 0.5}}
                style={StyleSheet.absoluteFill}
              />
              {/* <Icon name="user" size={20} color="#680471" /> */}
              <Image
                source={Assets.Home.PlayerLogin}
                style={styles.img}
                resizeMode="contain"
              />
              <TextInput
                placeholder={userPlaceholder}
                placeholderTextColor="#fff"
                value={userId}
                onChangeText={setUserId}
                style={[styles.input1]}
                autoCapitalize="none"
                onFocus={() => setUserPlaceholder('')}
                onBlur={() => {
                  if (userId === '') setUserPlaceholder('User Id');
                }}
              />
            </Box>
            {/* Password */}
            <Box
              style={{backgroundColor: 'rgba(0,0,0,0.5)'}}
              height={55}
              borderRadius={19}
              flexDirection="row"
              alignItems="center"
              paddingHorizontal="m"
              marginBottom="xl"
              overflow="hidden">
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.2)']}
                start={{x: 0.7, y: 0.5}}
                end={{x: 1, y: 0.5}}
                style={StyleSheet.absoluteFill}
              />
              <Image
                source={Assets.Home.Password}
                style={styles.img}
                resizeMode="contain"
              />
              <TextInput
                placeholder={passPlaceholder}
                placeholderTextColor="#fff"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                autoCapitalize="none"
                secureTextEntry={!isPasswordVisible}
                onFocus={() => setPassPlaceholder('')}
                onBlur={() => {
                  if (password === '') setPassPlaceholder('Player PIN');
                }}
              />
              <TouchableOpacity
                onPress={togglePasswordVisibilty}
                style={{padding: 5}}>
                <Icon
                  name={isPasswordVisible ? 'eye' : 'eye-slash'}
                  size={24}
                  color="#fff"
                  style={{marginRight: 10}}
                />
              </TouchableOpacity>
            </Box>
            {/* Login Button */}
            <TouchableOpacity onPress={handleLogin} disabled={loading}>
              <Box
                alignSelf="center"
                backgroundColor="deepVolite"
                paddingVertical="m"
                paddingHorizontal="xl"
                borderRadius={25}
                borderWidth={1}
                borderColor="white">
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text
                    color="white"
                    fontSize={18}
                    variant="body"
                    fontWeight="bold">
                    Let's Play
                  </Text>
                )}
              </Box>
            </TouchableOpacity>
          </Box>
        </Box>
      </KeyboardAvoidingView>
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onDismiss={() => setAlertVisible(false)}
      />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  logo: {
    width: width * 0.9,
    height: 200,
    bottom: -40,
  },
  img: {
    height: 22,
    width: 22,
    marginRight: 10,
  },
  input1: {
    color: '#fff',
    fontSize: 16,
    height: '100%',
    width: '100%',
    flex: 1,
    //  marginLeft:-100,
    paddingHorizontal: 5,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  input: {
    color: '#fff',
    fontSize: 16,
    height: '100%',
    width: '100%',
    flex: 1,
    paddingHorizontal: 5,
    fontWeight: '800',
    fontStyle: 'italic',
  },
});

export default LoginScreen;
