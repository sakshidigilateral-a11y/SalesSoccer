import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ImageBackground,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Dimensions,
  Image,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import LinearGradient from 'react-native-linear-gradient';
import AntdesignIcon from 'react-native-vector-icons/AntDesign';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as RNFS from 'react-native-fs';
import {Assets} from '../../assets/images';
import {Linking, ScrollView} from 'react-native';
import {useDispatch} from 'react-redux';
import {logout} from '../../redux/authSlice';
import {persistor} from '../../redux/store';
import {Alert} from 'react-native';
import CustomCalendar from '../Home/components/CustomCalender';
import {clearPlayerStats} from '../../redux/playerSlice';

const {width} = Dimensions.get('window');
const API_URL = 'https://salessoccer.digilateral.com';

export default function Action({navigation}) {
  const [uploadData, setUploadData] = useState([]);
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCaseNo, setActiveCaseNo] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [teamLogos, setTeamLogos] = useState({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  // Approval Modal States
  const [modalVisibleApproval, setModalVisibleApproval] = useState(false);
  const [modalVisibleSuccess, setModalVisibleSuccess] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedMrId, setSelectedMrId] = useState(null);
  const [selectedUploadId, setSelectedUploadId] = useState(null);
  const [approvalAction, setApprovalAction] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const getFormattedDate = () => {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      return `${day}-${month}-${year}`;
    };
    setSelectedDate(getFormattedDate());
  }, []);

  useEffect(() => {
    fetchUserDetails();
  }, []);

  useEffect(() => {
    if (selectedDate && userType) {
      fetchData();
    }
  }, [selectedDate, userType]);

  const fetchUserDetails = async () => {
    try {
      const details = await AsyncStorage.getItem('userData');
      if (details) {
        const detailsParse = JSON.parse(details);
        console.log('User Details:', detailsParse);
        setUserType(detailsParse?.user?.role);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const details = await AsyncStorage.getItem('userData');
      const detailsParse = JSON.parse(details);

      const userId = detailsParse?.user?.id;
      const userRole = detailsParse?.user?.role;

      let response;

      // Check if user is FLM
      if (userRole === 'FLM') {
        response = await axios.get(`${API_URL}/api/flm/${userId}/uploads`);
      } else {
        response = await axios.get(`${API_URL}/api/mr/${userId}/uploads`);
      }

      console.log('Fetched Upload Data:', response.data);

      // ✅ FIX: The API returns array directly, not nested UploadedData
      const rawData = response.data.data || response.data;

      // Filter by date if needed
      const filteredData = rawData.filter(item => {
        if (!item.dateOfUpload) return false;

        const backendDate = new Date(item.dateOfUpload);
        const formatted = `${backendDate
          .getDate()
          .toString()
          .padStart(2, '0')}-${(backendDate.getMonth() + 1)
          .toString()
          .padStart(2, '0')}-${backendDate.getFullYear()}`;

        return formatted === selectedDate;
      });

      console.log('Filtered Data:', filteredData);
      setUploadData(filteredData.reverse());

      // Load team logos from the actual data
      await loadTeamLogos(filteredData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamLogos = async data => {
    const logos = {};
    for (const item of data) {
      // ✅ Access teamName from activitySpecificDetails
      const teamName = item.activitySpecificDetails?.brandName;
      console.log('Loading logo for team:', item);
      if (teamName && !logos[teamName]) {
        const logoPath = `${RNFS.DocumentDirectoryPath}/DIGI/100x100/${teamName}.png`;
        if (await RNFS.exists(logoPath)) {
          logos[teamName] = `file://${logoPath}`;
        }
      }
    }
    setTeamLogos(logos);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [selectedDate, userType]);

  const toggleReply = id => {
    setActiveCaseNo(prev => (prev === id ? null : id));
  };

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);

  const handleConfirm = date => {
    const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}-${date.getFullYear()}`;
    setSelectedDate(formattedDate);
    hideDatePicker();
  };

  // Approval Handlers
  const handleOpenApprovalModal = (mrId, uploadId, action) => {
    setSelectedMrId(mrId);
    setSelectedUploadId(uploadId);
    setApprovalAction(action.toLowerCase()); // FORCE lowercase
    setModalVisibleApproval(true);
  };

  const closeApprovalModal = () => {
    setModalVisibleApproval(false);
    setModalVisibleSuccess(false);
    setRejectionReason('');
    setSelectedMrId(null);
    setSelectedUploadId(null);
    setApprovalAction('');
  };

  const closeSuccessModal = () => {
    setModalVisibleSuccess(false);
    fetchData();
  };

  const handleLogout = async () => {
    try {
      // 1. Clear Redux state FIRST
      dispatch(logout());
      dispatch(clearPlayerStats());

      // 2. Clear ALL AsyncStorage keys used in your app
      await AsyncStorage.multiRemove([
        'userToken',
        'mrId',
        'userData',
        'assetsDownloaded',
      ]);

      // 3. Purge persisted Redux store and WAIT for it
      await persistor.purge();
      await persistor.flush(); // ✅ Ensures purge is written to storage

      // 4. Navigate to login AFTER everything is cleared
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const dispatch = useDispatch();

  // const handleSubmitApproval = async () => {
  //   try {
  //     if (approvalAction === 'rejected' && !rejectionReason.trim()) {
  //       Alert.alert('Error', 'Please provide a reason for rejection');
  //       return;
  //     }

  //     const response = await axios.put(
  //       `${API_URL}/api/soccer/approve/${selectedUploadId}/${selectedMrId}`,
  //       {
  //         reason:
  //           approvalAction === 'rejected'
  //             ? rejectionReason
  //             : 'Approved by manager',
  //         status: approvalAction,
  //       },
  //     );
  //     if (response?.data?.success) {
  //       setModalVisibleApproval(false);
  //       setModalVisibleSuccess(true);
  //       fetchData();
  //     }
  //   } catch (error: any) {
  //     console.log('Approval error:', error);
  //     Alert.alert(
  //       'Error',
  //       error?.response?.data?.message || 'Failed to process request',
  //     );
  //   }
  // };
  const handleSubmitApproval = async () => {
    try {
      if (approvalAction === 'rejected' && !rejectionReason.trim()) {
        Alert.alert('Error', 'Please provide a reason for rejection');
        return;
      }

      const details = await AsyncStorage.getItem('userData');
      const parsed = JSON.parse(details || '{}');
      const managerId = parsed?.user?.id;
      const role = parsed?.user?.role;

      // Only allow FLM / SLM / TLM
      if (!['FLM', 'SLM', 'TLM'].includes(role)) {
        Alert.alert('Error', 'You are not authorized to review uploads.');
        return;
      }

      const response = await axios.post(
        `${API_URL}/api/flm/${managerId}/review/${selectedUploadId}?role=${role.toLowerCase()}`,
        approvalAction === 'rejected'
          ? {
              action: 'reject',
              rejectionReason: rejectionReason,
            }
          : {
              action: 'approve',
            },
      );

      if (response?.data?.success) {
        setModalVisibleApproval(false);
        setModalVisibleSuccess(true);
        fetchData();
      }
    } catch (error: any) {
      console.log('Approval error:', error?.response?.data || error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to process request',
      );
    }
  };

  const renderItem = ({item}) => {
    console.log('ROLE:', userType);
    console.log('STATUS:', item.status);
    return (
      <View>
        <View style={styles.row}>
          <Text style={[styles.cell, {flex: 1.5}]}>{item.drName}</Text>

          {/* <View style={{flex: 1, alignItems: 'center'}}>
          {teamLogos[item.activitySpecificDetails?.brandName] ? (
            <Image
              source={{uri: teamLogos[item.activitySpecificDetails?.brandName]}}
              style={styles.teamLogo}
            />
          ) : (
            <View style={styles.teamLogoPlaceholder} />
          )}
        </View> */}

          <Text style={[styles.cell, {flex: 1.2}]}>
            {item.activitySpecificDetails?.noRxns || 0}
          </Text>
          <Text style={[styles.cell, {flex: 1}]}>
            {item.timeOfUpload.split(':').slice(0, 2).join(':')}
          </Text>

          <View style={{flex: 1, alignItems: 'center'}}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    item.status === 'approved'
                      ? 'rgba(0, 255, 0, 0.3)'
                      : item.status === 'pending'
                      ? 'rgba(255, 191, 0, 0.3)'
                      : 'rgba(255, 0, 0, 0.3)',
                },
              ]}>
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      item.status === 'approved'
                        ? 'white'
                        : item.status === 'pending'
                        ? '#FF8C00'
                        : 'red',
                  },
                ]}>
                {item.status === 'approved'
                  ? 'A'
                  : item.status === 'pending'
                  ? 'P'
                  : 'R'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => toggleReply(item.id)}
            style={{flex: 0.5, alignItems: 'center'}}>
            <AntdesignIcon
              name={activeCaseNo === item.id ? 'minuscircleo' : 'pluscircleo'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
        {/* Prescription Image Preview */}

        {activeCaseNo === item.id && (
          <View style={styles.detailsContainer}>
            {/* <Text style={{color: 'white', fontSize: 10}}>
      {JSON.stringify(item, null, 2)}
    </Text> */}

            {activeCaseNo === item.id &&
              Array.isArray(item.uploadImage) &&
              item.uploadImage.length > 0 && (
                <View style={styles.imagePreviewSection}>
                  <Text style={{color: '#FFD700', fontWeight: 'bold'}}>
                    Proof
                  </Text>

                  <TouchableOpacity
                    onPress={() =>
                      setSelectedImage(`${API_URL}${item.uploadImage[0]}`)
                    }>
                    <Image
                      source={{uri: `${API_URL}${item.uploadImage[0]}`}}
                      style={styles.prescriptionThumb}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                </View>
              )}

            {['FLM', 'SLM', 'TLM'].includes(userType ?? '') && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  disabled={item.status?.toLowerCase() !== 'pending'}
                  onPress={() =>
                    handleOpenApprovalModal(item.mrId, item.id, 'approved')
                  }
                  style={[
                    styles.approveButton,
                    item.status?.toLowerCase() !== 'pending' && {opacity: 0.4},
                  ]}>
                  <AntdesignIcon name="checkcircleo" size={20} color="green" />
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    handleOpenApprovalModal(item.mrId, item.id, 'rejected')
                  }
                  style={styles.rejectButton}>
                  <AntdesignIcon name="closecircleo" size={20} color="red" />
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Details */}
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Status: </Text>
              <Text
                style={{
                  color:
                    item.status === 'rejected'
                      ? 'red'
                      : item.status === 'approved'
                      ? 'green'
                      : 'orange',
                }}>
                {item.status}
              </Text>
            </Text>

            {item.reason && (
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Reason: </Text>
                <Text style={{color: 'red'}}>{item.reason}</Text>
              </Text>
            )}

            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Brand: </Text>
              {item.activitySpecificDetails?.brandName}
            </Text>

            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Speciality: </Text>
              {item.speciality}
            </Text>

            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>MR Name: </Text>
              {item.mrName}
            </Text>

            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Rxn Duration: </Text>
              {item.activitySpecificDetails?.rxnDuration}
            </Text>
            <Text style={styles.detailText}>
              <Text
                style={[styles.detailLabel]}>
                Date od Upload   </Text>
                {item.dateOfUpload}
              </Text>
           
          </View>
        )}
      </View>
    );
  };

  return (
    <ImageBackground source={Assets.Common.background} style={styles.container}>
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>
          {userType === 'MR' ? 'Approval Status' : 'Prescription Approval'}
        </Text>

        {/* Date Picker */}
        <View style={styles.dateContainer}>
          <TouchableOpacity onPress={showDatePicker}>
            <Text style={styles.dateText}>Date: {selectedDate}</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <LinearGradient
          colors={['rgba(214, 171, 215, 0.8)', 'rgba(57, 12, 89, 0.5)']}
          style={styles.header}>
          <Text style={[styles.headerText, {flex: 1.5}]}>Doctor</Text>

          <Text style={[styles.headerText, {flex: 1}]}>GOALS</Text>
          {/* <Text style={[styles.headerText, {flex: 1}]}>TIME</Text> */}
          <Text style={[styles.headerText, {flex: 1}]}>Time</Text>
          <Text style={[styles.headerText, {flex: 1}]}>STATUS</Text>
          <Text style={[styles.headerText, {flex: 0.5}]}></Text>
        </LinearGradient>

        {/* List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <FlatList
            data={uploadData}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#fff']}
                tintColor="#fff"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No uploads found</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Date Picker Modal */}
      <CustomCalendar
        visible={isDatePickerVisible}
        onClose={hideDatePicker}
        onSelect={handleConfirm}
        maxDate={new Date()}
        minDate={new Date('1990-01-01')}
      />

      {/* Approval Modal */}
      <Modal
        visible={modalVisibleApproval}
        transparent
        animationType="fade"
        onRequestClose={closeApprovalModal}>
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={['hsla(300, 91%, 43%, 0.60)', '#c700a6f2']}
            style={styles.modalContent}>
            <TouchableOpacity
              onPress={closeApprovalModal}
              style={styles.closeButton}>
              <MaterialIcons name="cancel" size={28} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>
              {approvalAction === 'rejected'
                ? 'Reject Upload'
                : 'Approve Upload'}
            </Text>

            {approvalAction === 'rejected' ? (
              <TextInput
                style={styles.input}
                placeholder="Reason for rejection"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
              />
            ) : (
              <Text style={styles.confirmText}>
                Are you sure you want to approve this upload?
              </Text>
            )}

            <TouchableOpacity
              onPress={handleSubmitApproval}
              style={styles.submitButton}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={modalVisibleSuccess}
        transparent
        animationType="fade"
        onRequestClose={closeSuccessModal}>
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={['hsla(314, 96%, 47%, 0.95)', 'rgba(0, 100, 200, 0.95)']}
            style={styles.modalContentSmall}>
            <Text style={styles.successText}>
              {approvalAction === 'rejected'
                ? 'Rejected Successfully'
                : 'Approved Successfully'}
            </Text>
            <TouchableOpacity
              onPress={closeSuccessModal}
              style={styles.okButton}>
              <Text style={styles.okButtonText}>OK</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>
      {/* Full Screen Prescription Viewer */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'black',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Pressable
            onPress={() => setSelectedImage(null)}
            style={{
              position: 'absolute',
              top: 40,
              right: 20,
              zIndex: 1,
            }}>
            <MaterialIcons name="close" size={30} color="#fff" />
          </Pressable>

          <Image
            source={{uri: selectedImage}}
            style={{width: '100%', height: '80%'}}
            resizeMode="contain"
          />
        </View>
      </Modal>
      <View style={styles.bottomTabs}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setShowDisclaimer(true)}>
          <AntdesignIcon name="exclamationcircleo" size={18} color="#ffffffbc" />
          <Text style={styles.tabText}>Disclaimer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem1}
          onPress={() =>
            Linking.openURL('https://digilateral.com/privacy-policy/')
          }>
          <MaterialIcons name="privacy-tip" size={18} color="#ffffffbc" />
          <Text style={styles.tabText}>Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogout} style={styles.tabItem}>
          <MaterialIcons name="logout" size={18} color="#ffffffbc" />
          <Text style={styles.tabText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={showDisclaimer}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDisclaimer(false)}>
        <View style={styles.modalOverlay}>
          <View
            colors={['#e14593', '#7b2ed6']}
            useAngle
            angle={145}
            style={styles.disclaimerBox}>
            {/* Header */}
            <View style={styles.disclaimerHeader}>
              <Text style={styles.policyTitle}>Disclaimer</Text>
              <TouchableOpacity onPress={() => setShowDisclaimer(false)}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{paddingBottom: 20}}>
              <Text style={styles.policyText}>
                © 2024 DIGI-LATERAL Solutions. All rights reserved. The
                application, rxsoccer, and all associated names, themes, and
                elements are designed as a motivational and gamified tool to
                encourage healthy competition and enhance productivity.
                {'\n'}
                While rxsoccer incorporates sports-inspired themes, it does not
                claim any association with or endorsement by any real-world
                sports leagues, teams, players, or organizations. All
                representations within the application are intended for
                engagement and entertainment purposes only.
                {'\n'}
                All trademarks, logos, and names of actual teams, leagues, or
                organizations remain the property of their respective owners.
                The team names and logos used in rxsoccer are entirely fictional
                and created solely for thematic engagement. Any resemblance to
                existing names, logos, or entities is coincidental and
                unintentional.
                {'\n'}
                rxsoccer awards points based on user inputs and interactions
                within the application, using a gamified scoring system inspired
                by sports. This application is designed for internal use within
                participating organizations and is not intended for public or
                commercial use.
                {'\n'}
                If any individual, team, organization, or association has
                concerns regarding the content or representation within
                rxsoccer, they are encouraged to contact us at
                info@digilateral.com. We will address any legitimate concerns
                promptly and reasonably.
                {'\n'}
                Digilateral Solutions has taken reasonable efforts to ensure
                compliance with applicable laws and regulations. By using
                rxsoccer, participants agree to its terms, conditions, and the
                intended purpose of its gamified design. Digilateral Solutions
                assumes no liability for any misinterpretation of the content or
                functionality of rxsoccer.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  title: {
    textAlign: 'center',
    fontSize: 16,
    color: '#fff',
    backgroundColor: 'rgba(106, 13, 173, 0.5)',
    paddingVertical: 10,
  },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(106, 13, 173, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  dateContainer: {
    padding: 3,
    marginHorizontal: 8,
    // borderRadius: 10,
    // marginBottom: 10,
    alignItems: 'flex-end',
  },
  imagePreviewSection: {
    marginVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 10,
    borderRadius: 10,
  },
  prescriptionThumb: {
    width: width * 0.7,
    height: 150,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#000',
  },
  imageWrapper: {
    position: 'relative',
  },
  zoomOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  zoomText: {
    color: '#fff',
    fontSize: 10,
    marginLeft: 4,
  },
  infoGrid: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 10,
  },
  dateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    padding: 5,
    marginHorizontal: 0,
    borderRadius: 5,
  },
  headerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  disclaimerBox: {
    width: '90%',
    maxHeight: '50%',
    backgroundColor: 'hsla(303, 93%, 48%, 0.80)',
    borderRadius: 12,
    padding: 15,
  },

  disclaimerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  policyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  policyText: {
    fontSize: 10,
    color: '#fff',
    lineHeight: 20,
  },

  policyLink: {
    color: '#00BFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  row: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 128, 0, 0.3)',
    padding: 5,
    marginHorizontal: 10,
    marginTop: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
  cell: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
  },
  teamLogo: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },

  teamLogoPlaceholder: {
    width: 30,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
  },
  statusBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 12,
    marginHorizontal: 10,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderRadius: 5,
  },
  bottomTabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(106, 13, 173, 0.5)',
    paddingVertical: 12,
    marginBottom: 55,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },

  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem1: {
    alignItems: 'center',
    justifyContent: 'center',
    right: 4,
  },
  tabText: {
    color: '#ffffffbc',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },

  approveText: {
    marginLeft: 5,
    color: 'green',
    fontWeight: 'bold',
    fontSize: 12,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    borderRadius: 5,
  },
  rejectText: {
    marginLeft: 5,
    color: 'red',
    fontWeight: 'bold',
    fontSize: 12,
  },
  detailText: {
    color: '#fff',
    fontSize: 11,
    marginBottom: 4,
  },
  detailLabel: {
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 14,
  },

  modalContent: {
    width: '85%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  modalContentSmall: {
    width: '70%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  input: {
    width: '100%',
    height: 100,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 5,
    padding: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.2)',
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  confirmText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  successText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  okButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  okButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
