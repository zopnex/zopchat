import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  getAuth,
  linkWithCredential,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  unlink,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Firebase project config for ZopChat. Keep this block easy to replace per environment.
const firebaseConfig = {
  apiKey: "AIzaSyChs8QUVGh_U9VmuDBWFZp8UFX4OgVJ7uM",
  authDomain: "zopchat-ts.firebaseapp.com",
  databaseURL: "https://zopchat-ts-default-rtdb.firebaseio.com",
  projectId: "zopchat-ts",
  storageBucket: "zopchat-ts.firebasestorage.app",
  messagingSenderId: "154212898819",
  appId: "1:154212898819:web:02a77e734ba577e09dd636",
  measurementId: "G-K71N2GRTX3",
};

// Cloudinary unsigned upload config. Photos stay on image/upload; attachments use auto/upload.
const CLOUDINARY_API = "https://api.cloudinary.com/v1_1/dsnuatuc8/image/upload";
const CLOUDINARY_FILE_API = "https://api.cloudinary.com/v1_1/dsnuatuc8/auto/upload";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";

const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Crect width='160' height='160' rx='80' fill='%23d9f8ec'/%3E%3Ccircle cx='80' cy='62' r='30' fill='%230f9f7a'/%3E%3Cpath d='M32 142c8-30 27-46 48-46s40 16 48 46' fill='%230f9f7a'/%3E%3C/svg%3E";
const INVITE_AVATAR = "https://res.cloudinary.com/dsnuatuc8/image/upload/v1780190715/Screenshot_2026-05-31_065148_fohvc2.png";
let zopchatDownloadUrl = "https://example.com/zopchat-download";
let zopchatShareText = "Join me on ZopChat so we can chat faster and privately.";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const state = {
  currentUser: null,
  currentProfile: null,
  selectedPhotoFile: null,
  cropTarget: null,
  cropFile: null,
  cropObjectUrl: "",
  cropImage: null,
  cropScale: 1,
  cropBaseScale: 1,
  cropX: 0,
  cropY: 0,
  cropStartX: 0,
  cropStartY: 0,
  cropPointerX: 0,
  cropPointerY: 0,
  cropDragging: false,
  activeChatId: null,
  activeReceiver: null,
  activeChatMeta: null,
  messageElements: new Map(),
  messageData: new Map(),
  selectedMessageId: null,
  selectedMessageIds: new Set(),
  replyTo: null,
  viewerPhotoUrl: "",
  viewerPhotoUrls: [],
  profilePreview: null,
  editingMessageId: null,
  activeChatData: null,
  typingTimer: null,
  uploadProgressId: null,
  qrScanStream: null,
  qrScanFrame: null,
  qrDetector: null,
  qrTorchOn: false,
  qrSwipeStartX: 0,
  qrSwipeStartY: 0,
  qrSwipeDeltaX: 0,
  qrActiveTab: "scan",
  selectedStatusSong: null,
  statusPreviewImageUrl: "",
  statusPreviewAudio: null,
  visibleStatuses: [],
  activeStatusIndex: 0,
  homeTab: "chats",
  statuses: [],
  unsubStatuses: null,
  touchStartX: 0,
  touchStartY: 0,
  touchMoved: false,
  suppressClickUntil: 0,
  chats: [],
  chatLastActivity: new Map(),
  notificationChatId: "",
  currentScreenId: "loading",
  historyReady: false,
  handlingPopState: false,
  searchTimer: null,
  unsubChats: null,
  unsubMessages: null,
  unsubReceiver: null,
  unsubActiveChat: null,
  unsubOwnSession: null,
  sessionId: null,
  isForcedLogout: false,
};

const $ = (id) => document.getElementById(id);

const els = {
  loadingScreen: $("loading-screen"),
  loginScreen: $("login-screen"),
  profileScreen: $("profile-screen"),
  homeScreen: $("home-screen"),
  chatScreen: $("chat-screen"),
  googleLoginBtn: $("google-login-btn"),
  mobileLoginForm: $("mobile-login-form"),
  loginMobile: $("login-mobile"),
  loginPassword: $("login-password"),
  emailSignupForm: $("email-signup-form"),
  signupEmail: $("signup-email"),
  signupPassword: $("signup-password"),
  emailSignupBtn: $("email-signup-btn"),
  profileForm: $("profile-form"),
  profileName: $("profile-name"),
  profileMobile: $("profile-mobile"),
  profilePassword: $("profile-password"),
  profilePreview: $("profile-preview"),
  profilePhotoInput: $("profile-photo-input"),
  saveProfileBtn: $("save-profile-btn"),
  profileLogoutBtn: $("profile-logout-btn"),
  homeAvatar: $("home-avatar"),
  openProfileBtn: $("open-profile-btn"),
  settingsScreen: $("settings-screen"),
  settingsBackBtn: $("settings-back-btn"),
  settingsAvatar: $("settings-avatar"),
  settingsPhotoInput: $("settings-photo-input"),
  settingsName: $("settings-name"),
  settingsAbout: $("settings-about"),
  settingsNameValue: $("settings-name-value"),
  settingsAboutValue: $("settings-about-value"),
  settingsMobileValue: $("settings-mobile-value"),
  editNameForm: $("edit-name-form"),
  editNameInput: $("edit-name-input"),
  editAboutForm: $("edit-about-form"),
  editAboutInput: $("edit-about-input"),
  editMobileForm: $("edit-mobile-form"),
  editMobileInput: $("edit-mobile-input"),
  editMobilePassword: $("edit-mobile-password"),
  sendEmailVerifyBtn: $("send-email-verify-btn"),
  settingsLogoutBtn: $("settings-logout-btn"),
  shareAppBtn: $("share-app-btn"),
  privacyBtn: $("privacy-btn"),
  privacyForm: $("privacy-form"),
  privacyPhoto: $("privacy-photo"),
  privacyAbout: $("privacy-about"),
  privacyLastSeen: $("privacy-last-seen"),
  blockListBtn: $("block-list-btn"),
  qrBtn: $("qr-btn"),
  qrCard: $("qr-card"),
  profileQr: $("profile-qr"),
  profileQrShareBtn: $("profile-qr-share-btn"),
  profileQrDownloadBtn: $("profile-qr-download-btn"),
  wallpaperBtn: $("wallpaper-btn"),
  wallpaperForm: $("wallpaper-form"),
  wallpaperSelect: $("wallpaper-select"),
  notificationsBtn: $("notifications-btn"),
  chatList: $("chat-list"),
  emptyChats: $("empty-chats"),
  homeTabChats: $("home-tab-chats"),
  homeTabStatus: $("home-tab-status"),
  homeTabCalls: $("home-tab-calls"),
  homeChatBadge: $("home-chat-badge"),
  homeStatusBadge: $("home-status-badge"),
  statusPanel: $("status-panel"),
  callsPanel: $("calls-panel"),
  statusForm: $("status-form"),
  statusInput: $("status-input"),
  statusImageInput: $("status-image-input"),
  statusSongBtn: $("status-song-btn"),
  statusSongPanel: $("status-song-panel"),
  statusSongSearch: $("status-song-search"),
  statusSongSearchBtn: $("status-song-search-btn"),
  selectedSong: $("selected-song"),
  songResults: $("song-results"),
  statusPreviewPanel: $("status-preview-panel"),
  statusPreviewMedia: $("status-preview-media"),
  statusOverlayInput: $("status-overlay-input"),
  statusDrawInput: $("status-draw-input"),
  statusPrivacySelect: $("status-privacy-select"),
  statusList: $("status-list"),
  emptyStatus: $("empty-status"),
  scanQrBtn: $("scan-qr-btn"),
  qrScanner: $("qr-scanner"),
  closeQrScannerBtn: $("close-qr-scanner-btn"),
  qrScanVideo: $("qr-scan-video"),
  qrScanStatus: $("qr-scan-status"),
  qrTabScan: $("qr-tab-scan"),
  qrTabMy: $("qr-tab-my"),
  qrScanPane: $("qr-scan-pane"),
  qrMyPane: $("qr-my-pane"),
  qrPaneSlider: $("qr-pane-slider"),
  qrPaneTrack: $("qr-pane-track"),
  qrModalProfileQr: $("qr-modal-profile-qr"),
  qrModalShareBtn: $("qr-modal-share-btn"),
  qrModalDownloadBtn: $("qr-modal-download-btn"),
  qrTorchBtn: $("qr-torch-btn"),
  startChatBtn: $("start-chat-btn"),
  emptyStartChatBtn: $("empty-start-chat-btn"),
  pickContactBtn: $("pick-contact-btn"),
  openCreateGroupBtn: $("open-create-group-btn"),
  createGroupForm: $("create-group-form"),
  groupNameInput: $("group-name-input"),
  groupDescriptionInput: $("group-description-input"),
  groupPhotoInput: $("group-photo-input"),
  groupPhotoPreview: $("group-photo-preview"),
  groupMemberPicker: $("group-member-picker"),
  searchScreen: $("search-screen"),
  closeSearchBtn: $("close-search-btn"),
  searchForm: $("search-form"),
  searchMobile: $("search-mobile"),
  searchResult: $("search-result"),
  searchBtn: $("search-btn"),
  searchChatList: $("search-chat-list"),
  emptySearchChats: $("empty-search-chats"),
  backHomeBtn: $("back-home-btn"),
  receiverAvatar: $("receiver-avatar"),
  receiverName: $("receiver-name"),
  receiverStatus: $("receiver-status"),
  openReceiverProfileBtn: $("open-receiver-profile-btn"),
  receiverProfileScreen: $("receiver-profile-screen"),
  receiverProfileBackBtn: $("receiver-profile-back-btn"),
  fullUserAvatar: $("full-user-avatar"),
  fullUserName: $("full-user-name"),
  fullUserAbout: $("full-user-about"),
  fullUserMobile: $("full-user-mobile"),
  fullUserEmail: $("full-user-email"),
  fullUserStatus: $("full-user-status"),
  profileClearChatBtn: $("profile-clear-chat-btn"),
  contactNameForm: $("contact-name-form"),
  contactNameInput: $("contact-name-input"),
  starFriendBtn: $("star-friend-btn"),
  blockUserBtn: $("block-user-btn"),
  groupEditForm: $("group-edit-form"),
  editGroupName: $("edit-group-name"),
  editGroupDescription: $("edit-group-description"),
  editGroupPhoto: $("edit-group-photo"),
  editGroupPhotoPreview: $("edit-group-photo-preview"),
  groupMemberVisibility: $("group-member-visibility"),
  groupMembersCard: $("group-members-card"),
  groupMemberCount: $("group-member-count"),
  groupMemberList: $("group-member-list"),
  groupAddMemberPicker: $("group-add-member-picker"),
  leaveGroupBtn: $("leave-group-btn"),
  deleteGroupBtn: $("delete-group-btn"),
  mediaGalleryCard: $("media-gallery-card"),
  mediaCount: $("media-count"),
  mediaGallery: $("media-gallery"),
  messages: $("messages"),
  messageForm: $("message-form"),
  messageInput: $("message-input"),
  attachMenuBtn: $("attach-menu-btn"),
  messagePhotoInput: $("message-photo-input"),
  messageCameraInput: $("message-camera-input"),
  messageFileInput: $("message-file-input"),
  chatWallpaperImageInput: $("chat-wallpaper-image-input"),
  sendMessageBtn: $("send-message-btn"),
  replyPreview: $("reply-preview"),
  replyTitle: $("reply-title"),
  replyText: $("reply-text"),
  cancelReplyBtn: $("cancel-reply-btn"),
  photoViewer: $("photo-viewer"),
  photoViewerTitle: $("photo-viewer-title"),
  viewerPhotoList: $("viewer-photo-list"),
  closePhotoViewerBtn: $("close-photo-viewer-btn"),
  profilePreviewPop: $("profile-preview-pop"),
  profilePreviewName: $("profile-preview-name"),
  profilePreviewPhoto: $("profile-preview-photo"),
  profilePreviewPhotoBtn: $("profile-preview-photo-btn"),
  profilePreviewChatBtn: $("profile-preview-chat-btn"),
  profilePreviewInfoBtn: $("profile-preview-info-btn"),
  photoCropper: $("photo-cropper"),
  cropStage: $("crop-stage"),
  cropImage: $("crop-image"),
  cropZoom: $("crop-zoom"),
  cropDoneBtn: $("crop-done-btn"),
  cropCancelBtn: $("crop-cancel-btn"),
  cropResetBtn: $("crop-reset-btn"),
  messageActions: $("message-actions"),
  actionReplyBtn: $("action-reply-btn"),
  actionCopyBtn: $("action-copy-btn"),
  actionEditBtn: $("action-edit-btn"),
  actionForwardBtn: $("action-forward-btn"),
  actionDeleteBtn: $("action-delete-btn"),
  actionCancelBtn: $("action-cancel-btn"),
  reactionActions: $("reaction-actions"),
  reactionCancelBtn: $("reaction-cancel-btn"),
  forwardActions: $("forward-actions"),
  forwardChatList: $("forward-chat-list"),
  forwardCancelBtn: $("forward-cancel-btn"),
  deleteActions: $("delete-actions"),
  deleteForMeBtn: $("delete-for-me-btn"),
  deleteForEveryoneBtn: $("delete-for-everyone-btn"),
  deleteCancelBtn: $("delete-cancel-btn"),
  chatMenuBtn: $("chat-menu-btn"),
  chatMenuActions: $("chat-menu-actions"),
  chatMenuPinBtn: $("chat-menu-pin-btn"),
  chatMenuMuteBtn: $("chat-menu-mute-btn"),
  chatMenuWallpaperBtn: $("chat-menu-wallpaper-btn"),
  chatMenuProfileBtn: $("chat-menu-profile-btn"),
  chatMenuCancelBtn: $("chat-menu-cancel-btn"),
  wallpaperActions: $("wallpaper-actions"),
  wallpaperChangeBtn: $("wallpaper-change-btn"),
  wallpaperDeleteBtn: $("wallpaper-delete-btn"),
  wallpaperCancelBtn: $("wallpaper-cancel-btn"),
  clearChatConfirm: $("clear-chat-confirm"),
  clearChatConfirmBtn: $("clear-chat-confirm-btn"),
  clearChatCancelBtn: $("clear-chat-cancel-btn"),
  attachActions: $("attach-actions"),
  attachCameraBtn: $("attach-camera-btn"),
  attachImageBtn: $("attach-image-btn"),
  attachFileBtn: $("attach-file-btn"),
  attachCancelBtn: $("attach-cancel-btn"),
  shareActions: $("share-actions"),
  shareNativeBtn: $("share-native-btn"),
  shareWhatsappBtn: $("share-whatsapp-btn"),
  shareInstagramBtn: $("share-instagram-btn"),
  shareCopyBtn: $("share-copy-btn"),
  shareCancelBtn: $("share-cancel-btn"),
  statusViewer: $("status-viewer"),
  statusViewerBody: $("status-viewer-body"),
  closeStatusViewerBtn: $("close-status-viewer-btn"),
  inAppNotification: $("in-app-notification"),
  toast: $("toast"),
};

function screenIdFor(screen) {
  if (screen === els.loadingScreen) return "loading";
  if (screen === els.loginScreen) return "login";
  if (screen === els.profileScreen) return "profile";
  if (screen === els.homeScreen) return "home";
  if (screen === els.searchScreen) return "search";
  if (screen === els.settingsScreen) return "settings";
  if (screen === els.chatScreen) return "chat";
  if (screen === els.receiverProfileScreen) return "receiver-profile";
  return "home";
}

function screenForId(screenId) {
  return (
    {
      loading: els.loadingScreen,
      login: els.loginScreen,
      profile: els.profileScreen,
      home: els.homeScreen,
      search: els.searchScreen,
      settings: els.settingsScreen,
      chat: els.chatScreen,
      "receiver-profile": els.receiverProfileScreen,
    }[screenId] || els.homeScreen
  );
}

function syncBrowserHistory(screenId, replace = false) {
  if (!window.history?.pushState) return;
  const stateObj = { zopchat: true, screenId };
  if (!state.historyReady || replace) {
    window.history.replaceState(stateObj, "", window.location.href);
    state.historyReady = true;
    return;
  }
  if (state.handlingPopState || state.currentScreenId === screenId) return;
  window.history.pushState(stateObj, "", window.location.href);
}

function showScreen(screen, options = {}) {
  const screenId = screenIdFor(screen);
  [els.loadingScreen, els.loginScreen, els.profileScreen, els.homeScreen, els.searchScreen, els.settingsScreen, els.chatScreen, els.receiverProfileScreen].forEach((el) => {
    el.hidden = el !== screen;
    el.classList.toggle("is-active", el === screen);
  });
  if (options.history !== false) syncBrowserHistory(screenId, options.replaceHistory === true);
  state.currentScreenId = screenId;
}

function cleanupChatScreenState() {
  if (state.unsubMessages) state.unsubMessages();
  if (state.unsubReceiver) state.unsubReceiver();
  if (state.unsubActiveChat) state.unsubActiveChat();
  setTyping(false);
  state.unsubMessages = null;
  state.unsubReceiver = null;
  state.unsubActiveChat = null;
  state.activeChatId = null;
  state.activeReceiver = null;
  state.activeChatMeta = null;
  state.messageElements.clear();
  state.messageData.clear();
  clearReply();
}

function handleAppBackTo(screenId) {
  state.handlingPopState = true;
  if (els.statusViewer && !els.statusViewer.hidden) {
    closeStatusViewer();
    state.handlingPopState = false;
    return;
  }
  if (els.photoViewer && !els.photoViewer.hidden) {
    closePhotoViewer();
    state.handlingPopState = false;
    return;
  }
  if (els.profilePreviewPop && !els.profilePreviewPop.hidden) {
    closeProfilePreview();
    state.handlingPopState = false;
    return;
  }
  if (els.qrScanner && !els.qrScanner.hidden) {
    closeQrScanner();
    state.handlingPopState = false;
    return;
  }
  if (els.photoCropper && !els.photoCropper.hidden) {
    closePhotoCropper();
    state.handlingPopState = false;
    return;
  }
  if (els.wallpaperActions && !els.wallpaperActions.hidden) {
    els.wallpaperActions.hidden = true;
    state.handlingPopState = false;
    return;
  }
  if (els.clearChatConfirm && !els.clearChatConfirm.hidden) {
    els.clearChatConfirm.hidden = true;
    state.handlingPopState = false;
    return;
  }
  if (screenId === "home") {
    cleanupChatScreenState();
    showScreen(els.homeScreen, { history: false });
  } else if (screenId === "chat" && state.activeChatId) {
    showScreen(els.chatScreen, { history: false });
  } else if (screenId === "receiver-profile" && state.activeChatId) {
    showScreen(els.receiverProfileScreen, { history: false });
  } else if (["search", "settings", "profile", "login"].includes(screenId)) {
    showScreen(screenForId(screenId), { history: false });
  } else {
    cleanupChatScreenState();
    showScreen(els.homeScreen, { history: false });
  }
  state.handlingPopState = false;
}

function showToast(message, type = "info") {
  els.toast.textContent = message;
  els.toast.style.background = type === "error" ? "#9f2f2f" : "#10201c";
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 3200);
}

function setButtonLoading(button, isLoading, loadingText = "Please wait...") {
  if (!button) return;
  if (isLoading) {
    button.dataset.label = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

function friendlyAuthError() {
  return "We could not sign you in. Please try again.";
}

function getSessionStorageKey(uid = state.currentUser?.uid) {
  return uid ? `zopchat-active-session-${uid}` : "zopchat-active-session";
}

function createSessionId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getOrCreateLocalSession(uid) {
  const key = getSessionStorageKey(uid);
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    sessionId = createSessionId();
    localStorage.setItem(key, sessionId);
  }
  state.sessionId = sessionId;
  return sessionId;
}

function normalizeMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) return digits;
  if (digits.length === 13 && digits.startsWith("091") && /^[6-9]/.test(digits.slice(3))) return digits.slice(1);
  return digits;
}

function isValidIndianMobile(value) {
  return /^91[6-9]\d{9}$/.test(normalizeMobile(value));
}

function deterministicChatId(uidA, uidB) {
  return uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`;
}

function mobileAuthEmail(mobile) {
  return `${mobile}@mobile.zopchat.app`;
}

function formatTime(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatLastSeen(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Offline";
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return `${sameDay ? "Last seen today" : "Last seen"} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function formatMobileDisplay(mobile) {
  const normalized = normalizeMobile(mobile);
  if (/^91[6-9]\d{9}$/.test(normalized)) return `+91 ${normalized.slice(2)}`;
  return mobile || "-";
}

function canSee(profile, field) {
  return (profile?.privacy?.[field] || "everyone") !== "nobody";
}

function contactDisplayName(profile, fallback = "ZopChat User") {
  if (!profile?.uid) return profile?.name || fallback;
  return state.currentProfile?.contactNames?.[profile.uid] || profile.name || fallback;
}

function isBlockedWith(profile) {
  return Boolean(state.currentProfile?.blockedUsers?.[profile?.uid] || profile?.blockedUsers?.[state.currentUser?.uid]);
}

function timestampMillis(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function canViewStatus(status) {
  if (status.uid === state.currentUser?.uid) return true;
  const privacy = status.privacy || "contacts";
  if (privacy === "everyone") return true;
  if (privacy === "contacts") {
    const chat = state.chats.find((c) => c.other?.uid === status.uid);
    return Boolean(chat);
  }
  return false;
}

function hasSeenStatus(status) {
  return Boolean(status.seenBy?.[state.currentUser?.uid]);
}

function statusSeenCount(status) {
  return Object.keys(status.seenBy || {}).length;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

async function loadAppConfig() {
  try {
    const snap = await getDoc(doc(db, "appConfig", "share"));
    if (!snap.exists()) return;
    const config = snap.data();
    if (config.downloadUrl) zopchatDownloadUrl = config.downloadUrl;
    if (config.shareText) zopchatShareText = config.shareText;
  } catch (error) {
    console.warn("App config load failed", error);
  }
}

async function claimActiveSession(user) {
  if (!user) return;
  const sessionId = getOrCreateLocalSession(user.uid);
  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      email: user.email || "",
      activeSessionId: sessionId,
      activeSessionAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function listenToOwnSession(uid) {
  if (state.unsubOwnSession) state.unsubOwnSession();
  state.unsubOwnSession = onSnapshot(doc(db, "users", uid), async (snapshot) => {
    const profile = snapshot.data();
    if (!profile?.activeSessionId || !state.sessionId) return;
    if (profile.activeSessionId !== state.sessionId) {
      state.isForcedLogout = true;
      cleanupRealtime();
      showToast("You logged in on another phone. This phone was logged out.", "error");
      await signOut(auth);
    }
  });
}

async function routeForUser(user) {
  state.currentUser = user;
  if (!user) {
    cleanupRealtime();
    state.currentProfile = null;
    state.sessionId = null;
    state.isForcedLogout = false;
    showScreen(els.loginScreen, { replaceHistory: true });
    return;
  }

  await claimActiveSession(user);
  listenToOwnSession(user.uid);
  const profile = await getUserProfile(user.uid);
  state.currentProfile = profile;

  if (profile?.isProfileComplete) {
    await setOnlineStatus(true);
    state.currentProfile = { ...profile, online: true };
    populateHomeProfile(profile);
    showScreen(els.homeScreen, { replaceHistory: true });
    listenToChats();
    listenToStatuses();
  } else {
    populateProfileForm(profile);
    showScreen(els.profileScreen, { replaceHistory: true });
  }
}

async function setOnlineStatus(isOnline) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await updateDoc(doc(db, "users", user.uid), {
      online: isOnline,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Online status update failed", error);
  }
}

function populateProfileForm(profile = {}) {
  const user = state.currentUser;
  const photo = profile?.photoURL || user?.photoURL || DEFAULT_AVATAR;
  els.profileName.value = profile?.name || user?.displayName || "";
  els.profileMobile.value = profile?.mobile || "";
  els.profilePassword.value = "";
  els.profilePreview.src = photo;
  state.selectedPhotoFile = null;
}

function populateHomeProfile(profile) {
  els.homeAvatar.src = profile?.photoURL || DEFAULT_AVATAR;
  applyWallpaper(profile?.wallpaper || "default");
}

function profileQrUrl(profile = state.currentProfile) {
  const data = `zopchat:user:${profile?.mobile || profile?.uid || ""}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`;
}

async function shareProfileQr() {
  const text = `Scan my ZopChat QR to start chatting. ${profileQrUrl()}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: "My ZopChat QR", text });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  await navigator.clipboard?.writeText(text);
  showToast("QR link copied.");
}

function downloadProfileQr() {
  const link = document.createElement("a");
  link.href = profileQrUrl();
  link.download = "zopchat-qr.png";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function renderSettings(profile = state.currentProfile) {
  if (!profile) return;
  els.settingsAvatar.src = profile.photoURL || DEFAULT_AVATAR;
  els.settingsName.textContent = profile.name || "ZopChat User";
  els.settingsAbout.textContent = profile.about || "Hey there! I am using ZopChat.";
  els.settingsNameValue.textContent = profile.name || "-";
  els.settingsAboutValue.textContent = profile.about || "-";
  els.settingsMobileValue.textContent = formatMobileDisplay(profile.mobile);
  els.privacyPhoto.value = profile.privacy?.photo || "everyone";
  els.privacyAbout.value = profile.privacy?.about || "everyone";
  els.privacyLastSeen.value = profile.privacy?.lastSeen || "everyone";
  els.wallpaperSelect.value = profile.wallpaper || "default";
  els.profileQr.src = profileQrUrl(profile);
  if (els.qrModalProfileQr) els.qrModalProfileQr.src = profileQrUrl(profile);
  els.editNameInput.value = profile.name || "";
  els.editAboutInput.value = profile.about || "";
  els.editMobileInput.value = "";
  els.editMobilePassword.value = "";
}

function cleanupRealtime() {
  if (state.unsubChats) state.unsubChats();
  if (state.unsubMessages) state.unsubMessages();
  if (state.unsubReceiver) state.unsubReceiver();
  if (state.unsubActiveChat) state.unsubActiveChat();
  if (state.unsubOwnSession) state.unsubOwnSession();
  if (state.unsubStatuses) state.unsubStatuses();
  state.unsubChats = null;
  state.unsubMessages = null;
  state.unsubReceiver = null;
  state.unsubActiveChat = null;
  state.unsubOwnSession = null;
  state.unsubStatuses = null;
  state.messageElements.clear();
  state.messageData.clear();
  state.selectedMessageIds.clear();
  clearReply();
}

async function handleGoogleLogin() {
  setButtonLoading(els.googleLoginBtn, true, "Opening Google...");
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error(error);
    showToast(friendlyAuthError(), "error");
  } finally {
    setButtonLoading(els.googleLoginBtn, false);
  }
}

async function handleMobileLogin(event) {
  event.preventDefault();
  const mobile = normalizeMobile(els.loginMobile.value);
  const password = els.loginPassword.value.trim();

  if (!mobile || !password) {
    showToast("Enter mobile number and password.", "error");
    return;
  }

  if (!isValidIndianMobile(mobile)) {
    showToast("Enter a valid Indian mobile number.", "error");
    return;
  }

  setButtonLoading($("mobile-login-btn"), true, "Checking...");
  try {
    await signInWithEmailAndPassword(auth, mobileAuthEmail(mobile), password);
  } catch (error) {
    console.error(error);
    showToast("Mobile number or password is incorrect.", "error");
  } finally {
    setButtonLoading($("mobile-login-btn"), false);
  }
}

async function handleEmailSignup(event) {
  event.preventDefault();
  const email = els.signupEmail.value.trim();
  const password = els.signupPassword.value.trim();
  if (!email || password.length < 6) {
    showToast("Enter email and minimum 6 character password.", "error");
    return;
  }
  setButtonLoading(els.emailSignupBtn, true, "Creating...");
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    showToast("Account created. Complete your profile.");
  } catch (error) {
    console.error(error);
    showToast(friendlyAuthError(), "error");
  } finally {
    setButtonLoading(els.emailSignupBtn, false);
  }
}

async function uploadProfilePhoto(file) {
  if (!file) return null;
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a valid image file.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_API, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Profile photo upload failed.");
  }

  const data = await response.json();
  if (!data.secure_url) {
    throw new Error("Cloudinary did not return an image URL.");
  }

  return data.secure_url;
}

async function uploadImageToCloudinary(file) {
  return uploadProfilePhoto(file);
}

async function uploadFileToCloudinary(file) {
  if (!file) return null;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_FILE_API, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "File upload failed.");
  }
  if (!data.secure_url) throw new Error("Cloudinary did not return a file URL.");
  return data.secure_url;
}

function cloudinaryAttachmentUrl(url) {
  if (!url || !url.includes("/upload/")) return url;
  if (url.includes("/upload/fl_attachment/")) return url;
  return url.replace("/upload/", "/upload/fl_attachment/");
}

function resetCropPosition() {
  state.cropScale = state.cropBaseScale;
  state.cropX = 0;
  state.cropY = 0;
  if (els.cropZoom) els.cropZoom.value = "1";
  renderCropImage();
}

function clampCropPosition() {
  if (!state.cropImage || !els.cropStage) return;
  const stageSize = els.cropStage.clientWidth;
  const width = state.cropImage.naturalWidth * state.cropScale;
  const height = state.cropImage.naturalHeight * state.cropScale;
  const maxX = Math.max(0, (width - stageSize) / 2);
  const maxY = Math.max(0, (height - stageSize) / 2);
  state.cropX = Math.max(-maxX, Math.min(maxX, state.cropX));
  state.cropY = Math.max(-maxY, Math.min(maxY, state.cropY));
}

function renderCropImage() {
  if (!state.cropImage || !els.cropImage) return;
  clampCropPosition();
  els.cropImage.style.width = `${state.cropImage.naturalWidth * state.cropScale}px`;
  els.cropImage.style.height = `${state.cropImage.naturalHeight * state.cropScale}px`;
  els.cropImage.style.transform = `translate(calc(-50% + ${state.cropX}px), calc(-50% + ${state.cropY}px))`;
}

function openPhotoCropper(file, target) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("Choose a valid image file.", "error");
    return;
  }

  if (state.cropObjectUrl) URL.revokeObjectURL(state.cropObjectUrl);
  state.cropTarget = target;
  state.cropFile = file;
  state.cropObjectUrl = URL.createObjectURL(file);
  state.cropImage = null;
  state.cropX = 0;
  state.cropY = 0;
  els.cropZoom.value = "1";
  els.cropImage.src = state.cropObjectUrl;
  els.photoCropper.hidden = false;
}

function closePhotoCropper() {
  els.photoCropper.hidden = true;
  els.cropImage.removeAttribute("src");
  if (state.cropObjectUrl) URL.revokeObjectURL(state.cropObjectUrl);
  state.cropObjectUrl = "";
  state.cropTarget = null;
  state.cropFile = null;
  state.cropImage = null;
  state.cropDragging = false;
}

async function createCroppedProfileFile() {
  if (!state.cropImage || !els.cropStage || !state.cropFile) return null;
  const outputSize = 640;
  const stageSize = els.cropStage.clientWidth;
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputSize, outputSize);

  const drawnWidth = state.cropImage.naturalWidth * state.cropScale;
  const drawnHeight = state.cropImage.naturalHeight * state.cropScale;
  const sourceScale = outputSize / stageSize;
  const drawX = (stageSize / 2 - drawnWidth / 2 + state.cropX) * sourceScale;
  const drawY = (stageSize / 2 - drawnHeight / 2 + state.cropY) * sourceScale;
  context.drawImage(state.cropImage, drawX, drawY, drawnWidth * sourceScale, drawnHeight * sourceScale);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("Could not crop this photo.");
  const baseName = (state.cropFile.name || "profile-photo").replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}-zopchat.jpg`, { type: "image/jpeg" });
}

async function finishPhotoCrop() {
  try {
    const croppedFile = await createCroppedProfileFile();
    if (!croppedFile) return;
    const previewUrl = URL.createObjectURL(croppedFile);

    if (state.cropTarget === "setup") {
      state.selectedPhotoFile = croppedFile;
      els.profilePreview.src = previewUrl;
      closePhotoCropper();
      return;
    }

    if (state.cropTarget === "settings") {
      closePhotoCropper();
      await updateSettingsPhoto(croppedFile);
      URL.revokeObjectURL(previewUrl);
    }
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not crop this photo.", "error");
  }
}

async function handleProfileSave(event) {
  event.preventDefault();
  const user = state.currentUser;
  if (!user) return;

  const name = els.profileName.value.trim();
  const mobile = normalizeMobile(els.profileMobile.value);
  const password = els.profilePassword.value.trim();

  if (!name) {
    showToast("Name is required.", "error");
    return;
  }
  if (!isValidIndianMobile(mobile)) {
    showToast("Enter a valid Indian mobile number.", "error");
    return;
  }
  if (password.length < 6) {
    showToast("Password must be at least 6 characters.", "error");
    return;
  }

  setButtonLoading(els.saveProfileBtn, true, "Saving...");
  try {
    let photoURL = state.currentProfile?.photoURL || user.photoURL || DEFAULT_AVATAR;
    if (state.selectedPhotoFile) {
      els.saveProfileBtn.textContent = "Uploading photo...";
      photoURL = await uploadProfilePhoto(state.selectedPhotoFile);
      els.saveProfileBtn.textContent = "Saving...";
    }

    const existingMobileSnap = await getDoc(doc(db, "mobileNumbers", mobile));
    if (existingMobileSnap.exists() && existingMobileSnap.data().uid !== user.uid) {
      throw new Error("MOBILE_EXISTS");
    }

    await ensureMobilePasswordCredential(mobile, password, state.currentProfile?.mobile && state.currentProfile.mobile !== mobile);

    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, "users", user.uid);
      const mobileRef = doc(db, "mobileNumbers", mobile);
      const mobileLoginRef = doc(db, "mobileLogin", mobile);
      const [userSnap, mobileSnap] = await Promise.all([transaction.get(userRef), transaction.get(mobileRef)]);
      const existingMobile = mobileSnap.data();

      if (mobileSnap.exists() && existingMobile.uid !== user.uid) {
        throw new Error("MOBILE_EXISTS");
      }

      const existingUser = userSnap.data() || {};
      const now = serverTimestamp();
      const oldMobile = existingUser.mobile && existingUser.mobile !== mobile ? existingUser.mobile : "";
      transaction.set(
        userRef,
        {
          uid: user.uid,
          name,
          email: user.email || existingUser.email || "",
          mobile,
          photoURL,
          googlePhotoURL: user.photoURL || existingUser.googlePhotoURL || "",
          about: existingUser.about || "Hey there! I am using ZopChat.",
          loginMethods: ["google", "mobilePassword"],
          isProfileComplete: true,
          createdAt: existingUser.createdAt || now,
          updatedAt: now,
          lastSeen: now,
          online: true,
        },
        { merge: true },
      );

      transaction.set(
        mobileRef,
        {
          uid: user.uid,
          email: user.email || "",
          createdAt: existingMobile?.createdAt || now,
        },
        { merge: true },
      );

      if (oldMobile) {
        transaction.delete(doc(db, "mobileNumbers", oldMobile));
        transaction.delete(doc(db, "mobileLogin", oldMobile));
      }

      // V1 uses Firebase Email/Password Auth with a synthetic email derived from mobile.
      // If you later move mobile login to Cloud Functions, replace this mapping with
      // backend password hashing, rate limiting, and custom auth tokens.
      transaction.set(
        mobileLoginRef,
        {
          uid: user.uid,
          passwordHash_or_demoPassword: "managed-by-firebase-auth",
          createdAt: existingUser.createdAt || now,
          updatedAt: now,
        },
        { merge: true },
      );
    });

    state.currentProfile = await getUserProfile(user.uid);
    populateHomeProfile(state.currentProfile);
    showToast("Profile saved.");
    showScreen(els.homeScreen);
    listenToChats();
    listenToStatuses();
  } catch (error) {
    console.error(error);
    const message =
      error.message === "MOBILE_EXISTS"
        ? "This mobile number is already linked with another ZopChat account."
        : error.message || "Could not save your profile.";
    showToast(message, "error");
  } finally {
    setButtonLoading(els.saveProfileBtn, false);
  }
}

async function ensureMobilePasswordCredential(mobile, password, forceRelink = false) {
  const credential = EmailAuthProvider.credential(mobileAuthEmail(mobile), password);
  const user = auth.currentUser;
  const hasPasswordProvider = user.providerData.some((providerInfo) => providerInfo.providerId === "password");

  try {
    if (hasPasswordProvider && forceRelink) {
      await unlink(user, "password");
      await linkWithCredential(user, credential);
    } else if (hasPasswordProvider) {
      await updatePassword(user, password);
    } else {
      await linkWithCredential(user, credential);
    }
  } catch (error) {
    if (error.code === "auth/provider-already-linked") {
      await updatePassword(user, password);
      return;
    }
    if (error.code === "auth/email-already-in-use" || error.code === "auth/credential-already-in-use") {
      throw new Error("This mobile number is already linked with another ZopChat account.");
    }
    throw error;
  }
}

function listenToChats() {
  if (!state.currentUser) return;
  if (state.unsubChats) state.unsubChats();

  // Listen to every chat where the current user is a member, then sort locally.
  // This keeps new/incoming chats visible like WhatsApp without requiring a
  // Firestore composite index for `array-contains + orderBy`.
  const chatsQuery = query(collection(db, "chats"), where("members", "array-contains", state.currentUser.uid), limit(100));

  state.unsubChats = onSnapshot(
    chatsQuery,
    async (snapshot) => {
      const chats = [];
      for (const chatDoc of snapshot.docs) {
        const chat = { id: chatDoc.id, ...chatDoc.data() };
        const otherUid = chat.type === "group" ? null : chat.members?.find((uid) => uid !== state.currentUser.uid);
        const other = otherUid ? await getUserProfile(otherUid) : null;
        chats.push({ ...chat, other });
      }
      chats.sort((a, b) => timestampMillis(b.lastMessageAt || b.updatedAt || b.createdAt) - timestampMillis(a.lastMessageAt || a.updatedAt || a.createdAt));
      detectIncomingChatNotifications(chats);
      state.chats = chats;
      renderChatList(chats);
      renderSearchChatList();
    },
    (error) => {
      console.error(error);
      showToast("Could not load chats.", "error");
    },
  );
}

function chatUnreadCount(chat) {
  if (chat?.id === state.activeChatId) return 0;
  if (!chat || chat.lastMessageSenderId === state.currentUser?.uid) return 0;
  const lastRead = timestampMillis(chat.lastReadAt?.[state.currentUser?.uid]);
  const lastMessage = timestampMillis(chat.lastMessageAt || chat.updatedAt || chat.createdAt);
  if (lastRead && lastRead >= lastMessage) return 0;
  const explicit = Number(chat.unreadCounts?.[state.currentUser?.uid] || chat.unread?.[state.currentUser?.uid] || 0);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return lastMessage > lastRead ? 1 : 0;
}

function chatTypingText(chat) {
  const typing = chat?.typing || {};
  const typingUid = Object.keys(typing).find((uid) => uid !== state.currentUser?.uid && typing[uid]);
  return typingUid ? "typing..." : "";
}

function isMutedChat(chatId) {
  return Boolean(state.currentProfile?.mutedChats?.[chatId]);
}

function detectIncomingChatNotifications(chats) {
  chats.forEach((chat) => {
    const lastTime = timestampMillis(chat.lastMessageAt || chat.updatedAt || chat.createdAt);
    const previous = state.chatLastActivity.get(chat.id);
    if (previous && lastTime > previous && chat.lastMessageSenderId && chat.lastMessageSenderId !== state.currentUser?.uid && chat.id !== state.activeChatId && !isMutedChat(chat.id)) {
      const title = chat.type === "group" ? chat.groupName || "Group" : contactDisplayName(chat.other);
      showInAppNotification(chat.id, title, chat.lastMessage || "New message");
    }
    state.chatLastActivity.set(chat.id, lastTime);
  });
}

function showInAppNotification(chatId, title, message) {
  if (!els.inAppNotification) return;
  state.notificationChatId = chatId;
  els.inAppNotification.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
  els.inAppNotification.hidden = false;
  window.clearTimeout(showInAppNotification.timer);
  showInAppNotification.timer = window.setTimeout(() => {
    els.inAppNotification.hidden = true;
  }, 5200);
}

function renderChatList(chats) {
  els.chatList.innerHTML = "";
  els.emptyChats.hidden = chats.length > 0;
  const sortedChats = [...chats].sort((a, b) => {
    const ap = state.currentProfile?.pinnedChats?.[a.id] ? 1 : 0;
    const bp = state.currentProfile?.pinnedChats?.[b.id] ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return timestampMillis(b.lastMessageAt || b.updatedAt || b.createdAt) - timestampMillis(a.lastMessageAt || a.updatedAt || a.createdAt);
  });

  sortedChats.forEach((chat) => {
    const title = chat.type === "group" ? chat.groupName || "Group" : contactDisplayName(chat.other);
    const avatar = chat.type === "group" ? chat.groupPhotoURL || DEFAULT_AVATAR : chat.other?.photoURL || DEFAULT_AVATAR;
    const typingText = chatTypingText(chat);
    const preview = typingText || chat.lastMessage || "Start chatting";
    const unread = chatUnreadCount(chat);
    const muted = isMutedChat(chat.id);
    const starred = chat.other?.uid && state.currentProfile?.favoriteContacts?.[chat.other.uid];
    const button = document.createElement("button");
    button.className = `chat-item${unread ? " has-unread" : ""}${muted ? " is-muted" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <img class="chat-avatar" src="${escapeHtml(avatar)}" alt="${escapeHtml(title)}" data-chat-avatar="true" />
      <div class="chat-meta">
        <h4>${state.currentProfile?.pinnedChats?.[chat.id] ? "📌 " : ""}${starred ? "★ " : ""}${escapeHtml(title)} ${muted ? "🔕" : ""}</h4>
        <p class="${typingText ? "typing-preview" : ""}">${escapeHtml(preview)}</p>
      </div>
      <div class="chat-side">
        <p>${escapeHtml(formatTime(chat.lastMessageAt))}</p>
        ${unread ? `<span class="unread-badge">${unread > 99 ? "99+" : unread}</span>` : ""}
      </div>
    `;
    button.addEventListener("click", (event) => {
      if (event.target.closest("[data-chat-avatar]")) return;
      openChat(chat.id, chat.other, chat);
    });
    button.querySelector("[data-chat-avatar]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      openProfilePreview({
        title,
        photoURL: avatar,
        chatId: chat.id,
        profile: chat.other,
        chat,
      });
    });
    els.chatList.appendChild(button);
  });
  updateHomeBadges();
}

function updateHomeBadges() {
  const unread = state.chats.reduce((total, chat) => {
    return total + chatUnreadCount(chat);
  }, 0);
  if (els.homeChatBadge) {
    els.homeChatBadge.hidden = unread <= 0;
    els.homeChatBadge.textContent = unread > 99 ? "99+" : String(unread);
  }

  const expiry = Date.now() - 24 * 60 * 60 * 1000;
  const contactUids = new Set(state.chats.flatMap((chat) => chat.members || []));
  contactUids.delete(state.currentUser?.uid);
  const statusCount = state.statuses.filter((status) => {
    return contactUids.has(status.uid) && timestampMillis(status.createdAt) >= expiry && canViewStatus(status) && !hasSeenStatus(status);
  }).length;
  if (els.homeStatusBadge) {
    els.homeStatusBadge.hidden = statusCount <= 0;
    els.homeStatusBadge.textContent = statusCount > 99 ? "99+" : String(statusCount);
  }
}

function renderSearchChatList() {
  if (!els.searchChatList) return;
  const typed = normalizeMobile(els.searchMobile?.value || "");
  const filtered = state.chats.filter((chat) => {
    const other = chat.other;
    if (!other) return false;
    if (!typed || !isValidIndianMobile(typed)) return true;
    return other.mobile === typed;
  });

  els.searchChatList.innerHTML = "";
  els.emptySearchChats.hidden = filtered.length > 0;
  filtered.forEach((chat) => {
    if (chat.type === "group") return;
    const button = document.createElement("button");
    button.className = "chat-item";
    button.type = "button";
    button.innerHTML = `
      <img class="chat-avatar" src="${escapeHtml(chat.other?.photoURL || DEFAULT_AVATAR)}" alt="${escapeHtml(contactDisplayName(chat.other, "User"))}" data-chat-avatar="true" />
      <div class="chat-meta">
        <h4>${escapeHtml(contactDisplayName(chat.other))}</h4>
        <p>${escapeHtml(formatMobileDisplay(chat.other?.mobile) || chat.lastMessage || "")}</p>
      </div>
      <div class="chat-side">
        <p>${escapeHtml(formatTime(chat.lastMessageAt))}</p>
      </div>
    `;
    button.addEventListener("click", (event) => {
      if (event.target.closest("[data-chat-avatar]")) return;
      openChat(chat.id, chat.other, chat);
    });
    button.querySelector("[data-chat-avatar]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      openProfilePreview({
        title: contactDisplayName(chat.other, "Profile"),
        photoURL: chat.other?.photoURL || DEFAULT_AVATAR,
        chatId: chat.id,
        profile: chat.other,
        chat,
      });
    });
    els.searchChatList.appendChild(button);
  });
}

function setHomeTab(tab) {
  state.homeTab = tab;
  els.homeTabChats.classList.toggle("active", tab === "chats");
  els.homeTabStatus.classList.toggle("active", tab === "status");
  els.homeTabCalls.classList.toggle("active", tab === "calls");
  document.querySelector(".chat-list-wrap").hidden = tab !== "chats";
  els.statusPanel.hidden = tab !== "status";
  els.callsPanel.hidden = tab !== "calls";
  els.startChatBtn.hidden = tab !== "chats";
  if (tab === "status") renderStatuses();
  if (tab === "calls") showToast("Calls coming soon.");
}

function listenToStatuses() {
  if (state.unsubStatuses) state.unsubStatuses();
  state.unsubStatuses = onSnapshot(collection(db, "statuses"), (snapshot) => {
    state.statuses = snapshot.docs.map((statusDoc) => ({ id: statusDoc.id, ...statusDoc.data() }));
    renderStatuses();
  });
}

function renderStatuses() {
  if (!els.statusList) return;
  const contactUids = new Set(state.chats.flatMap((chat) => chat.members || []));
  contactUids.add(state.currentUser?.uid);
  const expiry = Date.now() - 24 * 60 * 60 * 1000;
  const visible = state.statuses
    .filter((status) => contactUids.has(status.uid) && timestampMillis(status.createdAt) >= expiry && canViewStatus(status))
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
  state.visibleStatuses = visible;

  els.emptyStatus.hidden = visible.length > 0;
  els.statusList.innerHTML = visible
    .map((status) => {
      const chat = state.chats.find((item) => item.other?.uid === status.uid);
      const isMine = status.uid === state.currentUser?.uid;
      const profile = isMine ? state.currentProfile : chat?.other;
      const seenMeta = isMine ? `Seen by ${statusSeenCount(status)}` : hasSeenStatus(status) ? "" : "New";
      const summary = status.imageURL
        ? status.songTitle
          ? `${status.songTitle} - Photo`
          : "Photo status"
        : status.audioURL
          ? status.songTitle || "Song status"
          : status.text || status.overlayText || status.drawText || "";
      return `
        <div class="status-item" data-status-id="${escapeHtml(status.id)}">
          <img src="${escapeHtml(profile?.photoURL || DEFAULT_AVATAR)}" alt="" />
          <div>
            <h4>${escapeHtml(isMine ? "My status" : contactDisplayName(profile))}</h4>
            <p>${escapeHtml(summary)}</p>
            <span>${escapeHtml(formatTime(status.createdAt))}${seenMeta ? ` - ${escapeHtml(seenMeta)}` : ""}</span>
          </div>
          ${!isMine && !hasSeenStatus(status) ? `<span class="status-new-dot" aria-hidden="true"></span>` : ""}
          ${isMine ? `<button class="text-btn danger" data-delete-status="${escapeHtml(status.id)}" type="button">Delete</button>` : ""}
        </div>
      `;
    })
    .join("");
  els.statusList.querySelectorAll("[data-delete-status]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteStatus(button.dataset.deleteStatus);
    });
  });
  els.statusList.querySelectorAll("[data-status-id]").forEach((item) => {
    item.addEventListener("click", () => openStatusViewer(item.dataset.statusId));
  });
  updateHomeBadges();
}

async function createStatus(event) {
  event.preventDefault();
  const text = els.statusInput.value.trim();
  const overlayText = els.statusOverlayInput?.value.trim() || "";
  const drawText = els.statusDrawInput?.value.trim() || "";
  const imageFile = els.statusImageInput?.files?.[0] || null;
  const song = state.selectedStatusSong;
  if ((!text && !overlayText && !drawText && !imageFile && !song) || !state.currentUser) return;
  let imageURL = "";
  if (imageFile) imageURL = await uploadImageToCloudinary(imageFile);
  await addDoc(collection(db, "statuses"), {
    uid: state.currentUser.uid,
    text,
    overlayText,
    drawText,
    imageURL,
    audioURL: song?.previewUrl || "",
    songTitle: song?.trackName || "",
    songArtist: song?.artistName || "",
    songArtwork: song?.artworkUrl100 || "",
    songViewUrl: song?.trackViewUrl || "",
    privacy: els.statusPrivacySelect?.value || "contacts",
    seenBy: {},
    createdAt: serverTimestamp(),
  });
  els.statusInput.value = "";
  if (els.statusOverlayInput) els.statusOverlayInput.value = "";
  if (els.statusDrawInput) els.statusDrawInput.value = "";
  if (els.statusImageInput) els.statusImageInput.value = "";
  clearSelectedStatusSong();
  renderStatusDraftPreview();
  showToast("Status posted.");
}

async function deleteStatus(id) {
  if (!id) return;
  await deleteDoc(doc(db, "statuses", id));
  showToast("Status deleted.");
}

function openStatusViewer(id) {
  const status = state.statuses.find((item) => item.id === id);
  if (!status || !els.statusViewer) return;
  state.activeStatusIndex = Math.max(0, state.visibleStatuses.findIndex((item) => item.id === id));
  renderStatusViewer(status);
  els.statusViewer.hidden = false;
  markStatusSeen(status);
}

function renderStatusViewer(status) {
  if (!status || !els.statusViewerBody) return;
  const chat = state.chats.find((item) => item.other?.uid === status.uid);
  const isMine = status.uid === state.currentUser?.uid;
  const profile = isMine ? state.currentProfile : chat?.other;
  els.statusViewerBody.innerHTML = `
    <div class="status-progress"><span></span></div>
    <div class="status-viewer-head">
      <img src="${escapeHtml(profile?.photoURL || DEFAULT_AVATAR)}" alt="" />
      <div><strong>${escapeHtml(isMine ? "My status" : contactDisplayName(profile))}</strong><span>${escapeHtml(formatTime(status.createdAt))}</span></div>
      ${isMine ? `<small class="status-seen-count">Seen by ${statusSeenCount(status)}</small>` : ""}
    </div>
    <div class="status-viewer-content">
      ${status.imageURL ? `<img src="${escapeHtml(status.imageURL)}" alt="Status photo" />` : ""}
      ${status.audioURL ? `<div class="status-song-card">${status.songArtwork ? `<img src="${escapeHtml(status.songArtwork)}" alt="" />` : ""}<div><strong>${escapeHtml(status.songTitle || "Song")}</strong><span>${escapeHtml(status.songArtist || "Online song")}</span><small>Preview courtesy of iTunes</small></div></div><audio src="${escapeHtml(status.audioURL)}" controls autoplay></audio>` : ""}
      ${status.text ? `<p>${escapeHtml(status.text)}</p>` : ""}
      ${status.overlayText ? `<p class="status-overlay-text">${escapeHtml(status.overlayText)}</p>` : ""}
      ${status.drawText ? `<p class="status-draw-text">${escapeHtml(status.drawText)}</p>` : ""}
    </div>
  `;
  els.statusViewerBody.querySelector("audio")?.play?.().catch(() => {});
}

async function markStatusSeen(status) {
  const uid = state.currentUser?.uid;
  if (!uid || !status?.id || status.uid === uid || hasSeenStatus(status)) return;
  try {
    await updateDoc(doc(db, "statuses", status.id), {
      [`seenBy.${uid}`]: serverTimestamp(),
    });
  } catch (error) {
    console.error(error);
  }
}

function clearSelectedStatusSong() {
  state.selectedStatusSong = null;
  state.statusPreviewAudio?.pause?.();
  state.statusPreviewAudio = null;
  if (els.selectedSong) {
    els.selectedSong.hidden = true;
    els.selectedSong.innerHTML = "";
  }
  if (els.songResults) els.songResults.innerHTML = "";
  renderStatusDraftPreview();
}

function renderSelectedStatusSong(song) {
  if (!song || !els.selectedSong) return;
  els.selectedSong.hidden = false;
  els.selectedSong.innerHTML = `
    ${song.artworkUrl100 ? `<img src="${escapeHtml(song.artworkUrl100)}" alt="" />` : ""}
    <div><strong>${escapeHtml(song.trackName || "Song")}</strong><span>${escapeHtml(song.artistName || "")}</span>${song.previewUrl ? `<audio src="${escapeHtml(song.previewUrl)}" controls autoplay></audio>` : ""}</div>
    <button class="text-btn danger" id="remove-status-song-btn" type="button">Remove</button>
  `;
  $("remove-status-song-btn")?.addEventListener("click", clearSelectedStatusSong);
  renderStatusDraftPreview();
}

function renderStatusDraftPreview() {
  if (!els.statusPreviewPanel || !els.statusPreviewMedia) return;
  if (state.statusPreviewImageUrl) URL.revokeObjectURL(state.statusPreviewImageUrl);
  const file = els.statusImageInput?.files?.[0] || null;
  state.statusPreviewImageUrl = file ? URL.createObjectURL(file) : "";
  const song = state.selectedStatusSong;
  const text = els.statusInput?.value.trim() || "";
  const overlayText = els.statusOverlayInput?.value.trim() || "";
  const drawText = els.statusDrawInput?.value.trim() || "";
  els.statusPreviewPanel.hidden = !state.statusPreviewImageUrl && !song && !text && !overlayText && !drawText;
  if (els.statusPreviewPanel.hidden) {
    els.statusPreviewMedia.innerHTML = "";
    return;
  }
  els.statusPreviewMedia.innerHTML = `
    <div class="status-preview-stage">
      ${state.statusPreviewImageUrl ? `<img src="${escapeHtml(state.statusPreviewImageUrl)}" alt="Status preview" />` : ""}
      ${text ? `<p>${escapeHtml(text)}</p>` : ""}
      ${overlayText ? `<p class="status-overlay-text">${escapeHtml(overlayText)}</p>` : ""}
      ${drawText ? `<p class="status-draw-text">${escapeHtml(drawText)}</p>` : ""}
      ${song ? `<div class="status-song-card floating">${song.artworkUrl100 ? `<img src="${escapeHtml(song.artworkUrl100)}" alt="" />` : ""}<div><strong>${escapeHtml(song.trackName || "Song")}</strong><span>${escapeHtml(song.artistName || "")}</span></div></div><audio src="${escapeHtml(song.previewUrl)}" controls autoplay></audio>` : ""}
    </div>
  `;
  els.statusPreviewMedia.querySelector("audio")?.play?.().catch(() => {});
}

async function searchOnlineStatusSongs() {
  const term = els.statusSongSearch.value.trim();
  if (!term) return;
  els.songResults.innerHTML = `<p class="muted">Searching songs...</p>`;
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=8`;
    const response = await fetch(url);
    const data = await response.json();
    const songs = (data.results || []).filter((song) => song.previewUrl);
    els.songResults.innerHTML = songs.length
      ? songs
          .map(
            (song, index) => `
        <div class="song-result" data-song-index="${index}">
          ${song.artworkUrl100 ? `<img src="${escapeHtml(song.artworkUrl100)}" alt="" />` : ""}
          <span><strong>${escapeHtml(song.trackName || "Song")}</strong><small>${escapeHtml(song.artistName || "")}</small></span>
          <div class="song-result-actions">
            <button class="secondary-btn compact" type="button" data-preview-song="${index}">Preview</button>
            <button class="primary-btn compact" type="button" data-use-song="${index}">Use</button>
          </div>
        </div>
      `,
          )
          .join("")
      : `<p class="muted">No online song found.</p>`;
    els.songResults.querySelectorAll("[data-preview-song]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const song = songs[Number(button.dataset.previewSong)];
        if (!song?.previewUrl) return;
        state.statusPreviewAudio?.pause?.();
        state.statusPreviewAudio = new Audio(song.previewUrl);
        state.statusPreviewAudio.play().catch(() => showToast("Preview blocked. Tap again.", "error"));
      });
    });
    els.songResults.querySelectorAll("[data-use-song]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        state.statusPreviewAudio?.pause?.();
        state.selectedStatusSong = songs[Number(button.dataset.useSong)];
        renderSelectedStatusSong(state.selectedStatusSong);
        els.songResults.innerHTML = "";
      });
    });
  } catch (error) {
    console.error(error);
    els.songResults.innerHTML = `<p class="muted">Song search failed.</p>`;
  }
}

function closeStatusViewer() {
  if (els.statusViewer) els.statusViewer.hidden = true;
  if (els.statusViewerBody) els.statusViewerBody.innerHTML = "";
}

function openSettings() {
  renderSettings();
  hideInlineEditors();
  showScreen(els.settingsScreen);
}

function openProfilePreview({ title, photoURL, chatId = "", profile = null, chat = null, infoTarget = null }) {
  state.profilePreview = {
    title: title || "Profile",
    photoURL: photoURL || DEFAULT_AVATAR,
    chatId,
    profile,
    chat,
    infoTarget,
  };
  els.profilePreviewName.textContent = state.profilePreview.title;
  els.profilePreviewPhoto.src = state.profilePreview.photoURL;
  els.profilePreviewPhoto.alt = `${state.profilePreview.title} profile photo`;
  els.profilePreviewChatBtn.hidden = !chatId;
  els.profilePreviewPop.classList.toggle("single-action", !chatId);
  els.profilePreviewPop.hidden = false;
}

function closeProfilePreview() {
  els.profilePreviewPop.hidden = true;
  els.profilePreviewPop.classList.remove("single-action");
  state.profilePreview = null;
}

function openProfilePreviewPhoto() {
  const preview = state.profilePreview;
  if (!preview) return;
  closeProfilePreview();
  openPhotoViewer([preview.photoURL], { profile: true, title: preview.title });
}

function openProfilePreviewChat() {
  const preview = state.profilePreview;
  if (!preview?.chatId) return;
  closeProfilePreview();
  openChat(preview.chatId, preview.profile, preview.chat);
}

function openProfilePreviewInfo() {
  const preview = state.profilePreview;
  if (!preview) return;
  closeProfilePreview();
  if (preview.infoTarget === "settings") {
    openSettings();
    return;
  }
  if (preview.chat?.type === "group") {
    state.activeChatMeta = preview.chat;
    state.activeChatData = preview.chat;
    openGroupProfileScreen();
    return;
  }
  openReceiverProfileScreen(preview.profile || state.activeReceiver, true);
}

function hideInlineEditors() {
  els.editNameForm.hidden = true;
  els.editAboutForm.hidden = true;
  els.editMobileForm.hidden = true;
}

function toggleInlineEditor(field) {
  const map = {
    name: els.editNameForm,
    about: els.editAboutForm,
    mobile: els.editMobileForm,
  };
  const form = map[field];
  if (!form) return;
  const willOpen = form.hidden;
  hideInlineEditors();
  form.hidden = !willOpen;
  if (willOpen) {
    const input = field === "name" ? els.editNameInput : field === "about" ? els.editAboutInput : els.editMobileInput;
    window.setTimeout(() => input.focus(), 60);
  }
}

async function saveProfileField(field, value) {
  const user = state.currentUser;
  if (!user) return;
  const trimmed = value.trim();
  if (!trimmed) {
    showToast(`${field === "name" ? "Name" : "Description"} cannot be empty.`, "error");
    return;
  }

  try {
    await updateDoc(doc(db, "users", user.uid), {
      [field]: trimmed,
      updatedAt: serverTimestamp(),
    });
    state.currentProfile = { ...state.currentProfile, [field]: trimmed };
    renderSettings();
    populateHomeProfile(state.currentProfile);
    hideInlineEditors();
    showToast("Profile updated.");
  } catch (error) {
    console.error(error);
    showToast("Could not update profile.", "error");
  }
}

async function updateSettingsPhoto(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("Choose a valid image file.", "error");
    return;
  }

  els.settingsAvatar.style.opacity = "0.55";
  try {
    const photoURL = await uploadImageToCloudinary(file);
    await updateDoc(doc(db, "users", state.currentUser.uid), {
      photoURL,
      updatedAt: serverTimestamp(),
    });
    state.currentProfile = { ...state.currentProfile, photoURL };
    renderSettings();
    populateHomeProfile(state.currentProfile);
    showToast("Profile photo updated.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not update photo.", "error");
  } finally {
    els.settingsAvatar.style.opacity = "1";
    els.settingsPhotoInput.value = "";
  }
}

async function sendMobileUpdateVerification() {
  const user = auth.currentUser;
  if (!user?.email) {
    showToast("No email is linked to this account.", "error");
    return;
  }

  setButtonLoading(els.sendEmailVerifyBtn, true, "Sending...");
  try {
    await sendEmailVerification(user);
    showToast("Verification email sent. Open it, then come back and save the number.");
  } catch (error) {
    console.error(error);
    showToast("Could not send verification email.", "error");
  } finally {
    setButtonLoading(els.sendEmailVerifyBtn, false);
  }
}

async function handleMobileUpdate(event) {
  event.preventDefault();
  const newMobile = normalizeMobile(els.editMobileInput.value);
  const password = els.editMobilePassword.value.trim();

  if (!isValidIndianMobile(newMobile)) {
    showToast("Enter a valid Indian mobile number.", "error");
    return;
  }
  if (password.length < 6) {
    showToast("Enter your ZopChat password.", "error");
    return;
  }
  if (newMobile === state.currentProfile?.mobile) {
    showToast("This number is already on your profile.", "error");
    return;
  }

  try {
    await reload(auth.currentUser);
    if (!auth.currentUser.emailVerified) {
      showToast("Please verify your email before updating mobile number.", "error");
      return;
    }

    const existingMobileSnap = await getDoc(doc(db, "mobileNumbers", newMobile));
    if (existingMobileSnap.exists() && existingMobileSnap.data().uid !== state.currentUser.uid) {
      showToast("This mobile number is already linked with another ZopChat account.", "error");
      return;
    }

    await ensureMobilePasswordCredential(newMobile, password, true);

    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, "users", state.currentUser.uid);
      const oldMobile = state.currentProfile?.mobile;
      const now = serverTimestamp();
      if (oldMobile && oldMobile !== newMobile) {
        transaction.delete(doc(db, "mobileNumbers", oldMobile));
        transaction.delete(doc(db, "mobileLogin", oldMobile));
      }
      transaction.set(
        doc(db, "mobileNumbers", newMobile),
        {
          uid: state.currentUser.uid,
          email: state.currentUser.email || "",
          createdAt: now,
        },
        { merge: true },
      );
      transaction.set(
        doc(db, "mobileLogin", newMobile),
        {
          uid: state.currentUser.uid,
          passwordHash_or_demoPassword: "managed-by-firebase-auth",
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
      transaction.update(userRef, {
        mobile: newMobile,
        updatedAt: now,
      });
    });

    state.currentProfile = { ...state.currentProfile, mobile: newMobile };
    renderSettings();
    hideInlineEditors();
    showToast("Mobile number updated.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not update mobile number.", "error");
  }
}

function openSearchPage(initialMobile = "") {
  if (typeof initialMobile !== "string") initialMobile = "";
  els.searchMobile.value = initialMobile;
  els.searchResult.innerHTML = "";
  renderSearchChatList();
  renderGroupMemberPicker();
  showScreen(els.searchScreen);
  window.setTimeout(() => {
    els.searchMobile.focus();
    if (initialMobile) handleSearch();
  }, 80);
}

function closeSearchPage() {
  els.searchMobile.value = "";
  els.searchResult.innerHTML = "";
  showScreen(els.homeScreen, { replaceHistory: true });
}

function parseZopChatQr(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.startsWith("zopchat:user:")) return text.slice("zopchat:user:".length).trim();
  return text;
}

async function handleQrScanValue(value) {
  navigator.vibrate?.(70);
  const scanned = parseZopChatQr(value);
  const mobile = normalizeMobile(scanned);

  if (isValidIndianMobile(mobile)) {
    const mobileSnap = await getDoc(doc(db, "mobileNumbers", mobile)).catch(() => null);
    const found = mobileSnap?.exists?.() ? mobileSnap.data() : null;
    const profile = found?.uid ? await getUserProfile(found.uid).catch(() => null) : null;
    closeQrScanner();
    if (profile?.isProfileComplete) {
      await createOrOpenChat(profile);
      return;
    }
    openSearchPage(mobile);
    return;
  }

  const profile = await getUserProfile(scanned).catch(() => null);
  closeQrScanner();
  if (profile?.isProfileComplete) {
    await createOrOpenChat(profile);
    return;
  }

  showToast("This QR code is not a valid ZopChat user.", "error");
}

async function scanQrFrame() {
  if (!state.qrDetector || !els.qrScanVideo?.srcObject) return;
  try {
    const codes = await state.qrDetector.detect(els.qrScanVideo);
    if (codes.length) {
      await handleQrScanValue(codes[0].rawValue);
      return;
    }
  } catch (error) {
    console.warn("QR scan frame failed", error);
  }
  state.qrScanFrame = requestAnimationFrame(scanQrFrame);
}

async function openQrScanner() {
  if (!("BarcodeDetector" in window)) {
    showToast("QR scanner is not supported in this browser.", "error");
    return;
  }
  try {
    state.qrDetector = state.qrDetector || new BarcodeDetector({ formats: ["qr_code"] });
    setQrModalTab("scan");
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    state.qrScanStream = stream;
    els.qrScanVideo.srcObject = stream;
    els.qrScanner.hidden = false;
    if (els.qrModalProfileQr) els.qrModalProfileQr.src = profileQrUrl();
    els.qrScanStatus.textContent = "Point the camera at a ZopChat QR code.";
    await els.qrScanVideo.play();
    state.qrScanFrame = requestAnimationFrame(scanQrFrame);
  } catch (error) {
    console.error(error);
    showToast("Camera permission is needed to scan QR.", "error");
    closeQrScanner();
  }
}

function closeQrScanner() {
  if (state.qrScanFrame) cancelAnimationFrame(state.qrScanFrame);
  state.qrScanFrame = null;
  state.qrScanStream?.getTracks().forEach((track) => track.stop());
  state.qrScanStream = null;
  state.qrTorchOn = false;
  if (els.qrScanVideo) els.qrScanVideo.srcObject = null;
  if (els.qrTorchBtn) els.qrTorchBtn.classList.remove("active");
  if (els.qrScanner) els.qrScanner.hidden = true;
}

function setQrModalTab(tab) {
  const scan = tab === "scan";
  state.qrActiveTab = scan ? "scan" : "my";
  els.qrTabScan?.classList.toggle("active", scan);
  els.qrTabMy?.classList.toggle("active", !scan);
  els.qrScanner?.classList.toggle("qr-my-active", !scan);
  els.qrPaneTrack?.classList.toggle("show-my", !scan);
  els.qrPaneTrack?.style.setProperty("--swipe-offset", "0px");
}

async function toggleQrTorch() {
  const track = state.qrScanStream?.getVideoTracks?.()[0];
  const capabilities = track?.getCapabilities?.() || {};
  if (!track || !capabilities.torch) {
    showToast("Torch is not supported on this camera.", "error");
    return;
  }
  state.qrTorchOn = !state.qrTorchOn;
  await track.applyConstraints({ advanced: [{ torch: state.qrTorchOn }] });
  els.qrTorchBtn.classList.toggle("active", state.qrTorchOn);
}

async function handleSearch(event) {
  event?.preventDefault();
  const mobile = normalizeMobile(els.searchMobile.value);
  els.searchResult.innerHTML = "";
  renderSearchChatList();

  if (!isValidIndianMobile(mobile)) {
    if (event) showToast("Enter the full valid mobile number.", "error");
    return;
  }

  const existingChat = state.chats.find((chat) => chat.other?.mobile === mobile);
  if (existingChat) {
    els.searchResult.innerHTML = "";
    return;
  }

  setButtonLoading(els.searchBtn, true, "Searching...");
  try {
    const mobileSnap = await getDoc(doc(db, "mobileNumbers", mobile));
    if (!mobileSnap.exists()) {
      renderInviteCard(mobile);
      return;
    }

    const found = mobileSnap.data();
    if (found.uid === state.currentUser.uid) {
      els.searchResult.innerHTML = `<p class="muted">This is your own number.</p>`;
      return;
    }

    const profile = await getUserProfile(found.uid);
    if (!profile?.isProfileComplete) {
      els.searchResult.innerHTML = `<p class="muted">No ZopChat user found with this mobile number.</p>`;
      return;
    }

    els.searchResult.innerHTML = `
      <div class="result-card">
        <img src="${escapeHtml(profile.photoURL || DEFAULT_AVATAR)}" alt="${escapeHtml(profile.name)}" />
        <div>
          <h4>${escapeHtml(profile.name)}</h4>
          <p>${escapeHtml(formatMobileDisplay(profile.mobile))}</p>
        </div>
        <button class="primary-btn compact" id="result-start-chat" type="button">Start Chat</button>
      </div>
    `;
    $("result-start-chat").addEventListener("click", () => createOrOpenChat(profile));
  } catch (error) {
    console.error(error);
    showToast("Search failed. Please try again.", "error");
  } finally {
    setButtonLoading(els.searchBtn, false);
  }
}

async function refreshCurrentProfile() {
  if (!state.currentUser) return;
  const profile = await getUserProfile(state.currentUser.uid);
  if (profile) state.currentProfile = profile;
}

async function savePrivacy(event) {
  event.preventDefault();
  try {
    await updateDoc(doc(db, "users", state.currentUser.uid), {
      privacy: {
        photo: els.privacyPhoto.value,
        about: els.privacyAbout.value,
        lastSeen: els.privacyLastSeen.value,
      },
      updatedAt: serverTimestamp(),
    });
    state.currentProfile = {
      ...state.currentProfile,
      privacy: {
        photo: els.privacyPhoto.value,
        about: els.privacyAbout.value,
        lastSeen: els.privacyLastSeen.value,
      },
    };
    showToast("Privacy saved.");
  } catch (error) {
    console.error(error);
    showToast("Could not save privacy.", "error");
  }
}

async function saveWallpaper(event) {
  event.preventDefault();
  const wallpaper = els.wallpaperSelect.value;
  await updateDoc(doc(db, "users", state.currentUser.uid), { wallpaper, updatedAt: serverTimestamp() });
  state.currentProfile = { ...state.currentProfile, wallpaper };
  applyWallpaper(wallpaper);
  showToast("Wallpaper saved.");
}

function applyWallpaper(wallpaper) {
  els.messages.classList.remove("wallpaper-mint", "wallpaper-pearl", "wallpaper-sky");
  els.messages.style.backgroundImage = "";
  els.messages.style.backgroundSize = "";
  els.messages.style.backgroundPosition = "";
  if (wallpaper && wallpaper !== "default") els.messages.classList.add(`wallpaper-${wallpaper}`);
}

function applyActiveChatWallpaper() {
  const personal = state.currentProfile?.chatWallpapers?.[state.activeChatId];
  if (personal) {
    els.messages.classList.remove("wallpaper-mint", "wallpaper-pearl", "wallpaper-sky");
    els.messages.style.backgroundImage = `linear-gradient(rgba(244, 247, 245, 0.72), rgba(244, 247, 245, 0.72)), url("${personal}")`;
    els.messages.style.backgroundSize = "cover";
    els.messages.style.backgroundPosition = "center";
    return;
  }
  applyWallpaper(state.currentProfile?.wallpaper || "default");
}

function hasPersonalChatWallpaper(chatId = state.activeChatId) {
  return Boolean(state.currentProfile?.chatWallpapers?.[chatId]);
}

function openChatWallpaperActions() {
  if (!hasPersonalChatWallpaper()) {
    els.chatWallpaperImageInput.click();
    return;
  }
  els.wallpaperChangeBtn.textContent = "Change wallpaper";
  els.wallpaperDeleteBtn.hidden = false;
  els.wallpaperActions.hidden = false;
}

async function togglePinChat(chatId) {
  const pinned = Boolean(state.currentProfile?.pinnedChats?.[chatId]);
  await updateDoc(doc(db, "users", state.currentUser.uid), {
    [`pinnedChats.${chatId}`]: !pinned,
    updatedAt: serverTimestamp(),
  });
  state.currentProfile = {
    ...state.currentProfile,
    pinnedChats: { ...(state.currentProfile?.pinnedChats || {}), [chatId]: !pinned },
  };
  renderChatList(state.chats);
}

async function toggleMuteChat(chatId) {
  const muted = isMutedChat(chatId);
  await updateDoc(doc(db, "users", state.currentUser.uid), {
    [`mutedChats.${chatId}`]: !muted,
    updatedAt: serverTimestamp(),
  });
  state.currentProfile = {
    ...state.currentProfile,
    mutedChats: { ...(state.currentProfile?.mutedChats || {}), [chatId]: !muted },
  };
  renderChatList(state.chats);
  showToast(muted ? "Chat unmuted." : "Chat muted.");
}

async function setPersonalChatWallpaper(file) {
  if (!file || !state.activeChatId) return;
  const url = await uploadImageToCloudinary(file);
  await updateDoc(doc(db, "users", state.currentUser.uid), {
    [`chatWallpapers.${state.activeChatId}`]: url,
    updatedAt: serverTimestamp(),
  });
  state.currentProfile = {
    ...state.currentProfile,
    chatWallpapers: { ...(state.currentProfile?.chatWallpapers || {}), [state.activeChatId]: url },
  };
  applyActiveChatWallpaper();
  showToast("Chat wallpaper updated.");
}

async function clearPersonalChatWallpaper() {
  if (!state.activeChatId) return;
  await updateDoc(doc(db, "users", state.currentUser.uid), {
    [`chatWallpapers.${state.activeChatId}`]: null,
    updatedAt: serverTimestamp(),
  });
  state.currentProfile = {
    ...state.currentProfile,
    chatWallpapers: { ...(state.currentProfile?.chatWallpapers || {}), [state.activeChatId]: null },
  };
  applyActiveChatWallpaper();
  showToast("Chat wallpaper cleared.");
}

async function clearActiveChatForMe() {
  if (!state.activeChatId || !state.currentUser) return;
  const messagesSnap = await getDocs(collection(db, "chats", state.activeChatId, "messages"));
  await Promise.all(messagesSnap.docs.map((messageDoc) => updateDoc(messageDoc.ref, { [`hiddenFor.${state.currentUser.uid}`]: true })));
  showToast("Chat cleared for you.");
}

function openClearChatConfirm() {
  if (!state.activeChatId) return;
  els.clearChatConfirm.hidden = false;
}

async function confirmClearActiveChat() {
  els.clearChatConfirm.hidden = true;
  await clearActiveChatForMe();
}

function renderInviteCard(mobile) {
  els.searchResult.innerHTML = `
    <div class="result-card invite-card">
      <img src="${INVITE_AVATAR}" alt="Invite user" />
      <div>
        <h4>${escapeHtml(formatMobileDisplay(mobile))}</h4>
        <p>This number is not registered on ZopChat yet.</p>
      </div>
      <button class="primary-btn compact" id="invite-user-btn" type="button">Invite</button>
    </div>
  `;
  $("invite-user-btn").addEventListener("click", () => inviteOnWhatsApp(mobile));
}

function inviteOnWhatsApp(mobile) {
  const text = [
    "Hey!",
    "",
    zopchatShareText,
    "",
    `Download ZopChat here: ${zopchatDownloadUrl}`,
  ].join("\n");
  const url = `https://wa.me/${mobile}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener");
}

async function shareZopChatApp() {
  if (els.shareActions) {
    els.shareActions.hidden = false;
    return;
  }
  await shareZopChatNative();
}

function buildShareText() {
  const text = [
    "Join me on ZopChat.",
    zopchatShareText,
    "",
    `Download ZopChat here: ${zopchatDownloadUrl}`,
  ].join("\n");
  return text;
}

async function shareZopChatNative() {
  const text = buildShareText();
  try {
    if (navigator.share) {
      await navigator.share({
        title: "ZopChat",
        text,
        url: zopchatDownloadUrl,
      });
      return;
    }
    await navigator.clipboard.writeText(text);
    showToast("Share text copied.");
  } catch (error) {
    console.error(error);
    showToast("Could not share right now.", "error");
  }
}

function openShareTarget(target) {
  const text = buildShareText();
  if (target === "whatsapp") {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    return;
  }
  if (target === "instagram") {
    navigator.clipboard?.writeText(text);
    window.open("https://www.instagram.com/", "_blank", "noopener");
    showToast("Share text copied for Instagram.");
    return;
  }
  if (target === "copy") {
    navigator.clipboard?.writeText(text);
    showToast("Share text copied.");
  }
}

function handleSearchInput() {
  window.clearTimeout(state.searchTimer);
  els.searchResult.innerHTML = "";
  renderSearchChatList();
  const mobile = normalizeMobile(els.searchMobile.value);
  if (!isValidIndianMobile(mobile)) return;
  state.searchTimer = window.setTimeout(() => handleSearch(), 250);
}

async function pickPhoneContact() {
  if (!navigator.contacts?.select) {
    showToast("Contact access is not supported in this browser.", "error");
    return;
  }
  try {
    const contacts = await navigator.contacts.select(["name", "tel"], { multiple: false });
    const phone = contacts?.[0]?.tel?.[0] || "";
    const mobile = normalizeMobile(phone);
    if (!isValidIndianMobile(mobile)) {
      showToast("Selected contact has no valid Indian mobile number.", "error");
      return;
    }
    els.searchMobile.value = mobile;
    handleSearch();
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error(error);
      showToast("Could not read contact.", "error");
    }
  }
}

async function createOrOpenChat(receiver) {
  if (!state.currentUser || !receiver?.uid) return;
  if (receiver.uid === state.currentUser.uid) {
    showToast("This is your own number.", "error");
    return;
  }

  const chatId = deterministicChatId(state.currentUser.uid, receiver.uid);
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);
  const now = serverTimestamp();

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      members: [state.currentUser.uid, receiver.uid],
      memberMap: {
        [state.currentUser.uid]: true,
        [receiver.uid]: true,
      },
      lastMessage: "",
      lastMessageType: "text",
      lastMessageAt: now,
      lastMessageSenderId: "",
      createdAt: now,
      updatedAt: now,
    });
  }

  openChat(chatId, receiver);
}

function renderGroupMemberPicker() {
  els.groupMemberPicker.innerHTML = "";
  state.chats
    .filter((chat) => chat.type !== "group" && chat.other)
    .forEach((chat) => {
      const row = document.createElement("label");
      row.className = "member-choice";
      row.innerHTML = `
        <img src="${escapeHtml(chat.other.photoURL || DEFAULT_AVATAR)}" alt="${escapeHtml(chat.other.name || "User")}" />
        <span>${escapeHtml(chat.other.name || chat.other.mobile || "User")}</span>
        <input type="checkbox" value="${escapeHtml(chat.other.uid)}" />
      `;
      els.groupMemberPicker.appendChild(row);
    });
}

async function createGroup(event) {
  event.preventDefault();
  const name = els.groupNameInput.value.trim();
  if (!name) {
    showToast("Group name is required.", "error");
    return;
  }
  const selected = Array.from(els.groupMemberPicker.querySelectorAll("input:checked")).map((input) => input.value);
  const members = Array.from(new Set([state.currentUser.uid, ...selected]));
  if (members.length < 2) {
    showToast("Select at least one member.", "error");
    return;
  }
  let groupPhotoURL = DEFAULT_AVATAR;
  const groupPhotoFile = els.groupPhotoInput.files?.[0];
  if (groupPhotoFile) {
    groupPhotoURL = await uploadImageToCloudinary(groupPhotoFile);
  }
  const now = serverTimestamp();
  const chatRef = doc(collection(db, "chats"));
  await setDoc(chatRef, {
    type: "group",
    groupName: name,
    groupDescription: els.groupDescriptionInput.value.trim(),
    groupPhotoURL,
    creatorId: state.currentUser.uid,
    admins: { [state.currentUser.uid]: true },
    memberVisibility: "everyone",
    members,
    memberMap: Object.fromEntries(members.map((uid) => [uid, true])),
    lastMessage: "Group created",
    lastMessageType: "system",
    lastMessageAt: now,
    lastMessageSenderId: state.currentUser.uid,
    createdAt: now,
    updatedAt: now,
  });
  els.createGroupForm.hidden = true;
  showToast("Group created.");
  openChat(chatRef.id, null, { id: chatRef.id, type: "group", groupName: name, groupPhotoURL, members });
}

function scrollMessagesToBottom() {
  requestAnimationFrame(() => {
    els.messages.scrollTop = els.messages.scrollHeight;
    setTimeout(() => {
      els.messages.scrollTop = els.messages.scrollHeight;
    }, 80);
  });
}

function openChat(chatId, receiver, chatMeta = null) {
  state.activeChatId = chatId;
  state.activeReceiver = receiver;
  state.activeChatMeta = chatMeta;
  const isGroup = chatMeta?.type === "group";
  els.receiverAvatar.src = isGroup ? chatMeta.groupPhotoURL || DEFAULT_AVATAR : receiver?.photoURL || DEFAULT_AVATAR;
  els.receiverName.textContent = isGroup ? chatMeta.groupName || "Group" : contactDisplayName(receiver);
  els.receiverStatus.textContent = isGroup ? `${chatMeta.members?.length || 0} members` : receiver?.online ? "Online" : "Last seen recently";
  els.messages.innerHTML = `<div class="chat-loading">Loading messages...</div>`;
  state.messageElements.clear();
  state.messageData.clear();
  applyActiveChatWallpaper();
  showScreen(els.chatScreen);
  markActiveChatRead(chatId);
  scrollMessagesToBottom();
  if (!isGroup) listenToActiveReceiver(receiver?.uid);
  listenToActiveChat(chatId);
  listenToMessages(chatId);
}

async function markActiveChatRead(chatId = state.activeChatId) {
  if (!chatId || !state.currentUser) return;
  const now = new Date();
  state.chats = state.chats.map((chat) =>
    chat.id === chatId
      ? {
          ...chat,
          lastReadAt: { ...(chat.lastReadAt || {}), [state.currentUser.uid]: now },
          unreadCounts: { ...(chat.unreadCounts || {}), [state.currentUser.uid]: 0 },
          unread: { ...(chat.unread || {}), [state.currentUser.uid]: 0 },
        }
      : chat,
  );
  renderChatList(state.chats);
  updateHomeBadges();
  try {
    await updateDoc(doc(db, "chats", chatId), {
      [`lastReadAt.${state.currentUser.uid}`]: serverTimestamp(),
      [`unreadCounts.${state.currentUser.uid}`]: 0,
      [`unread.${state.currentUser.uid}`]: 0,
    });
  } catch (error) {
    console.warn("Chat read marker update failed", error);
  }
}

function listenToActiveReceiver(uid) {
  if (state.unsubReceiver) state.unsubReceiver();
  state.unsubReceiver = null;
  if (!uid) return;

  state.unsubReceiver = onSnapshot(doc(db, "users", uid), (snapshot) => {
    if (!snapshot.exists()) return;
    state.activeReceiver = snapshot.data();
    els.receiverAvatar.src = canSee(state.activeReceiver, "photo") ? state.activeReceiver.photoURL || DEFAULT_AVATAR : DEFAULT_AVATAR;
    els.receiverName.textContent = contactDisplayName(state.activeReceiver);
    renderReceiverStatus();
    refreshMessageReceipts();
  });
}

function listenToActiveChat(chatId) {
  if (state.unsubActiveChat) state.unsubActiveChat();
  state.unsubActiveChat = onSnapshot(doc(db, "chats", chatId), (snapshot) => {
    state.activeChatData = snapshot.exists() ? snapshot.data() : null;
    if (state.activeChatData?.type === "group") {
      state.activeChatMeta = { id: chatId, ...state.activeChatData };
      els.receiverAvatar.src = state.activeChatData.groupPhotoURL || DEFAULT_AVATAR;
      els.receiverName.textContent = state.activeChatData.groupName || "Group";
      els.receiverStatus.textContent = `${state.activeChatData.members?.length || 0} members`;
    }
    renderReceiverStatus();
  });
}

function renderReceiverStatus() {
  if (state.activeChatData?.type === "group") return;
  if (!state.activeReceiver) return;
  const typing = state.activeChatData?.typing?.[state.activeReceiver.uid];
  if (typing) {
    els.receiverStatus.textContent = "typing...";
  } else if (state.activeReceiver.online) {
    els.receiverStatus.textContent = "Online";
  } else {
    els.receiverStatus.textContent = canSee(state.activeReceiver, "lastSeen") ? formatLastSeen(state.activeReceiver.lastSeen) : "Offline";
  }
}

function listenToMessages(chatId) {
  if (state.unsubMessages) state.unsubMessages();

  const messagesQuery = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"), limit(200));
  state.unsubMessages = onSnapshot(
    messagesQuery,
    (snapshot) => {
      els.messages.querySelector(".chat-loading")?.remove();
      snapshot.docChanges().forEach((change) => {
        const id = change.doc.id;
        if (change.type === "removed") {
          state.messageElements.get(id)?.remove();
          state.messageElements.delete(id);
          state.messageData.delete(id);
          return;
        }

        const message = change.doc.data();
        if (message.hiddenFor?.[state.currentUser.uid]) {
          state.messageElements.get(id)?.remove();
          state.messageElements.delete(id);
          state.messageData.delete(id);
          return;
        }
        markMessageReadIfNeeded(id, message);
        state.messageData.set(id, message);
        const row = buildMessageElement(id, message);
        const existing = state.messageElements.get(id);
        if (existing) {
          existing.replaceWith(row);
        } else {
          els.messages.appendChild(row);
        }
        state.messageElements.set(id, row);
      });
      markActiveChatRead(chatId);
      scrollMessagesToBottom();
    },
    (error) => {
      console.error(error);
      showToast("Could not load messages.", "error");
    },
  );
}

function refreshMessageReceipts() {
  state.messageData.forEach((message, id) => {
    const existing = state.messageElements.get(id);
    if (!existing) return;
    const row = buildMessageElement(id, message);
    existing.replaceWith(row);
    state.messageElements.set(id, row);
  });
}

async function markMessageReadIfNeeded(messageId, message) {
  if (!state.activeChatId || !state.currentUser || message.senderId === state.currentUser.uid) return;
  if (message.readBy?.[state.currentUser.uid]) return;

  try {
    await updateDoc(doc(db, "chats", state.activeChatId, "messages", messageId), {
      [`readBy.${state.currentUser.uid}`]: true,
      status: "read",
      readAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "chats", state.activeChatId), {
      [`lastReadAt.${state.currentUser.uid}`]: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Read receipt update failed", error);
  }
}

function getReceiptMarkupLegacy(message, isMine) {
  if (!isMine || !state.activeReceiver) return "";
  const receiverRead = message.readBy?.[state.activeReceiver.uid] === true || message.status === "read";
  if (receiverRead) return `<span class="ticks read" title="Seen">✓✓</span>`;
  if (state.activeReceiver.online) return `<span class="ticks" title="Delivered">✓✓</span>`;
  return `<span class="ticks" title="Sent">✓</span>`;
}

function getReceiptMarkup(message, isMine) {
  if (!isMine || !state.activeReceiver) return "";
  const receiverRead = message.readBy?.[state.activeReceiver.uid] === true || message.status === "read";
  if (receiverRead) return `<span class="ticks read" title="Seen">&#10003;&#10003;</span>`;
  if (state.activeReceiver.online) return `<span class="ticks" title="Delivered">&#10003;&#10003;</span>`;
  return `<span class="ticks" title="Sent">&#10003;</span>`;
}

function messagePreview(message) {
  if (!message) return "";
  if (message.deletedForEveryone) return "This message was deleted";
  if (message.type === "image") return (message.imageURLs?.length || 1) > 1 ? `${message.imageURLs.length} photos` : "Photo";
  if (message.type === "file") return message.fileName || "File";
  return message.text || "";
}

function buildMessageElement(id, message) {
  const isMine = message.senderId === state.currentUser.uid;
  const row = document.createElement("div");
  row.className = `message-row ${isMine ? "mine" : "theirs"}`;
  if (message.localProgress) row.classList.add("progress-bubble");
  if (state.selectedMessageIds.has(id)) row.classList.add("selected");
  row.dataset.messageId = id;

  const deleted = message.deletedForEveryone === true;
  const replyMarkup =
    message.replyTo && !deleted
      ? `<div class="reply-quote">${escapeHtml(message.replyTo.senderName || "Reply")}<br>${escapeHtml(message.replyTo.preview || "")}</div>`
      : "";

  const imageMarkup =
    message.type === "image" && (message.imageURLs?.length || message.imageURL) && !deleted
      ? renderImageAlbum(message)
      : "";
  const textMarkup = deleted
    ? `<p class="deleted-message">This message was deleted</p>`
    : message.type === "file"
      ? `<div class="file-card"><strong>${escapeHtml(message.fileName || "File")}</strong><button type="button" data-file-url="${escapeHtml(message.fileDownloadURL || cloudinaryAttachmentUrl(message.fileURL || ""))}">Download</button></div>`
    : message.text
      ? `<p>${escapeHtml(message.text)}</p>`
      : "";
  const forwardedMarkup = message.forwarded && !isMine && !deleted ? `<div class="forwarded-mark" title="Forwarded">↷</div>` : "";
  const hasMyReaction = Boolean(message.reactions?.[state.currentUser.uid]);
  const emojiButton = !deleted && !message.localProgress && !hasMyReaction ? `<button class="emoji-trigger" type="button" title="React" data-emoji-for="${escapeHtml(id)}">☺</button>` : "";

  row.innerHTML = `
    <div class="bubble">
      ${forwardedMarkup}
      ${replyMarkup}
      ${imageMarkup}
      ${textMarkup}
      <div class="message-meta">
        <time>${escapeHtml(formatTime(message.createdAt))}</time>
        ${message.editedAt && !deleted ? `<span class="edited-label">edited</span>` : ""}
        ${getReceiptMarkup(message, isMine)}
      </div>
      ${renderReactions(message)}
    </div>
    ${emojiButton}
  `;

  const photoAlbum = row.querySelector("[data-photo-album]");
  if (photoAlbum) {
    photoAlbum.addEventListener("click", () => openPhotoViewer(getMessageImages(message)));
  }
  const emoji = row.querySelector("[data-emoji-for]");
  if (emoji) {
    emoji.addEventListener("click", (event) => {
      event.stopPropagation();
      openReactionPicker(id, event.currentTarget);
    });
  }
  row.querySelector("[data-file-url]")?.addEventListener("click", () => {
    window.open(message.fileDownloadURL || cloudinaryAttachmentUrl(message.fileURL), "_blank", "noopener");
  });
  row.querySelectorAll("[data-reaction-owner]").forEach((reaction) => {
    reaction.addEventListener("click", (event) => {
      event.stopPropagation();
      state.selectedMessageId = id;
      openReactionPicker(id, event.currentTarget);
    });
  });
  bindMessageGestures(row, id, message);
  return row;
}

function getMessageImages(message) {
  return message.imageURLs?.length ? message.imageURLs : message.imageURL ? [message.imageURL] : [];
}

function renderImageAlbum(message) {
  const urls = getMessageImages(message);
  if (urls.length <= 1) {
    return `<img class="message-image" src="${escapeHtml(urls[0])}" alt="Shared photo" data-photo-album="true" />`;
  }

  const visible = urls.slice(0, 4);
  return `
    <div class="album-grid count-${Math.min(visible.length, 4)}" data-photo-album="true">
      ${visible
        .map((url, index) => {
          const extra = index === 3 && urls.length > 4 ? `<span class="album-more">+ ${urls.length - 3}</span>` : "";
          return `<div class="album-cell"><img src="${escapeHtml(url)}" alt="Shared photo" />${extra}</div>`;
        })
        .join("")}
    </div>
  `;
}

function renderReactions(message) {
  const reactions = Object.entries(message.reactions || {});
  if (!reactions.length) return "";
  return `<div class="reactions">${reactions
    .map(([uid, emoji]) => `<button class="reaction-pill" type="button" data-reaction-owner="${escapeHtml(uid)}">${escapeHtml(emoji)}</button>`)
    .join("")}</div>`;
}

function bindMessageGestures(row, id, message) {
  let pressTimer;
  let startX = 0;
  let startY = 0;
  let swiping = false;
  let didLongPress = false;
  const bubble = row.querySelector(".bubble");

  const resetBubble = () => {
    if (bubble) bubble.style.transform = "";
  };

  const isGestureControl = (target) => target.closest("[data-photo-album], [data-emoji-for], [data-reaction-owner], [data-file-url], button");

  row.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    openMessageActions(id);
  });

  row.addEventListener("click", (event) => {
    if (didLongPress) {
      event.preventDefault();
      didLongPress = false;
      return;
    }
    if (!state.selectedMessageIds.size) return;
    if (isGestureControl(event.target)) return;
    event.preventDefault();
    toggleMessageSelection(id);
  });

  row.addEventListener("pointerdown", (event) => {
    if (isGestureControl(event.target)) return;
    startX = event.clientX;
    startY = event.clientY;
    swiping = false;
    didLongPress = false;
    row.setPointerCapture?.(event.pointerId);
    pressTimer = window.setTimeout(() => {
      didLongPress = true;
      resetBubble();
      openMessageActions(id);
    }, 560);
  });

  row.addEventListener("pointermove", (event) => {
    if (event.pointerType === "mouse") return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) window.clearTimeout(pressTimer);
    if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      swiping = true;
      if (bubble) bubble.style.transform = `translateX(${Math.max(-58, Math.min(58, dx))}px)`;
    }
  });

  row.addEventListener("pointerup", (event) => {
    window.clearTimeout(pressTimer);
    row.releasePointerCapture?.(event.pointerId);
    if (event.pointerType === "mouse") return;
    const dx = event.clientX - startX;
    resetBubble();
    if (!didLongPress && swiping && Math.abs(dx) > 42) setReply(id);
  });

  row.addEventListener("pointercancel", (event) => {
    window.clearTimeout(pressTimer);
    row.releasePointerCapture?.(event.pointerId);
    resetBubble();
  });
}

async function handleSendMessage(event) {
  event.preventDefault();
  const text = els.messageInput.value.trim();
  if (!text) return;
  if (!state.activeChatId || !state.currentUser) return;
  if (isBlockedWith(state.activeReceiver)) {
    showToast("Messaging is blocked for this chat.", "error");
    return;
  }

  els.messageInput.value = "";
  setTyping(false);
  setButtonLoading(els.sendMessageBtn, true, "...");
  try {
    if (state.editingMessageId) {
      await updateDoc(doc(db, "chats", state.activeChatId, "messages", state.editingMessageId), {
        text,
        editedAt: serverTimestamp(),
      });
      state.editingMessageId = null;
      clearReply();
      return;
    }
    const now = serverTimestamp();
    await addDoc(collection(db, "chats", state.activeChatId, "messages"), {
      senderId: state.currentUser.uid,
      text,
      type: "text",
      createdAt: now,
      status: "sent",
      replyTo: state.replyTo,
      readBy: {
        [state.currentUser.uid]: true,
      },
    });
    await updateDoc(doc(db, "chats", state.activeChatId), {
      lastMessage: text,
      lastMessageType: "text",
      lastMessageAt: now,
      lastMessageSenderId: state.currentUser.uid,
      updatedAt: now,
    });
    clearReply();
  } catch (error) {
    console.error(error);
    showToast("Message was not sent.", "error");
    els.messageInput.value = text;
  } finally {
    setButtonLoading(els.sendMessageBtn, false);
    els.messageInput.focus();
  }
}

async function handleSendPhoto(input = els.messagePhotoInput) {
  if (input?.target) input = els.messagePhotoInput;
  const files = Array.from(input?.files || []);
  if (input) input.value = "";
  if (!files.length) return;
  if (files.some((file) => !file.type.startsWith("image/"))) {
    showToast("Choose a valid image file.", "error");
    return;
  }
  if (!state.activeChatId || !state.currentUser) return;
  if (isBlockedWith(state.activeReceiver)) {
    showToast("Messaging is blocked for this chat.", "error");
    return;
  }

  setButtonLoading(els.sendMessageBtn, true, "...");
  const tempId = `upload-${Date.now()}`;
  const tempMessage = {
    senderId: state.currentUser.uid,
    text: files.length > 1 ? `Uploading ${files.length} photos...` : "Uploading photo...",
    type: "text",
    createdAt: new Date(),
    localProgress: true,
  };
  const tempRow = buildMessageElement(tempId, tempMessage);
  els.messages.appendChild(tempRow);
  els.messages.scrollTop = els.messages.scrollHeight;
  try {
    const imageURLs = [];
    for (const file of files) {
      imageURLs.push(await uploadImageToCloudinary(file));
    }
    const now = serverTimestamp();
    await addDoc(collection(db, "chats", state.activeChatId, "messages"), {
      senderId: state.currentUser.uid,
      text: "",
      type: "image",
      imageURL: imageURLs[0],
      imageURLs,
      fileName: files.map((file) => file.name || "photo").join(", "),
      createdAt: now,
      status: "sent",
      replyTo: state.replyTo,
      readBy: {
        [state.currentUser.uid]: true,
      },
    });
    await updateDoc(doc(db, "chats", state.activeChatId), {
      lastMessage: imageURLs.length > 1 ? `${imageURLs.length} photos` : "Photo",
      lastMessageType: "image",
      lastMessageAt: now,
      lastMessageSenderId: state.currentUser.uid,
      updatedAt: now,
    });
    clearReply();
  } catch (error) {
    console.error(error);
    showToast(error.message || "Photo was not sent.", "error");
  } finally {
    tempRow.remove();
    setButtonLoading(els.sendMessageBtn, false);
  }
}

async function handleSendFiles() {
  const files = Array.from(els.messageFileInput.files || []);
  els.messageFileInput.value = "";
  if (!files.length || !state.activeChatId || !state.currentUser) return;
  if (isBlockedWith(state.activeReceiver)) {
    showToast("Messaging is blocked for this chat.", "error");
    return;
  }

  setButtonLoading(els.sendMessageBtn, true, "...");
  const tempId = `upload-file-${Date.now()}`;
  const tempMessage = {
    senderId: state.currentUser.uid,
    text: files.length > 1 ? `Uploading ${files.length} files...` : `Uploading ${files[0]?.name || "file"}...`,
    type: "text",
    createdAt: new Date(),
    localProgress: true,
  };
  const tempRow = buildMessageElement(tempId, tempMessage);
  els.messages.appendChild(tempRow);
  scrollMessagesToBottom();
  try {
    for (const file of files) {
      const fileURL = await uploadFileToCloudinary(file);
      const fileDownloadURL = cloudinaryAttachmentUrl(fileURL);
      const now = serverTimestamp();
      await addDoc(collection(db, "chats", state.activeChatId, "messages"), {
        senderId: state.currentUser.uid,
        text: "",
        type: "file",
        fileURL,
        fileDownloadURL,
        fileName: file.name || "File",
        fileSize: file.size || 0,
        createdAt: now,
        status: "sent",
        replyTo: state.replyTo,
        readBy: { [state.currentUser.uid]: true },
      });
      await updateDoc(doc(db, "chats", state.activeChatId), {
        lastMessage: file.name || "File",
        lastMessageType: "file",
        lastMessageAt: now,
        lastMessageSenderId: state.currentUser.uid,
        updatedAt: now,
      });
    }
    clearReply();
  } catch (error) {
    console.error(error);
    showToast(error.message || "File was not sent.", "error");
  } finally {
    tempRow.remove();
    setButtonLoading(els.sendMessageBtn, false);
  }
}

async function downloadImage(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = `zopchat-photo-${Date.now()}.jpg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error(error);
    window.open(url, "_blank", "noopener");
  }
}

function openPhotoViewer(urls, options = {}) {
  state.viewerPhotoUrls = Array.isArray(urls) ? urls : [urls];
  state.viewerPhotoUrl = state.viewerPhotoUrls[0] || "";
  els.photoViewerTitle.textContent = options.title || (options.profile ? "Profile photo" : "Photo");
  els.photoViewer.classList.toggle("profile-photo-viewer", Boolean(options.profile));
  els.viewerPhotoList.innerHTML = state.viewerPhotoUrls
    .map(
      (url, index) => `
        <div class="viewer-photo-item">
          <img src="${escapeHtml(url)}" alt="${escapeHtml(options.title || `Shared photo ${index + 1}`)}" />
          ${options.profile ? "" : `<button class="primary-btn compact" type="button" data-save-photo="${escapeHtml(url)}">Save</button>`}
        </div>
      `,
    )
    .join("");
  els.viewerPhotoList.querySelectorAll("[data-save-photo]").forEach((button) => {
    button.addEventListener("click", () => downloadImage(button.dataset.savePhoto));
  });
  els.photoViewer.hidden = false;
}

function closePhotoViewer() {
  els.photoViewer.hidden = true;
  els.photoViewer.classList.remove("profile-photo-viewer");
  els.viewerPhotoList.innerHTML = "";
  state.viewerPhotoUrl = "";
  state.viewerPhotoUrls = [];
}

function positionFloatingSheet(backdrop, anchor, preferred = "bottom") {
  const sheet = backdrop?.querySelector(".action-sheet");
  if (!backdrop || !sheet) return;
  backdrop.classList.add("floating-popover");
  backdrop.hidden = false;

  requestAnimationFrame(() => {
    const rect = anchor?.getBoundingClientRect?.() || {
      left: window.innerWidth / 2,
      right: window.innerWidth / 2,
      top: window.innerHeight / 2,
      bottom: window.innerHeight / 2,
      width: 0,
      height: 0,
    };
    const sheetRect = sheet.getBoundingClientRect();
    const margin = 10;
    let left = rect.left + rect.width / 2 - sheetRect.width / 2;
    left = Math.max(margin, Math.min(window.innerWidth - sheetRect.width - margin, left));

    let top = preferred === "top" ? rect.top - sheetRect.height - 8 : rect.bottom + 8;
    if (top + sheetRect.height > window.innerHeight - margin) top = rect.top - sheetRect.height - 8;
    if (top < margin) top = margin;

    sheet.style.left = `${left}px`;
    sheet.style.top = `${top}px`;
  });
}

function closeFloatingSheet(backdrop) {
  const sheet = backdrop?.querySelector(".action-sheet");
  if (sheet) {
    sheet.style.left = "";
    sheet.style.top = "";
  }
  backdrop?.classList.remove("floating-popover");
  if (backdrop) backdrop.hidden = true;
}

function openMessageActions(id) {
  const message = state.messageData.get(id);
  if (!message) return;
  state.selectedMessageId = id;
  const multi = state.selectedMessageIds.size > 1;
  els.actionReplyBtn.hidden = multi;
  els.actionCopyBtn.hidden = multi || message.type !== "text" || !message.text || message.deletedForEveryone;
  els.actionEditBtn.hidden = multi || message.type !== "text" || message.senderId !== state.currentUser.uid || message.deletedForEveryone;
  els.actionForwardBtn.hidden = false;
  els.actionDeleteBtn.hidden = false;
  if (multi) {
    els.actionDeleteBtn.textContent = "Delete selected";
  } else {
    els.actionDeleteBtn.textContent = "Delete";
  }
  els.messageActions.hidden = false;
}

function toggleMessageSelection(id) {
  const message = state.messageData.get(id);
  if (!message || message.localProgress) return;
  if (state.selectedMessageIds.has(id)) {
    state.selectedMessageIds.delete(id);
  } else {
    state.selectedMessageIds.add(id);
  }
  if (!state.selectedMessageIds.size) {
    closeMessageActions();
  } else {
    state.selectedMessageId = id;
    refreshMessageReceipts();
    openMessageActions(id);
  }
}

function clearSelection() {
  state.selectedMessageIds.clear();
  state.selectedMessageId = null;
  refreshMessageReceipts();
}

function getSelectedIds() {
  return state.selectedMessageIds.size ? Array.from(state.selectedMessageIds) : state.selectedMessageId ? [state.selectedMessageId] : [];
}

function openReactionPicker(id, anchor = null) {
  state.selectedMessageId = id;
  els.messageActions.hidden = true;
  positionFloatingSheet(els.reactionActions, anchor, "top");
}

function closeReactionPicker() {
  closeFloatingSheet(els.reactionActions);
}

function closeMessageActions(clear = true) {
  els.messageActions.hidden = true;
  if (clear) clearSelection();
}

function openDeleteActions() {
  closeMessageActions(false);
  const ids = getSelectedIds();
  const canDeleteEveryone = ids.length > 0 && ids.every((id) => state.messageData.get(id)?.senderId === state.currentUser.uid);
  els.deleteForEveryoneBtn.hidden = !canDeleteEveryone;
  els.deleteActions.hidden = false;
}

function closeDeleteActions() {
  els.deleteActions.hidden = true;
  clearSelection();
}

function setReply(id) {
  const message = state.messageData.get(id);
  if (!message || message.deletedForEveryone) return;
  state.replyTo = {
    messageId: id,
    senderId: message.senderId,
    senderName: message.senderId === state.currentUser.uid ? "You" : state.activeReceiver?.name || "User",
    preview: messagePreview(message).slice(0, 120),
    type: message.type || "text",
  };
  els.replyTitle.textContent = `Reply to ${state.replyTo.senderName}`;
  els.replyText.textContent = state.replyTo.preview;
  els.replyPreview.hidden = false;
  els.messageInput.focus();
  closeMessageActions();
}

function clearReply() {
  state.replyTo = null;
  state.editingMessageId = null;
  if (!els.replyPreview) return;
  els.replyPreview.hidden = true;
  els.replyTitle.textContent = "Reply";
  els.replyText.textContent = "";
  els.messageInput.placeholder = "Message";
}

function editSelectedMessage() {
  const message = state.messageData.get(state.selectedMessageId);
  if (!message || message.type !== "text" || message.senderId !== state.currentUser.uid) return;
  state.editingMessageId = state.selectedMessageId;
  els.replyTitle.textContent = "Editing message";
  els.replyText.textContent = message.text;
  els.replyPreview.hidden = false;
  els.messageInput.value = message.text;
  els.messageInput.placeholder = "Edit message";
  els.messageInput.focus();
  closeMessageActions();
}

async function copySelectedMessage() {
  const message = state.messageData.get(state.selectedMessageId);
  if (!message?.text) return;
  try {
    await navigator.clipboard.writeText(message.text);
    showToast("Message copied.");
  } catch (error) {
    console.error(error);
    showToast("Could not copy message.", "error");
  } finally {
    closeMessageActions();
  }
}

function forwardSelectedMessage() {
  renderForwardList();
  closeMessageActions(false);
  els.forwardActions.hidden = false;
}

function closeForwardActions() {
  els.forwardActions.hidden = true;
  clearSelection();
}

function renderForwardList() {
  els.forwardChatList.innerHTML = "";
  const ids = getSelectedIds();
  const firstMessage = state.messageData.get(ids[0]);
  state.chats
    .filter((chat) => chat.id !== state.activeChatId && chat.other && !isBlockedWith(chat.other))
    .forEach((chat) => {
      const button = document.createElement("button");
      button.className = "chat-item";
      button.type = "button";
      button.innerHTML = `
        <img src="${escapeHtml(chat.other.photoURL || DEFAULT_AVATAR)}" alt="${escapeHtml(chat.other.name || "User")}" />
        <div class="chat-meta">
          <h4>${escapeHtml(chat.other.name || "ZopChat User")}</h4>
          <p>${escapeHtml(ids.length > 1 ? `${ids.length} messages` : messagePreview(firstMessage))}</p>
        </div>
      `;
      button.addEventListener("click", () => forwardMessageToChat(chat.id));
      els.forwardChatList.appendChild(button);
    });
  if (!els.forwardChatList.children.length) {
    els.forwardChatList.innerHTML = `<p class="muted" style="padding: 14px;">No chat available to forward.</p>`;
  }
}

async function forwardMessageToChat(chatId) {
  const ids = getSelectedIds();
  if (!ids.length || !chatId) return;
  try {
    let lastPreview = "Forwarded message";
    let lastType = "text";
    let now = serverTimestamp();
    for (const id of ids) {
      const message = state.messageData.get(id);
      if (!message || message.deletedForEveryone) continue;
      now = serverTimestamp();
      lastPreview = message.type === "image" ? "Forwarded photo" : message.text || "Forwarded message";
      lastType = message.type;
      await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: state.currentUser.uid,
      text: message.type === "text" ? message.text || "" : "",
      type: message.type,
      imageURL: message.type === "image" ? message.imageURL || "" : "",
      imageURLs: message.type === "image" ? getMessageImages(message) : [],
      forwarded: true,
        createdAt: now,
        status: "sent",
        readBy: { [state.currentUser.uid]: true },
      });
    }
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: ids.length > 1 ? `${ids.length} forwarded messages` : lastPreview,
      lastMessageType: lastType,
      lastMessageAt: now,
      lastMessageSenderId: state.currentUser.uid,
      updatedAt: now,
    });
    closeForwardActions();
    clearSelection();
    showToast("Message forwarded.");
  } catch (error) {
    console.error(error);
    showToast("Could not forward message.", "error");
  }
}

async function reactToSelectedMessage(emoji) {
  const id = state.selectedMessageId;
  if (!id || !state.activeChatId) return;
  try {
    await updateDoc(doc(db, "chats", state.activeChatId, "messages", id), {
      [`reactions.${state.currentUser.uid}`]: emoji,
    });
    closeReactionPicker();
  } catch (error) {
    console.error(error);
    showToast("Could not react.", "error");
  }
}

async function setTyping(isTyping) {
  if (!state.activeChatId || !state.currentUser) return;
  try {
    await updateDoc(doc(db, "chats", state.activeChatId), {
      [`typing.${state.currentUser.uid}`]: isTyping,
    });
  } catch (error) {
    console.warn("Typing update failed", error);
  }
}

function handleTypingInput() {
  if (!state.activeChatId) return;
  setTyping(Boolean(els.messageInput.value.trim()));
  window.clearTimeout(state.typingTimer);
  state.typingTimer = window.setTimeout(() => setTyping(false), 1800);
}

async function toggleBlockActiveUser() {
  const receiver = state.activeReceiver;
  if (!receiver?.uid) return;
  const blocked = Boolean(state.currentProfile?.blockedUsers?.[receiver.uid]);
  try {
    await updateDoc(doc(db, "users", state.currentUser.uid), {
      [`blockedUsers.${receiver.uid}`]: !blocked,
      updatedAt: serverTimestamp(),
    });
    await refreshCurrentProfile();
    els.blockUserBtn.textContent = blocked ? "Block user" : "Unblock user";
    showToast(blocked ? "User unblocked." : "User blocked.");
  } catch (error) {
    console.error(error);
    showToast("Could not update block list.", "error");
  }
}

async function deleteSelectedForMe() {
  const ids = getSelectedIds();
  if (!ids.length || !state.activeChatId) return;
  try {
    for (const id of ids) {
      await updateDoc(doc(db, "chats", state.activeChatId, "messages", id), {
        [`hiddenFor.${state.currentUser.uid}`]: true,
      });
    }
    closeDeleteActions();
    clearSelection();
    showToast("Deleted for you.");
  } catch (error) {
    console.error(error);
    showToast("Could not delete message.", "error");
  }
}

async function deleteSelectedForEveryone() {
  const ids = getSelectedIds();
  if (!ids.length || !state.activeChatId || !ids.every((id) => state.messageData.get(id)?.senderId === state.currentUser.uid)) {
    showToast("You can delete only your own message for everyone.", "error");
    return;
  }

  try {
    for (const id of ids) {
      await updateDoc(doc(db, "chats", state.activeChatId, "messages", id), {
        deletedForEveryone: true,
        text: "",
        imageURL: "",
        status: "deleted",
        deletedAt: serverTimestamp(),
      });
    }
    closeDeleteActions();
    clearSelection();
    showToast("Deleted for everyone.");
  } catch (error) {
    console.error(error);
    showToast("Could not delete for everyone.", "error");
  }
}

function openReceiverProfileScreen(profile, forceUserProfile = false) {
  if (state.activeChatMeta?.type === "group" && !forceUserProfile) {
    openGroupProfileScreen();
    return;
  }
  if (!profile) return;
  els.fullUserAvatar.src = canSee(profile, "photo") ? profile.photoURL || DEFAULT_AVATAR : DEFAULT_AVATAR;
  els.fullUserName.textContent = contactDisplayName(profile);
  els.fullUserAbout.textContent = canSee(profile, "about") ? profile.about || "Hey there! I am using ZopChat." : "About is private";
  els.fullUserMobile.textContent = formatMobileDisplay(profile.mobile);
  els.fullUserEmail.textContent = profile.email || "-";
  els.fullUserStatus.textContent = profile.online ? "Online" : canSee(profile, "lastSeen") ? formatLastSeen(profile.lastSeen) : "Offline";
  els.blockUserBtn.textContent = state.currentProfile?.blockedUsers?.[profile.uid] ? "Unblock user" : "Block user";
  if (els.profileClearChatBtn) els.profileClearChatBtn.hidden = !state.activeChatId;
  els.contactNameForm.hidden = false;
  els.contactNameInput.value = state.currentProfile?.contactNames?.[profile.uid] || "";
  if (els.starFriendBtn) els.starFriendBtn.textContent = state.currentProfile?.favoriteContacts?.[profile.uid] ? "Unstar friend" : "Star friend";
  els.groupEditForm.hidden = true;
  els.groupMembersCard.hidden = true;
  renderMediaGallery();
  showScreen(els.receiverProfileScreen);
}

async function saveContactName(event) {
  event.preventDefault();
  const uid = state.activeReceiver?.uid;
  if (!uid || !state.currentUser) return;
  const name = els.contactNameInput.value.trim();
  await updateDoc(doc(db, "users", state.currentUser.uid), {
    [`contactNames.${uid}`]: name || null,
    updatedAt: serverTimestamp(),
  });
  state.currentProfile = {
    ...state.currentProfile,
    contactNames: { ...(state.currentProfile?.contactNames || {}), [uid]: name },
  };
  els.fullUserName.textContent = contactDisplayName(state.activeReceiver);
  renderChatList(state.chats);
  renderSearchChatList();
  showToast("Name saved for you.");
}

async function toggleStarFriend() {
  const uid = state.activeReceiver?.uid;
  if (!uid || !state.currentUser) return;
  const starred = Boolean(state.currentProfile?.favoriteContacts?.[uid]);
  await updateDoc(doc(db, "users", state.currentUser.uid), {
    [`favoriteContacts.${uid}`]: !starred,
    updatedAt: serverTimestamp(),
  });
  state.currentProfile = {
    ...state.currentProfile,
    favoriteContacts: { ...(state.currentProfile?.favoriteContacts || {}), [uid]: !starred },
  };
  if (els.starFriendBtn) els.starFriendBtn.textContent = starred ? "Star friend" : "Unstar friend";
  renderChatList(state.chats);
  showToast(starred ? "Friend unstarred." : "Friend starred.");
}

async function openGroupProfileScreen() {
  const chat = state.activeChatData || state.activeChatMeta;
  if (!chat) return;
  const isAdmin = Boolean(chat.admins?.[state.currentUser.uid]);
  els.fullUserAvatar.src = chat.groupPhotoURL || DEFAULT_AVATAR;
  els.fullUserName.textContent = chat.groupName || "Group";
  els.fullUserAbout.textContent = chat.groupDescription || "No description";
  els.fullUserMobile.textContent = "Group chat";
  els.fullUserEmail.textContent = `${chat.members?.length || 0} members`;
  els.fullUserStatus.textContent = isAdmin ? "You are admin" : "Member";
  els.blockUserBtn.style.display = "none";
  if (els.profileClearChatBtn) els.profileClearChatBtn.hidden = !state.activeChatId;
  els.contactNameForm.hidden = true;
  els.groupEditForm.hidden = !isAdmin;
  els.editGroupName.value = chat.groupName || "";
  els.editGroupDescription.value = chat.groupDescription || "";
  els.editGroupPhotoPreview.src = chat.groupPhotoURL || DEFAULT_AVATAR;
  els.groupMemberVisibility.value = chat.memberVisibility || "everyone";
  await renderGroupMembers(chat, isAdmin);
  renderMediaGallery();
  showScreen(els.receiverProfileScreen);
}

async function renderGroupMembers(chat, isAdmin) {
  const canSeeMembers = (chat.memberVisibility || "everyone") === "everyone" || isAdmin;
  els.groupMembersCard.hidden = !canSeeMembers;
  if (!canSeeMembers) return;
  els.groupMemberCount.textContent = `${chat.members?.length || 0}`;
  els.groupMemberList.innerHTML = "";
  els.groupAddMemberPicker.innerHTML = "";
  els.deleteGroupBtn.hidden = !isAdmin;
  if (isAdmin) {
    state.chats
      .filter((c) => c.type !== "group" && c.other && !(chat.memberMap || {})[c.other.uid])
      .forEach((c) => {
        const button = document.createElement("button");
        button.className = "member-choice";
        button.type = "button";
        button.innerHTML = `<img src="${escapeHtml(c.other.photoURL || DEFAULT_AVATAR)}" alt="" /><span>Add ${escapeHtml(c.other.name || c.other.mobile || "User")}</span><strong>+</strong>`;
        button.addEventListener("click", () => addGroupMember(c.other.uid));
        els.groupAddMemberPicker.appendChild(button);
      });
  }
  for (const uid of chat.members || []) {
    const profile = await getUserProfile(uid);
    const row = document.createElement("div");
    row.className = "member-row";
    row.innerHTML = `
      <img src="${escapeHtml(profile?.photoURL || DEFAULT_AVATAR)}" alt="${escapeHtml(profile?.name || "User")}" />
      <span>${escapeHtml(profile?.name || uid)} ${chat.admins?.[uid] ? "(admin)" : ""}</span>
      <div class="member-actions">
        ${isAdmin && uid !== state.currentUser.uid ? `<button class="text-btn" data-toggle-admin="${escapeHtml(uid)}" type="button">${chat.admins?.[uid] ? "Remove admin" : "Make admin"}</button>` : ""}
        ${isAdmin && uid !== state.currentUser.uid ? `<button class="text-btn danger" data-remove-member="${escapeHtml(uid)}" type="button">Remove</button>` : ""}
      </div>
    `;
    row.addEventListener("click", async (event) => {
      if (event.target.closest("button")) return;
      openReceiverProfileScreen(await getUserProfile(uid), true);
    });
    row.querySelector("[data-toggle-admin]")?.addEventListener("click", () => toggleGroupAdmin(uid));
    row.querySelector("[data-remove-member]")?.addEventListener("click", () => removeGroupMember(uid));
    els.groupMemberList.appendChild(row);
  }
}

function renderMediaGallery() {
  const images = [];
  state.messageData.forEach((message) => {
    if (message.type === "image") images.push(...getMessageImages(message));
  });
  els.mediaGalleryCard.hidden = !images.length;
  els.mediaCount.textContent = `${images.length} photos`;
  els.mediaGallery.innerHTML = images.map((url) => `<img src="${escapeHtml(url)}" alt="Shared media" data-gallery-photo="${escapeHtml(url)}" />`).join("");
  els.mediaGallery.querySelectorAll("[data-gallery-photo]").forEach((img) => {
    img.addEventListener("click", () => openPhotoViewer(images));
  });
}

function backToChatFromReceiverProfile() {
  els.blockUserBtn.style.display = "";
  if (state.activeChatId) {
    showScreen(els.chatScreen, { replaceHistory: true });
  } else {
    showScreen(els.homeScreen, { replaceHistory: true });
  }
}

async function saveGroupProfile(event) {
  event.preventDefault();
  const chat = state.activeChatData || state.activeChatMeta;
  if (!chat?.admins?.[state.currentUser.uid]) return;
  let groupPhotoURL = chat.groupPhotoURL || DEFAULT_AVATAR;
  const file = els.editGroupPhoto.files?.[0];
  if (file) {
    groupPhotoURL = await uploadImageToCloudinary(file);
  }
  await updateDoc(doc(db, "chats", state.activeChatId), {
    groupName: els.editGroupName.value.trim() || "Group",
    groupDescription: els.editGroupDescription.value.trim(),
    groupPhotoURL,
    memberVisibility: els.groupMemberVisibility.value,
    updatedAt: serverTimestamp(),
  });
  showToast("Group updated.");
}

async function toggleGroupAdmin(uid) {
  const chat = state.activeChatData || state.activeChatMeta;
  if (!chat?.admins?.[state.currentUser.uid]) return;
  const isAdmin = Boolean(chat.admins?.[uid]);
  await updateDoc(doc(db, "chats", state.activeChatId), {
    [`admins.${uid}`]: !isAdmin,
    updatedAt: serverTimestamp(),
  });
  showToast(isAdmin ? "Admin removed." : "Admin added.");
}

async function addGroupMember(uid) {
  const chat = state.activeChatData || state.activeChatMeta;
  if (!chat?.admins?.[state.currentUser.uid]) return;
  const members = Array.from(new Set([...(chat.members || []), uid]));
  await updateDoc(doc(db, "chats", state.activeChatId), {
    members,
    [`memberMap.${uid}`]: true,
    updatedAt: serverTimestamp(),
  });
  showToast("Member added.");
}

async function removeGroupMember(uid) {
  const chat = state.activeChatData || state.activeChatMeta;
  if (!chat?.admins?.[state.currentUser.uid]) return;
  const members = (chat.members || []).filter((member) => member !== uid);
  await updateDoc(doc(db, "chats", state.activeChatId), {
    members,
    [`memberMap.${uid}`]: false,
    [`admins.${uid}`]: false,
    updatedAt: serverTimestamp(),
  });
  showToast("Member removed.");
}

async function leaveGroup() {
  const chat = state.activeChatData || state.activeChatMeta;
  if (!chat?.members?.includes(state.currentUser.uid)) return;
  await removeGroupMember(state.currentUser.uid);
  backToHome();
}

async function deleteGroup() {
  const chat = state.activeChatData || state.activeChatMeta;
  if (!chat?.admins?.[state.currentUser.uid]) return;
  const messagesSnap = await getDocs(collection(db, "chats", state.activeChatId, "messages"));
  await Promise.all(messagesSnap.docs.map((messageDoc) => deleteDoc(messageDoc.ref)));
  await deleteDoc(doc(db, "chats", state.activeChatId));
  showToast("Group deleted.");
  backToHome();
}

function backToHome(options = { replaceHistory: true }) {
  cleanupChatScreenState();
  showScreen(els.homeScreen, options);
}

async function logout() {
  try {
    const uid = state.currentUser?.uid;
    const sessionId = state.sessionId;
    await setOnlineStatus(false);
    if (!state.isForcedLogout && uid && sessionId) {
      await updateDoc(doc(db, "users", uid), {
        activeSessionId: "",
        activeSessionAt: serverTimestamp(),
      });
      localStorage.removeItem(getSessionStorageKey(uid));
    }
    cleanupRealtime();
    await signOut(auth);
  } catch (error) {
    console.error(error);
    showToast("Could not logout.", "error");
  }
}

function bindPresenceEvents() {
  document.addEventListener("visibilitychange", () => {
    if (!state.currentUser || !state.currentProfile?.isProfileComplete) return;
    setOnlineStatus(!document.hidden);
  });
  window.addEventListener("beforeunload", () => {
    if (!state.currentUser || !state.currentProfile?.isProfileComplete) return;
    setOnlineStatus(false);
  });
}

function bindScrollClickGuard() {
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType === "mouse") return;
      state.touchStartX = event.clientX;
      state.touchStartY = event.clientY;
      state.touchMoved = false;
    },
    true,
  );

  document.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "mouse") return;
      const dx = event.clientX - state.touchStartX;
      const dy = event.clientY - state.touchStartY;
      if (Math.hypot(dx, dy) > 14) state.touchMoved = true;
    },
    true,
  );

  document.addEventListener(
    "pointerup",
    (event) => {
      if (event.pointerType === "mouse") return;
      if (state.touchMoved) state.suppressClickUntil = Date.now() + 360;
    },
    true,
  );

  document.addEventListener(
    "click",
    (event) => {
      if (Date.now() > state.suppressClickUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      state.suppressClickUntil = 0;
    },
    true,
  );
}

function bindEvents() {
  els.googleLoginBtn.addEventListener("click", handleGoogleLogin);
  els.mobileLoginForm.addEventListener("submit", handleMobileLogin);
  els.emailSignupForm?.addEventListener("submit", handleEmailSignup);
  els.profileForm.addEventListener("submit", handleProfileSave);
  els.profileLogoutBtn.addEventListener("click", logout);
  els.openProfileBtn.addEventListener("click", openSettings);
  els.settingsBackBtn.addEventListener("click", () => showScreen(els.homeScreen, { replaceHistory: true }));
  els.settingsLogoutBtn.addEventListener("click", logout);
  els.settingsPhotoInput.addEventListener("change", () => {
    const file = els.settingsPhotoInput.files?.[0];
    els.settingsPhotoInput.value = "";
    if (file) openPhotoCropper(file, "settings");
  });
  els.settingsAvatar.addEventListener("click", () => {
    openProfilePreview({
      title: state.currentProfile?.name ? `${state.currentProfile.name} (You)` : "You",
      photoURL: state.currentProfile?.photoURL || DEFAULT_AVATAR,
      infoTarget: "settings",
    });
  });
  document.querySelectorAll("[data-edit-field]").forEach((button) => {
    button.addEventListener("click", () => toggleInlineEditor(button.dataset.editField));
  });
  els.editNameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveProfileField("name", els.editNameInput.value);
  });
  els.editAboutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveProfileField("about", els.editAboutInput.value);
  });
  els.sendEmailVerifyBtn.addEventListener("click", sendMobileUpdateVerification);
  els.editMobileForm.addEventListener("submit", handleMobileUpdate);
  els.privacyBtn.addEventListener("click", () => {
    els.privacyForm.hidden = !els.privacyForm.hidden;
  });
  els.privacyForm.addEventListener("submit", savePrivacy);
  els.qrBtn.addEventListener("click", () => {
    els.qrCard.hidden = !els.qrCard.hidden;
  });
  els.profileQrShareBtn?.addEventListener("click", shareProfileQr);
  els.profileQrDownloadBtn?.addEventListener("click", downloadProfileQr);
  $("profile-qr-shortcut")?.addEventListener("click", () => {
    els.qrCard.hidden = false;
    els.qrCard.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("profile-share-shortcut")?.addEventListener("click", shareZopChatApp);
  els.wallpaperBtn.addEventListener("click", () => {
    els.wallpaperForm.hidden = !els.wallpaperForm.hidden;
  });
  els.wallpaperForm.addEventListener("submit", saveWallpaper);
  els.blockListBtn.addEventListener("click", () => {
    const count = Object.values(state.currentProfile?.blockedUsers || {}).filter(Boolean).length;
    showToast(count ? `${count} user blocked.` : "No blocked users yet.");
  });
  els.notificationsBtn.addEventListener("click", () => showToast("Notification controls will be added in the next ZopChat version."));
  els.shareAppBtn.addEventListener("click", shareZopChatApp);
  els.shareNativeBtn?.addEventListener("click", async () => {
    els.shareActions.hidden = true;
    await shareZopChatNative();
  });
  els.shareWhatsappBtn?.addEventListener("click", () => {
    els.shareActions.hidden = true;
    openShareTarget("whatsapp");
  });
  els.shareInstagramBtn?.addEventListener("click", () => {
    els.shareActions.hidden = true;
    openShareTarget("instagram");
  });
  els.shareCopyBtn?.addEventListener("click", () => {
    els.shareActions.hidden = true;
    openShareTarget("copy");
  });
  els.shareCancelBtn?.addEventListener("click", () => {
    els.shareActions.hidden = true;
  });
  els.shareActions?.addEventListener("click", (event) => {
    if (event.target === els.shareActions) els.shareActions.hidden = true;
  });
  els.homeTabChats.addEventListener("click", () => setHomeTab("chats"));
  els.homeTabStatus.addEventListener("click", () => setHomeTab("status"));
  els.homeTabCalls.addEventListener("click", () => setHomeTab("calls"));
  els.statusForm.addEventListener("submit", createStatus);
  els.statusImageInput?.addEventListener("change", () => {
    if (els.statusImageInput.files?.[0]) {
      els.statusSongPanel.hidden = false;
      els.statusSongSearch.focus();
    }
    renderStatusDraftPreview();
  });
  els.statusInput?.addEventListener("input", renderStatusDraftPreview);
  els.statusOverlayInput?.addEventListener("input", renderStatusDraftPreview);
  els.statusDrawInput?.addEventListener("input", renderStatusDraftPreview);
  els.statusSongBtn?.addEventListener("click", () => {
    els.statusSongPanel.hidden = !els.statusSongPanel.hidden;
    if (!els.statusSongPanel.hidden) els.statusSongSearch.focus();
  });
  els.statusSongSearchBtn?.addEventListener("click", searchOnlineStatusSongs);
  els.statusSongSearch?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchOnlineStatusSongs();
    }
  });
  els.closeStatusViewerBtn?.addEventListener("click", closeStatusViewer);
  els.statusViewer?.addEventListener("click", (event) => {
    if (event.target === els.statusViewer) closeStatusViewer();
  });
  els.inAppNotification?.addEventListener("click", () => {
    const chat = state.chats.find((item) => item.id === state.notificationChatId);
    if (chat) {
      els.inAppNotification.hidden = true;
      openChat(chat.id, chat.other, chat);
    }
  });
  els.scanQrBtn.addEventListener("click", openQrScanner);
  els.closeQrScannerBtn.addEventListener("click", closeQrScanner);
  els.qrTabScan?.addEventListener("click", () => setQrModalTab("scan"));
  els.qrTabMy?.addEventListener("click", () => setQrModalTab("my"));
  els.qrModalShareBtn?.addEventListener("click", shareProfileQr);
  els.qrModalDownloadBtn?.addEventListener("click", downloadProfileQr);
  els.qrTorchBtn?.addEventListener("click", toggleQrTorch);
  els.qrPaneSlider?.addEventListener("touchstart", (event) => {
    state.qrSwipeStartX = event.touches?.[0]?.clientX || 0;
    state.qrSwipeStartY = event.touches?.[0]?.clientY || 0;
    state.qrSwipeDeltaX = 0;
    els.qrPaneTrack?.classList.add("dragging");
  });
  els.qrPaneSlider?.addEventListener("touchmove", (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    const deltaX = touch.clientX - state.qrSwipeStartX;
    const deltaY = touch.clientY - state.qrSwipeStartY;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    event.preventDefault();
    state.qrSwipeDeltaX = deltaX;
    els.qrPaneTrack?.style.setProperty("--swipe-offset", `${Math.max(-96, Math.min(96, deltaX))}px`);
  });
  els.qrPaneSlider?.addEventListener("touchend", () => {
    els.qrPaneTrack?.classList.remove("dragging");
    els.qrPaneTrack?.style.setProperty("--swipe-offset", "0px");
    if (Math.abs(state.qrSwipeDeltaX) < 58) return;
    setQrModalTab(state.qrSwipeDeltaX < 0 ? "my" : "scan");
  });
  els.qrScanner.addEventListener("click", (event) => {
    if (event.target === els.qrScanner) closeQrScanner();
  });
  els.startChatBtn.addEventListener("click", openSearchPage);
  els.emptyStartChatBtn.addEventListener("click", openSearchPage);
  els.pickContactBtn?.addEventListener("click", pickPhoneContact);
  els.openCreateGroupBtn.addEventListener("click", () => {
    renderGroupMemberPicker();
    els.createGroupForm.hidden = !els.createGroupForm.hidden;
  });
  els.createGroupForm.addEventListener("submit", createGroup);
  els.groupPhotoPreview.src = DEFAULT_AVATAR;
  els.groupPhotoInput.addEventListener("change", () => {
    const file = els.groupPhotoInput.files?.[0];
    if (file) els.groupPhotoPreview.src = URL.createObjectURL(file);
  });
  els.closeSearchBtn.addEventListener("click", closeSearchPage);
  els.searchForm.addEventListener("submit", handleSearch);
  els.searchMobile.addEventListener("input", handleSearchInput);
  els.backHomeBtn.addEventListener("click", backToHome);
  els.openReceiverProfileBtn.addEventListener("click", () => openReceiverProfileScreen(state.activeReceiver));
  els.receiverProfileBackBtn.addEventListener("click", backToChatFromReceiverProfile);
  els.contactNameForm.addEventListener("submit", saveContactName);
  els.starFriendBtn?.addEventListener("click", toggleStarFriend);
  els.profileClearChatBtn?.addEventListener("click", openClearChatConfirm);
  els.fullUserAvatar.addEventListener("click", () => {
    const title = els.fullUserName.textContent || "Profile photo";
    openProfilePreview({
      title,
      photoURL: els.fullUserAvatar.src || DEFAULT_AVATAR,
      profile: state.activeReceiver,
      chat: state.activeChatMeta,
    });
  });
  els.groupEditForm.addEventListener("submit", saveGroupProfile);
  els.editGroupPhoto.addEventListener("change", () => {
    const file = els.editGroupPhoto.files?.[0];
    if (file) els.editGroupPhotoPreview.src = URL.createObjectURL(file);
  });
  els.leaveGroupBtn.addEventListener("click", leaveGroup);
  els.deleteGroupBtn.addEventListener("click", deleteGroup);
  els.blockUserBtn.addEventListener("click", toggleBlockActiveUser);
  els.messageForm.addEventListener("submit", handleSendMessage);
  els.messagePhotoInput.addEventListener("change", handleSendPhoto);
  els.messageCameraInput.addEventListener("change", () => handleSendPhoto(els.messageCameraInput));
  els.messageFileInput.addEventListener("change", handleSendFiles);
  els.chatWallpaperImageInput?.addEventListener("change", () => {
    const file = els.chatWallpaperImageInput.files?.[0];
    els.chatWallpaperImageInput.value = "";
    if (file) setPersonalChatWallpaper(file);
  });
  els.attachMenuBtn.addEventListener("click", () => {
    els.attachActions.hidden = false;
  });
  els.attachCameraBtn.addEventListener("click", () => {
    els.attachActions.hidden = true;
    els.messageCameraInput.click();
  });
  els.attachImageBtn.addEventListener("click", () => {
    els.attachActions.hidden = true;
    els.messagePhotoInput.click();
  });
  els.attachFileBtn.addEventListener("click", () => {
    els.attachActions.hidden = true;
    els.messageFileInput.click();
  });
  els.attachCancelBtn.addEventListener("click", () => {
    els.attachActions.hidden = true;
  });
  els.attachActions.addEventListener("click", (event) => {
    if (event.target === els.attachActions) els.attachActions.hidden = true;
  });
  els.chatMenuBtn.addEventListener("click", (event) => {
    const pinned = Boolean(state.currentProfile?.pinnedChats?.[state.activeChatId]);
    els.chatMenuPinBtn.textContent = pinned ? "Unpin chat" : "Pin chat";
    els.chatMenuMuteBtn.textContent = isMutedChat(state.activeChatId) ? "Unmute chat" : "Mute chat";
    els.chatMenuWallpaperBtn.textContent = hasPersonalChatWallpaper() ? "Change wallpaper" : "Set chat wallpaper";
    positionFloatingSheet(els.chatMenuActions, event.currentTarget, "bottom");
  });
  els.chatMenuPinBtn.addEventListener("click", () => {
    togglePinChat(state.activeChatId);
    closeFloatingSheet(els.chatMenuActions);
  });
  els.chatMenuMuteBtn.addEventListener("click", () => {
    toggleMuteChat(state.activeChatId);
    closeFloatingSheet(els.chatMenuActions);
  });
  els.chatMenuWallpaperBtn.addEventListener("click", () => {
    closeFloatingSheet(els.chatMenuActions);
    openChatWallpaperActions();
  });
  els.wallpaperChangeBtn?.addEventListener("click", () => {
    els.wallpaperActions.hidden = true;
    els.chatWallpaperImageInput.click();
  });
  els.wallpaperDeleteBtn?.addEventListener("click", () => {
    els.wallpaperActions.hidden = true;
    clearPersonalChatWallpaper();
  });
  els.wallpaperCancelBtn?.addEventListener("click", () => {
    els.wallpaperActions.hidden = true;
  });
  els.wallpaperActions?.addEventListener("click", (event) => {
    if (event.target === els.wallpaperActions) els.wallpaperActions.hidden = true;
  });
  els.clearChatConfirmBtn?.addEventListener("click", confirmClearActiveChat);
  els.clearChatCancelBtn?.addEventListener("click", () => {
    els.clearChatConfirm.hidden = true;
  });
  els.clearChatConfirm?.addEventListener("click", (event) => {
    if (event.target === els.clearChatConfirm) els.clearChatConfirm.hidden = true;
  });
  els.chatMenuProfileBtn.addEventListener("click", () => {
    closeFloatingSheet(els.chatMenuActions);
    openReceiverProfileScreen(state.activeReceiver);
  });
  els.chatMenuCancelBtn.addEventListener("click", () => {
    closeFloatingSheet(els.chatMenuActions);
  });
  els.chatMenuActions.addEventListener("click", (event) => {
    if (event.target === els.chatMenuActions) closeFloatingSheet(els.chatMenuActions);
  });
  els.messageInput.addEventListener("input", handleTypingInput);
  els.cancelReplyBtn.addEventListener("click", clearReply);
  els.closePhotoViewerBtn.addEventListener("click", closePhotoViewer);
  els.photoViewer.addEventListener("click", (event) => {
    if (event.target === els.photoViewer) closePhotoViewer();
  });
  els.profilePreviewPhotoBtn.addEventListener("click", openProfilePreviewPhoto);
  els.profilePreviewChatBtn.addEventListener("click", openProfilePreviewChat);
  els.profilePreviewInfoBtn.addEventListener("click", openProfilePreviewInfo);
  els.profilePreviewPop.addEventListener("click", (event) => {
    if (event.target === els.profilePreviewPop) closeProfilePreview();
  });
  els.actionReplyBtn.addEventListener("click", () => setReply(state.selectedMessageId));
  els.actionCopyBtn.addEventListener("click", copySelectedMessage);
  els.actionEditBtn.addEventListener("click", editSelectedMessage);
  els.actionForwardBtn.addEventListener("click", forwardSelectedMessage);
  document.querySelectorAll("[data-reaction]").forEach((button) => {
    button.addEventListener("click", () => reactToSelectedMessage(button.dataset.reaction));
  });
  els.reactionCancelBtn.addEventListener("click", closeReactionPicker);
  els.reactionActions.addEventListener("click", (event) => {
    if (event.target === els.reactionActions) closeReactionPicker();
  });
  els.actionDeleteBtn.addEventListener("click", openDeleteActions);
  els.actionCancelBtn.addEventListener("click", closeMessageActions);
  els.messageActions.addEventListener("click", (event) => {
    if (event.target === els.messageActions) closeMessageActions();
  });
  els.deleteForMeBtn.addEventListener("click", deleteSelectedForMe);
  els.deleteForEveryoneBtn.addEventListener("click", deleteSelectedForEveryone);
  els.deleteCancelBtn.addEventListener("click", closeDeleteActions);
  els.forwardCancelBtn.addEventListener("click", closeForwardActions);
  els.forwardActions.addEventListener("click", (event) => {
    if (event.target === els.forwardActions) closeForwardActions();
  });
  els.deleteActions.addEventListener("click", (event) => {
    if (event.target === els.deleteActions) closeDeleteActions();
  });
  els.profilePhotoInput.addEventListener("change", () => {
    const file = els.profilePhotoInput.files?.[0];
    if (!file) return;
    els.profilePhotoInput.value = "";
    openPhotoCropper(file, "setup");
  });
  els.cropImage.addEventListener("load", () => {
    state.cropImage = els.cropImage;
    const stageSize = els.cropStage.clientWidth;
    state.cropBaseScale = Math.max(stageSize / state.cropImage.naturalWidth, stageSize / state.cropImage.naturalHeight);
    resetCropPosition();
  });
  els.cropZoom.addEventListener("input", () => {
    const zoom = Number(els.cropZoom.value) || 1;
    state.cropScale = state.cropBaseScale * zoom;
    renderCropImage();
  });
  els.cropStage.addEventListener("pointerdown", (event) => {
    if (!state.cropImage) return;
    state.cropDragging = true;
    state.cropPointerX = event.clientX;
    state.cropPointerY = event.clientY;
    state.cropStartX = state.cropX;
    state.cropStartY = state.cropY;
    els.cropStage.setPointerCapture?.(event.pointerId);
  });
  els.cropStage.addEventListener("pointermove", (event) => {
    if (!state.cropDragging) return;
    state.cropX = state.cropStartX + event.clientX - state.cropPointerX;
    state.cropY = state.cropStartY + event.clientY - state.cropPointerY;
    renderCropImage();
  });
  els.cropStage.addEventListener("pointerup", (event) => {
    state.cropDragging = false;
    els.cropStage.releasePointerCapture?.(event.pointerId);
  });
  els.cropStage.addEventListener("pointercancel", (event) => {
    state.cropDragging = false;
    els.cropStage.releasePointerCapture?.(event.pointerId);
  });
  els.cropResetBtn.addEventListener("click", resetCropPosition);
  els.cropDoneBtn.addEventListener("click", finishPhotoCrop);
  els.cropCancelBtn.addEventListener("click", closePhotoCropper);
  els.photoCropper.addEventListener("click", (event) => {
    if (event.target === els.photoCropper) closePhotoCropper();
  });
}

bindEvents();
bindPresenceEvents();
bindScrollClickGuard();
loadAppConfig();
window.addEventListener("popstate", (event) => {
  if (!event.state?.zopchat) return;
  handleAppBackTo(event.state.screenId || "home");
});
showScreen(els.loadingScreen, { replaceHistory: true });
onAuthStateChanged(auth, (user) => {
  routeForUser(user).catch((error) => {
    console.error(error);
    showToast("Could not load your account.", "error");
    showScreen(els.loginScreen, { replaceHistory: true });
  });
});
