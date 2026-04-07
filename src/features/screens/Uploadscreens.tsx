import React, {useState, useEffect} from 'react';
import {
  ImageBackground,
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  Text as RNText,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {launchImageLibrary} from 'react-native-image-picker';
import axios from 'axios';
import {Box, Text} from '../../components/themes';
import {Assets} from '../../assets/images';
import CustomTabBar from '../Home/components/CustomTabBar';
import {Dropdown} from 'react-native-element-dropdown';
import {useNavigation} from '@react-navigation/native';
import {CommonActions} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../redux/store';
import {updateFromBackend} from '../../redux/playerSlice';
import CustomAlert from '../Home/components/CustomAlert';
import AppStatusBar from '../Home/components/AppStatusBar';


const {width} = Dimensions.get('window');
const API_URL = 'http://192.168.1.7:5450';

type CategoryType = 'Prescription' | 'camp' | 'POB' | 'Conversion' | 'More';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  buttons: AlertButton[];
}

const DEFAULT_ALERT: AlertState = {
  visible: false,
  type: 'info',
  title: '',
  message: '',
  buttons: [{text: 'OK'}],
};

const Uploadscreens = () => {
  const [activeCategory, setActiveCategory] =
    useState<CategoryType>('Prescription');
  const [formData, setFormData] = useState<{[key: string]: string}>({
    rxnDuration: '1',
  });
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [brandNames, setBrandNames] = useState<any[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [campNames, setCampNames] = useState<any[]>([]);
  const [commonFields, setCommonFields] = useState<any[]>([]);
  const [activityFields, setActivityFields] = useState<any[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [alert, setAlert] = useState<AlertState>(DEFAULT_ALERT);

  const dispatch = useDispatch();
  const stats = useSelector((state: RootState) => state.player.stats);
  const noLiveMatch = stats?.isMatchOn === 0;
  const navigation = useNavigation();

  // ─── Helper to show custom alerts ────────────────────────────────────────────
  const showAlert = (
    type: AlertState['type'],
    title: string,
    message: string,
    buttons?: AlertButton[],
  ) => {
    setAlert({
      visible: true,
      type,
      title,
      message,
      buttons: buttons ?? [{text: 'OK'}],
    });
  };

  const hideAlert = () => setAlert(prev => ({...prev, visible: false}));

  // ─── Field label map ─────────────────────────────────────────────────────────
  const FIELD_LABELS: Record<string, string> = {
    drName: 'Dr Name',
    scCode: 'Customer Code',
    mobNo: 'Mobile Number',
    speciality: 'Speciality',
    brandName: 'Brand Name',
    campName: 'Camp Name',
    noOfCamps: 'No of Rxns',
    noRxns: 'No of Prescriptions',
    rxnDuration: 'Rxn Duration',
    chemistName: 'Chemist Name',
    noOfUnits: 'No of Units',
    allValue: 'Total Value',
  };

  const getFieldLabel = (key: string) => FIELD_LABELS[key] || key;

  const categories = [
    {title: 'Prescription' as CategoryType, icon: Assets.Uploads.prescription},
    {title: 'Camp' as CategoryType, icon: Assets.Uploads.Camps},
    {title: 'POB' as CategoryType, icon: Assets.Uploads.POB},
    {title: 'Conversion' as CategoryType, icon: Assets.Uploads.conversion},
    {title: 'More' as CategoryType, icon: Assets.Uploads.more},
  ];

  const specialityData = [
    {label: 'Cardiology', value: 'Cardiology'},
    {label: 'Dermatology', value: 'Dermatology'},
    {label: 'Paediatrics', value: 'Paediatrics'},
    {label: 'Orthopedics', value: 'Orthopedics'},
    {label: 'General Physician', value: 'General Physician'},
  ];

  // ─── API calls ───────────────────────────────────────────────────────────────
  const fetchActivityFields = async (type: string) => {
    try {
      setLoadingFields(true);
      const response = await axios.get(
        `${API_URL}/api/user/activity-types?isActive=true&search=${type}`,
      );
      if (response.data.success) {
        const data = response.data.data;
        setCommonFields(data.commonFields);
        if (data.activityTypes.length > 0) {
          setActivityFields(data.activityTypes[0].activitySpecificFields);
        }
      }
    } catch (err) {
      console.log('Activity fields error:', err);
    } finally {
      setLoadingFields(false);
    }
  };

  const allFields = [...commonFields, ...activityFields];

  const fetchBrandNames = async () => {
    try {
      setLoadingBrands(true);
      const response = await axios.get(`${API_URL}/api/mr/brandNames`);
      if (response.data.success) {
        const formattedBrands = response.data.data.map((brand: any) => ({
          label: brand.brandName,
          value: brand.brandName,
        }));
        setBrandNames(formattedBrands);
      }
    } catch (error) {
      console.error('Error fetching brand names:', error);
      showAlert(
        'error',
        'Load Failed',
        'Failed to load brand names. Please try again.',
      );
    } finally {
      setLoadingBrands(false);
    }
  };

  const fetchCampNames = async () => {
    try {
      setLoadingBrands(true);
      const response = await axios.get(`${API_URL}/api/mr/camps`);
      if (response.data.success) {
        const formattedCamps = response.data.data.camps.map((brand: any) => ({
          label: brand.campName,
          value: brand.campName,
        }));
        setCampNames(formattedCamps);
      }
    } catch (error) {
      console.error('Error fetching camp names:', error);
      showAlert(
        'error',
        'Load Failed',
        'Failed to load camp names. Please try again.',
      );
    } finally {
      setLoadingBrands(false);
    }
  };

  useEffect(() => {
    fetchBrandNames();
  }, []);
  useEffect(() => {
    fetchActivityFields(activeCategory.toLowerCase());
  }, []);
  useEffect(() => {
    fetchCampNames();
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({...prev, [key]: value}));
  };

  const handleImagePick = () => {
    launchImageLibrary(
      {mediaType: 'photo', quality: 0.8, maxWidth: 1920, maxHeight: 1920},
      response => {
        if (response.didCancel) {
          return;
        } else if (response.errorCode) {
          showAlert(
            'error',
            'Image Error',
            response.errorMessage || 'Failed to pick image',
          );
        } else if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
            showAlert(
              'warning',
              'File Too Large',
              'Image size must be less than 5MB. Please choose a smaller image.',
            );
            return;
          }
          setSelectedImage(asset);
        }
      },
    );
  };

  const validateForm = () => {
    const requiredFields = allFields.filter(field => field.required);
    for (const field of requiredFields) {
      const key = field.fieldName;
      if (!formData[key] || formData[key].trim() === '') {
        showAlert(
          'warning',
          'Missing Field',
          `Please fill in: ${getFieldLabel(key)}`,
        );
        return false;
      }
    }
    if (!selectedImage) {
      showAlert(
        'warning',
        'Proof Required',
        'Please upload a proof image before submitting.',
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setUploading(true);

      const mrId = await AsyncStorage.getItem('mrId');
      if (!mrId) {
        showAlert(
          'error',
          'Session Expired',
          'User ID not found. Please login again.',
        );
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('type', activeCategory.toLowerCase());

      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });

      formDataToSend.append('image', {
        uri: selectedImage.uri,
        type: selectedImage.type || 'image/jpeg',
        name: selectedImage.fileName || `upload_${Date.now()}.jpg`,
      });

      const response = await axios.post(
        `${API_URL}/api/mr/${mrId}/upload`,
        formDataToSend,
        {headers: {'Content-Type': 'multipart/form-data'}},
      );

      if (response.data.success) {
        const data = response.data.data;

        dispatch(
          updateFromBackend({
            totalGoals: data.totalGoals,
            currentCounter: data.currentCounter,
            isGoal: data.isGoal,
          }),
        );

        showAlert(
          'success',
          'Upload Successful!',
          'Your submission has been received successfully.',
          [
            {
              text: 'Continue',
              onPress: () => {
                setFormData({rxnDuration: '1'});
                setSelectedImage(null);
                setTimeout(() => {
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{name: 'Maintabs'}],
                    }),
                  );
                }, 100);
              },
            },
          ],
        );
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage =
        error.response?.data?.message || 'Failed to upload. Please try again.';
      showAlert('error', 'Upload Failed', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleCategoryChange = (category: CategoryType) => {
    setActiveCategory(category);
    setFormData({rxnDuration: '1'});
    setSelectedImage(null);
    fetchActivityFields(category.toLowerCase());
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <ImageBackground source={Assets.Common.background} style={styles.container}>
      {/* ── Custom Alert ── */}
            <AppStatusBar />

      <CustomAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onDismiss={hideAlert}
      />

      {noLiveMatch ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text color="white" fontSize={16} fontWeight="bold">
            No Live Matches
          </Text>
        </View>
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{flex: 1, marginTop: 30}}>
            <ScrollView
              style={{flex: 1}}
              contentContainerStyle={{paddingBottom: 100}}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Box flex={1} paddingHorizontal="m" paddingTop="l">
                {/* TOP CATEGORY ICONS */}
                <Box
                  flexDirection="row"
                  justifyContent="space-between"
                  marginBottom="m">
                  {categories.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleCategoryChange(item.title)}
                      style={{width: width / 5.8, alignItems: 'center'}}>
                      <View
                        style={[
                          styles.iconCircle,
                          activeCategory === item.title && {
                            backgroundColor: 'rgba(255,255,255,0.7)',
                          },
                        ]}>
                        <Image source={item.icon} style={styles.categoryIcon} />
                      </View>
                      <Text
                        fontSize={10}
                        color="white"
                        marginTop="s"
                        textAlign="center">
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </Box>

                <Box>
                  {allFields.map(field => {
                    const key = field.fieldName;

                    if (key === 'brandName') {
                      return (
                        <Dropdown
                          key={key}
                          style={styles.dropdown}
                          placeholderStyle={styles.placeholderStyle}
                          selectedTextStyle={styles.selectedTextStyle}
                          containerStyle={styles.dropdownContainer}
                          itemTextStyle={styles.itemText}
                          activeColor="rgba(255,255,255,0.1)"
                          data={brandNames}
                          labelField="label"
                          valueField="value"
                          placeholder="Select Brand"
                          value={formData[key] || null}
                          onChange={item => handleInputChange(key, item.value)}
                        />
                      );
                    }

                    if (key === 'campName') {
                      return (
                        <Dropdown
                          key={key}
                          style={styles.dropdown}
                          placeholderStyle={styles.placeholderStyle}
                          selectedTextStyle={styles.selectedTextStyle}
                          containerStyle={styles.dropdownContainer}
                          itemTextStyle={styles.itemText}
                          activeColor="rgba(255,255,255,0.1)"
                          data={campNames}
                          labelField="label"
                          valueField="value"
                          placeholder="Select Camp"
                          value={formData[key] || null}
                          onChange={item => handleInputChange(key, item.value)}
                        />
                      );
                    }

                    if (key === 'speciality') {
                      return (
                        <Dropdown
                          key={key}
                          style={styles.dropdown}
                          placeholderStyle={styles.placeholderStyle}
                          selectedTextStyle={styles.selectedTextStyle}
                          containerStyle={styles.dropdownContainer}
                          itemTextStyle={styles.itemText}
                          activeColor="rgba(255,255,255,0.1)"
                          data={specialityData}
                          labelField="label"
                          valueField="value"
                          placeholder="Select Speciality"
                          value={formData[key] || null}
                          onChange={item => handleInputChange(key, item.value)}
                        />
                      );
                    }

                    const isNoOfUnits = key === 'noOfUnits';
                    const isAllValue = key === 'allValue';

                    const noOfUnitsFilled = !!formData['noOfUnits']?.trim();
                    const allValueFilled = !!formData['allValue']?.trim();

                    const isDisabledByMutex =
                      (isAllValue && noOfUnitsFilled) ||
                      (isNoOfUnits && allValueFilled);

                    const isDisabled =
                      key === 'rxnDuration' || isDisabledByMutex;

                    return (
                      <TextInput
                        key={key}
                        placeholder={getFieldLabel(key)}
                        placeholderTextColor="white"
                        style={[styles.input, isDisabled && {opacity: 0.4}]}
                        value={
                          key === 'rxnDuration'
                            ? `${formData[key] || '1'} Default Factor`
                            : formData[key] || ''
                        }
                        editable={!isDisabled}
                        keyboardType={
                          field.type === 'number' ? 'numeric' : 'default'
                        }
                        onChangeText={text => handleInputChange(key, text)}
                      />
                    );
                  })}
                </Box>

                {/* UPLOAD HEADER */}
                <Box marginBottom="s" marginLeft="s" style={{marginTop: 8}}>
                  <RNText style={styles.headerRow}>
                    Upload Proof <RNText style={styles.requiredStar}>*</RNText>
                  </RNText>
                </Box>

                {/* UPLOAD BOX */}
                <View style={[styles.glassContainer]}>
                  <TouchableOpacity
                    style={styles.uploadTouch}
                    activeOpacity={0.7}
                    onPress={handleImagePick}>
                    {selectedImage ? (
                      <View style={styles.imagePreviewContainer}>
                        <Image
                          source={{uri: selectedImage.uri}}
                          style={styles.imagePreview}
                        />
                        <Text color="white" fontSize={11} marginTop="s">
                          Tap to change image
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Text color="white" marginBottom="s" fontSize={14}>
                          Tap to upload
                        </Text>
                        <View>
                          <Image
                            source={Assets.Home.Add}
                            style={styles.plusImage}
                          />
                        </View>
                        <Text color="white" fontSize={11} marginTop="s">
                          JPG, JPEG up to 5MB
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* SUBMIT BUTTON */}
                <Box marginTop="m">
                  <TouchableOpacity
                    style={[styles.submitBtn, uploading && {opacity: 0.6}]}
                    onPress={handleSubmit}
                    disabled={uploading}>
                    {uploading ? (
                      <View
                        style={{flexDirection: 'row', alignItems: 'center'}}>
                        <ActivityIndicator color="white" size="small" />
                        <Text color="white" fontWeight="bold" marginLeft="s">
                          Uploading...
                        </Text>
                      </View>
                    ) : (
                      <Text color="white" fontWeight="bold">
                        Submit
                      </Text>
                    )}
                  </TouchableOpacity>
                </Box>
              </Box>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      )}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  categoryIcon: {width: 24, height: 24, resizeMode: 'contain'},
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 25,
    paddingHorizontal: 20,
    height: 42,
    color: 'white',
    marginBottom: 8,
  },
  dropdown: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 25,
    paddingHorizontal: 20,
    height: 42,
    marginBottom: 8,
  },
  placeholderStyle: {fontSize: 14, color: 'white'},
  selectedTextStyle: {fontSize: 14, color: 'white'},
  dropdownContainer: {
    backgroundColor: '#1A0B40',
    borderRadius: 15,
    borderWidth: 0,
  },
  itemText: {color: 'white', fontSize: 14},
  headerRow: {color: 'white', fontWeight: 'bold', fontSize: 14},
  requiredStar: {color: 'red', fontWeight: 'bold'},
  glassContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: 20,
    height: 130,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 10,
  },
  uploadTouch: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  plusImage: {width: 42, height: 42, tintColor: 'white'},
  imagePreviewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  submitBtn: {
    backgroundColor: '#1A0B40',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    width: '50%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
});

export default Uploadscreens;
