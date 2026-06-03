import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  getAuth,
  linkWithCredential,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
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

// Cloudinary unsigned upload config for profile photos.
const CLOUDINARY_API = "https://api.cloudinary.com/v1_1/dsnuatuc8/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";

const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Crect width='160' height='160' rx='80' fill='%23d9f8ec'/%3E%3Ccircle cx='80' cy='62' r='30' fill='%230f9f7a'/%3E%3Cpath d='M32 142c8-30 27-46 48-46s40 16 48 46' fill='%230f9f7a'/%3E%3C/svg%3E";
const INVITE_AVATAR = "https://res.cloudinary.com/dsnuatuc8/image/upload/v1780190715/Screenshot_2026-05-31_065148_fohvc2.png";
const ZOPCHAT_DEMO_DOWNLOAD_URL = "https://example.com/download-zopchat";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const state = {
  currentUser: null,
  currentProfile: null,
  selectedPhotoFile: null,
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
  editingMessageId: null,
  activeChatData: null,
  typingTimer: null,
  uploadProgressId: null,
  chats: [],
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
  privacyBtn: $("privacy-btn"),
  privacyForm: $("privacy-form"),
  privacyPhoto: $("privacy-photo"),
  privacyAbout: $("privacy-about"),
  privacyLastSeen: $("privacy-last-seen"),
  blockListBtn: $("block-list-btn"),
  qrBtn: $("qr-btn"),
  qrCard: $("qr-card"),
  profileQr: $("profile-qr"),
  wallpaperBtn: $("wallpaper-btn"),
  wallpaperForm: $("wallpaper-form"),
  wallpaperSelect: $("wallpaper-select"),
  notificationsBtn: $("notifications-btn"),
  chatList: $("chat-list"),
  emptyChats: $("empty-chats"),
  openSearchBtn: $("open-search-btn"),
  startChatBtn: $("start-chat-btn"),
  emptyStartChatBtn: $("empty-start-chat-btn"),
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
  messageFileInput: $("message-file-input"),
  sendMessageBtn: $("send-message-btn"),
  replyPreview: $("reply-preview"),
  replyTitle: $("reply-title"),
  replyText: $("reply-text"),
  cancelReplyBtn: $("cancel-reply-btn"),
  photoViewer: $("photo-viewer"),
  viewerPhotoList: $("viewer-photo-list"),
  closePhotoViewerBtn: $("close-photo-viewer-btn"),
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
  chatMenuProfileBtn: $("chat-menu-profile-btn"),
  chatMenuCancelBtn: $("chat-menu-cancel-btn"),
  attachActions: $("attach-actions"),
  attachImageBtn: $("attach-image-btn"),
  attachFileBtn: $("attach-file-btn"),
  attachCancelBtn: $("attach-cancel-btn"),
  toast: $("toast"),
};

function showScreen(screen) {
  [els.loadingScreen, els.loginScreen, els.profileScreen, els.homeScreen, els.searchScreen, els.settingsScreen, els.chatScreen, els.receiverProfileScreen].forEach((el) => {
    el.hidden = el !== screen;
    el.classList.toggle("is-active", el === screen);
  });
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

function isBlockedWith(profile) {
  return Boolean(state.currentProfile?.blockedUsers?.[profile?.uid] || profile?.blockedUsers?.[state.currentUser?.uid]);
}

function timestampMillis(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
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
    showScreen(els.loginScreen);
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
    showScreen(els.homeScreen);
    listenToChats();
  } else {
    populateProfileForm(profile);
    showScreen(els.profileScreen);
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
  els.profileQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`zopchat:user:${profile.mobile || profile.uid}`)}`;
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
  state.unsubChats = null;
  state.unsubMessages = null;
  state.unsubReceiver = null;
  state.unsubActiveChat = null;
  state.unsubOwnSession = null;
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
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const response = await fetch(CLOUDINARY_API.replace("/image/upload", "/raw/upload"), {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new Error("File upload failed.");
  const data = await response.json();
  if (!data.secure_url) throw new Error("Cloudinary did not return a file URL.");
  return data.secure_url;
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
    const title = chat.type === "group" ? chat.groupName || "Group" : chat.other?.name || "ZopChat User";
    const avatar = chat.type === "group" ? chat.groupPhotoURL || DEFAULT_AVATAR : chat.other?.photoURL || DEFAULT_AVATAR;
    const button = document.createElement("button");
    button.className = "chat-item";
    button.type = "button";
    button.innerHTML = `
      <img src="${escapeHtml(avatar)}" alt="${escapeHtml(title)}" />
      <div class="chat-meta">
        <h4>${state.currentProfile?.pinnedChats?.[chat.id] ? "📌 " : ""}${escapeHtml(title)}</h4>
        <p>${escapeHtml(chat.lastMessage || "Start chatting")}</p>
      </div>
      <div class="chat-side">
        <p>${escapeHtml(formatTime(chat.lastMessageAt))}</p>
      </div>
    `;
    button.addEventListener("click", (event) => {
      openChat(chat.id, chat.other, chat);
    });
    els.chatList.appendChild(button);
  });
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
      <img src="${escapeHtml(chat.other?.photoURL || DEFAULT_AVATAR)}" alt="${escapeHtml(chat.other?.name || "User")}" />
      <div class="chat-meta">
        <h4>${escapeHtml(chat.other?.name || "ZopChat User")}</h4>
        <p>${escapeHtml(formatMobileDisplay(chat.other?.mobile) || chat.lastMessage || "")}</p>
      </div>
      <div class="chat-side">
        <p>${escapeHtml(formatTime(chat.lastMessageAt))}</p>
      </div>
    `;
    button.addEventListener("click", () => openChat(chat.id, chat.other, chat));
    els.searchChatList.appendChild(button);
  });
}

function openSettings() {
  renderSettings();
  hideInlineEditors();
  showScreen(els.settingsScreen);
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

function openSearchPage() {
  els.searchMobile.value = "";
  els.searchResult.innerHTML = "";
  renderSearchChatList();
  renderGroupMemberPicker();
  showScreen(els.searchScreen);
  window.setTimeout(() => els.searchMobile.focus(), 80);
}

function closeSearchPage() {
  els.searchMobile.value = "";
  els.searchResult.innerHTML = "";
  showScreen(els.homeScreen);
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
  if (wallpaper && wallpaper !== "default") els.messages.classList.add(`wallpaper-${wallpaper}`);
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
    "Join me on ZopChat so we can chat faster and privately.",
    "",
    `Download ZopChat here: ${ZOPCHAT_DEMO_DOWNLOAD_URL}`,
  ].join("\n");
  const url = `https://wa.me/${mobile}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener");
}

function handleSearchInput() {
  window.clearTimeout(state.searchTimer);
  els.searchResult.innerHTML = "";
  renderSearchChatList();
  const mobile = normalizeMobile(els.searchMobile.value);
  if (!isValidIndianMobile(mobile)) return;
  state.searchTimer = window.setTimeout(() => handleSearch(), 250);
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

function openChat(chatId, receiver, chatMeta = null) {
  state.activeChatId = chatId;
  state.activeReceiver = receiver;
  state.activeChatMeta = chatMeta;
  const isGroup = chatMeta?.type === "group";
  els.receiverAvatar.src = isGroup ? chatMeta.groupPhotoURL || DEFAULT_AVATAR : receiver?.photoURL || DEFAULT_AVATAR;
  els.receiverName.textContent = isGroup ? chatMeta.groupName || "Group" : receiver?.name || "ZopChat User";
  els.receiverStatus.textContent = isGroup ? `${chatMeta.members?.length || 0} members` : receiver?.online ? "Online" : "Last seen recently";
  els.messages.innerHTML = "";
  state.messageElements.clear();
  state.messageData.clear();
  showScreen(els.chatScreen);
  if (!isGroup) listenToActiveReceiver(receiver?.uid);
  listenToActiveChat(chatId);
  listenToMessages(chatId);
}

function listenToActiveReceiver(uid) {
  if (state.unsubReceiver) state.unsubReceiver();
  state.unsubReceiver = null;
  if (!uid) return;

  state.unsubReceiver = onSnapshot(doc(db, "users", uid), (snapshot) => {
    if (!snapshot.exists()) return;
    state.activeReceiver = snapshot.data();
    els.receiverAvatar.src = canSee(state.activeReceiver, "photo") ? state.activeReceiver.photoURL || DEFAULT_AVATAR : DEFAULT_AVATAR;
    els.receiverName.textContent = state.activeReceiver.name || "ZopChat User";
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
      els.messages.scrollTop = els.messages.scrollHeight;
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
  } catch (error) {
    console.warn("Read receipt update failed", error);
  }
}

function getReceiptMarkup(message, isMine) {
  if (!isMine || !state.activeReceiver) return "";
  const receiverRead = message.readBy?.[state.activeReceiver.uid] === true || message.status === "read";
  if (receiverRead) return `<span class="ticks read" title="Seen">✓✓</span>`;
  if (state.activeReceiver.online) return `<span class="ticks" title="Delivered">✓✓</span>`;
  return `<span class="ticks" title="Sent">✓</span>`;
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
      ? `<div class="file-card"><strong>${escapeHtml(message.fileName || "File")}</strong><button type="button" data-file-url="${escapeHtml(message.fileURL || "")}">Download</button></div>`
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
    photoAlbum.addEventListener("click", (event) => {
      if (state.selectedMessageIds.size) {
        event.preventDefault();
        event.stopPropagation();
        toggleMessageSelection(id);
        return;
      }
      openPhotoViewer(getMessageImages(message));
    });
  }
  const emoji = row.querySelector("[data-emoji-for]");
  if (emoji) {
    emoji.addEventListener("click", (event) => {
      event.stopPropagation();
      openReactionPicker(id);
    });
  }
  row.querySelector("[data-file-url]")?.addEventListener("click", () => {
    window.open(message.fileURL, "_blank", "noopener");
  });
  row.querySelectorAll("[data-reaction-owner]").forEach((reaction) => {
    reaction.addEventListener("click", (event) => {
      event.stopPropagation();
      state.selectedMessageId = id;
      openReactionPicker(id);
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
  const bubble = row.querySelector(".bubble");

  row.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    toggleMessageSelection(id);
  });

  row.addEventListener("click", (event) => {
    if (!state.selectedMessageIds.size) return;
    if (event.target.closest("[data-photo-album], [data-emoji-for], [data-reaction-owner]")) return;
    event.preventDefault();
    toggleMessageSelection(id);
  });

  row.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
    startY = event.clientY;
    swiping = false;
    pressTimer = window.setTimeout(() => toggleMessageSelection(id), 520);
  });

  row.addEventListener("pointermove", (event) => {
    if (event.pointerType === "mouse") return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) window.clearTimeout(pressTimer);
    if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      swiping = true;
      bubble.style.transform = `translateX(${Math.max(-58, Math.min(58, dx))}px)`;
    }
  });

  row.addEventListener("pointerup", (event) => {
    window.clearTimeout(pressTimer);
    if (event.pointerType === "mouse") return;
    const dx = event.clientX - startX;
    bubble.style.transform = "";
    if (swiping && Math.abs(dx) > 42) setReply(id);
  });

  row.addEventListener("pointercancel", () => {
    window.clearTimeout(pressTimer);
    bubble.style.transform = "";
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

async function handleSendPhoto() {
  const files = Array.from(els.messagePhotoInput.files || []);
  els.messagePhotoInput.value = "";
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
  try {
    for (const file of files) {
      const fileURL = await uploadFileToCloudinary(file);
      const now = serverTimestamp();
      await addDoc(collection(db, "chats", state.activeChatId, "messages"), {
        senderId: state.currentUser.uid,
        text: "",
        type: "file",
        fileURL,
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

function openPhotoViewer(urls) {
  state.viewerPhotoUrls = Array.isArray(urls) ? urls : [urls];
  state.viewerPhotoUrl = state.viewerPhotoUrls[0] || "";
  els.viewerPhotoList.innerHTML = state.viewerPhotoUrls
    .map(
      (url, index) => `
        <div class="viewer-photo-item">
          <img src="${escapeHtml(url)}" alt="Shared photo ${index + 1}" />
          <button class="viewer-download-btn" type="button" title="Download" data-save-photo="${escapeHtml(url)}">⇩</button>
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
  els.viewerPhotoList.innerHTML = "";
  state.viewerPhotoUrl = "";
  state.viewerPhotoUrls = [];
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

function openReactionPicker(id) {
  state.selectedMessageId = id;
  els.reactionActions.hidden = false;
}

function closeReactionPicker() {
  els.reactionActions.hidden = true;
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
  els.fullUserName.textContent = profile.name || "ZopChat User";
  els.fullUserAbout.textContent = canSee(profile, "about") ? profile.about || "Hey there! I am using ZopChat." : "About is private";
  els.fullUserMobile.textContent = formatMobileDisplay(profile.mobile);
  els.fullUserEmail.closest(".setting-row").hidden = true;
  els.fullUserStatus.textContent = profile.online ? "Online" : canSee(profile, "lastSeen") ? formatLastSeen(profile.lastSeen) : "Offline";
  els.blockUserBtn.textContent = state.currentProfile?.blockedUsers?.[profile.uid] ? "Unblock user" : "Block user";
  els.groupEditForm.hidden = true;
  els.groupMembersCard.hidden = true;
  renderMediaGallery();
  showScreen(els.receiverProfileScreen);
}

async function openGroupProfileScreen() {
  const chat = state.activeChatData || state.activeChatMeta;
  if (!chat) return;
  const isAdmin = Boolean(chat.admins?.[state.currentUser.uid]);
  els.fullUserAvatar.src = chat.groupPhotoURL || DEFAULT_AVATAR;
  els.fullUserName.textContent = chat.groupName || "Group";
  els.fullUserAbout.textContent = chat.groupDescription || "No description";
  els.fullUserMobile.textContent = "Group chat";
  els.fullUserEmail.closest(".setting-row").hidden = false;
  els.fullUserEmail.textContent = `${chat.members?.length || 0} members`;
  els.fullUserStatus.textContent = isAdmin ? "You are admin" : "Member";
  els.blockUserBtn.style.display = "none";
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
  els.fullUserEmail.closest(".setting-row").hidden = false;
  if (state.activeChatId) {
    showScreen(els.chatScreen);
  } else {
    showScreen(els.homeScreen);
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

function backToHome() {
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
  showScreen(els.homeScreen);
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

function bindEvents() {
  els.googleLoginBtn.addEventListener("click", handleGoogleLogin);
  els.mobileLoginForm.addEventListener("submit", handleMobileLogin);
  els.profileForm.addEventListener("submit", handleProfileSave);
  els.profileLogoutBtn.addEventListener("click", logout);
  els.openProfileBtn.addEventListener("click", openSettings);
  els.settingsBackBtn.addEventListener("click", () => showScreen(els.homeScreen));
  els.settingsLogoutBtn.addEventListener("click", logout);
  els.settingsPhotoInput.addEventListener("change", () => updateSettingsPhoto(els.settingsPhotoInput.files?.[0]));
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
  els.wallpaperBtn.addEventListener("click", () => {
    els.wallpaperForm.hidden = !els.wallpaperForm.hidden;
  });
  els.wallpaperForm.addEventListener("submit", saveWallpaper);
  els.blockListBtn.addEventListener("click", () => {
    const count = Object.values(state.currentProfile?.blockedUsers || {}).filter(Boolean).length;
    showToast(count ? `${count} user blocked.` : "No blocked users yet.");
  });
  els.notificationsBtn.addEventListener("click", () => showToast("Notification controls will be added in the next ZopChat version."));
  els.openSearchBtn.addEventListener("click", openSearchPage);
  els.startChatBtn.addEventListener("click", openSearchPage);
  els.emptyStartChatBtn.addEventListener("click", openSearchPage);
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
  els.messageFileInput.addEventListener("change", handleSendFiles);
  els.attachMenuBtn.addEventListener("click", () => {
    els.attachActions.hidden = false;
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
  els.chatMenuBtn.addEventListener("click", () => {
    const pinned = Boolean(state.currentProfile?.pinnedChats?.[state.activeChatId]);
    els.chatMenuPinBtn.textContent = pinned ? "Unpin chat" : "Pin chat";
    els.chatMenuActions.hidden = false;
  });
  els.chatMenuPinBtn.addEventListener("click", () => {
    togglePinChat(state.activeChatId);
    els.chatMenuActions.hidden = true;
  });
  els.chatMenuProfileBtn.addEventListener("click", () => {
    els.chatMenuActions.hidden = true;
    openReceiverProfileScreen(state.activeReceiver);
  });
  els.chatMenuCancelBtn.addEventListener("click", () => {
    els.chatMenuActions.hidden = true;
  });
  els.chatMenuActions.addEventListener("click", (event) => {
    if (event.target === els.chatMenuActions) els.chatMenuActions.hidden = true;
  });
  els.messageInput.addEventListener("input", handleTypingInput);
  els.cancelReplyBtn.addEventListener("click", clearReply);
  els.closePhotoViewerBtn.addEventListener("click", closePhotoViewer);
  els.photoViewer.addEventListener("click", (event) => {
    if (event.target === els.photoViewer) closePhotoViewer();
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
    if (!file.type.startsWith("image/")) {
      showToast("Choose a valid image file.", "error");
      els.profilePhotoInput.value = "";
      return;
    }
    state.selectedPhotoFile = file;
    els.profilePreview.src = URL.createObjectURL(file);
  });
}

bindEvents();
bindPresenceEvents();
showScreen(els.loadingScreen);
onAuthStateChanged(auth, (user) => {
  routeForUser(user).catch((error) => {
    console.error(error);
    showToast("Could not load your account.", "error");
    showScreen(els.loginScreen);
  });
});
