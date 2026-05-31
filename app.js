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
  doc,
  getDoc,
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
  messageElements: new Map(),
  messageData: new Map(),
  selectedMessageId: null,
  replyTo: null,
  viewerPhotoUrl: "",
  activeChatData: null,
  typingTimer: null,
  uploadProgressId: null,
  chats: [],
  searchTimer: null,
  unsubChats: null,
  unsubMessages: null,
  unsubReceiver: null,
  unsubActiveChat: null,
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
  notificationsBtn: $("notifications-btn"),
  chatList: $("chat-list"),
  emptyChats: $("empty-chats"),
  openSearchBtn: $("open-search-btn"),
  startChatBtn: $("start-chat-btn"),
  emptyStartChatBtn: $("empty-start-chat-btn"),
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
  messages: $("messages"),
  messageForm: $("message-form"),
  messageInput: $("message-input"),
  messagePhotoInput: $("message-photo-input"),
  sendMessageBtn: $("send-message-btn"),
  replyPreview: $("reply-preview"),
  replyTitle: $("reply-title"),
  replyText: $("reply-text"),
  cancelReplyBtn: $("cancel-reply-btn"),
  photoViewer: $("photo-viewer"),
  viewerPhoto: $("viewer-photo"),
  closePhotoViewerBtn: $("close-photo-viewer-btn"),
  saveViewerPhotoBtn: $("save-viewer-photo-btn"),
  messageActions: $("message-actions"),
  actionReplyBtn: $("action-reply-btn"),
  actionCopyBtn: $("action-copy-btn"),
  actionForwardBtn: $("action-forward-btn"),
  actionDeleteBtn: $("action-delete-btn"),
  actionCancelBtn: $("action-cancel-btn"),
  forwardActions: $("forward-actions"),
  forwardChatList: $("forward-chat-list"),
  forwardCancelBtn: $("forward-cancel-btn"),
  deleteActions: $("delete-actions"),
  deleteForMeBtn: $("delete-for-me-btn"),
  deleteForEveryoneBtn: $("delete-for-everyone-btn"),
  deleteCancelBtn: $("delete-cancel-btn"),
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

async function routeForUser(user) {
  state.currentUser = user;
  if (!user) {
    cleanupRealtime();
    state.currentProfile = null;
    showScreen(els.loginScreen);
    return;
  }

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
}

function renderSettings(profile = state.currentProfile) {
  if (!profile) return;
  els.settingsAvatar.src = profile.photoURL || DEFAULT_AVATAR;
  els.settingsName.textContent = profile.name || "ZopChat User";
  els.settingsAbout.textContent = profile.about || "Hey there! I am using ZopChat.";
  els.settingsNameValue.textContent = profile.name || "-";
  els.settingsAboutValue.textContent = profile.about || "-";
  els.settingsMobileValue.textContent = profile.mobile || "-";
  els.privacyPhoto.value = profile.privacy?.photo || "everyone";
  els.privacyAbout.value = profile.privacy?.about || "everyone";
  els.privacyLastSeen.value = profile.privacy?.lastSeen || "everyone";
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
  state.unsubChats = null;
  state.unsubMessages = null;
  state.unsubReceiver = null;
  state.unsubActiveChat = null;
  state.messageElements.clear();
  state.messageData.clear();
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
        const otherUid = chat.members?.find((uid) => uid !== state.currentUser.uid);
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

  chats.forEach((chat) => {
    const button = document.createElement("button");
    button.className = "chat-item";
    button.type = "button";
    button.innerHTML = `
      <img src="${escapeHtml(chat.other?.photoURL || DEFAULT_AVATAR)}" alt="${escapeHtml(chat.other?.name || "User")}" />
      <div class="chat-meta">
        <h4>${escapeHtml(chat.other?.name || "ZopChat User")}</h4>
        <p>${escapeHtml(chat.lastMessage || "Start chatting")}</p>
      </div>
      <div class="chat-side">
        <p>${escapeHtml(formatTime(chat.lastMessageAt))}</p>
      </div>
    `;
    button.addEventListener("click", () => openChat(chat.id, chat.other));
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
    const button = document.createElement("button");
    button.className = "chat-item";
    button.type = "button";
    button.innerHTML = `
      <img src="${escapeHtml(chat.other?.photoURL || DEFAULT_AVATAR)}" alt="${escapeHtml(chat.other?.name || "User")}" />
      <div class="chat-meta">
        <h4>${escapeHtml(chat.other?.name || "ZopChat User")}</h4>
        <p>${escapeHtml(chat.other?.mobile || chat.lastMessage || "")}</p>
      </div>
      <div class="chat-side">
        <p>${escapeHtml(formatTime(chat.lastMessageAt))}</p>
      </div>
    `;
    button.addEventListener("click", () => openChat(chat.id, chat.other));
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
          <p>${escapeHtml(profile.mobile)}</p>
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

function renderInviteCard(mobile) {
  els.searchResult.innerHTML = `
    <div class="result-card invite-card">
      <img src="${INVITE_AVATAR}" alt="Invite user" />
      <div>
        <h4>${escapeHtml(mobile)}</h4>
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

function openChat(chatId, receiver) {
  state.activeChatId = chatId;
  state.activeReceiver = receiver;
  els.receiverAvatar.src = receiver?.photoURL || DEFAULT_AVATAR;
  els.receiverName.textContent = receiver?.name || "ZopChat User";
  els.receiverStatus.textContent = receiver?.online ? "Online" : "Last seen recently";
  els.messages.innerHTML = "";
  state.messageElements.clear();
  state.messageData.clear();
  showScreen(els.chatScreen);
  listenToActiveReceiver(receiver?.uid);
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
    renderReceiverStatus();
  });
}

function renderReceiverStatus() {
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
  if (message.type === "image") return "Photo";
  return message.text || "";
}

function buildMessageElement(id, message) {
  const isMine = message.senderId === state.currentUser.uid;
  const row = document.createElement("div");
  row.className = `message-row ${isMine ? "mine" : "theirs"}`;
  if (message.localProgress) row.classList.add("progress-bubble");
  row.dataset.messageId = id;

  const deleted = message.deletedForEveryone === true;
  const replyMarkup =
    message.replyTo && !deleted
      ? `<div class="reply-quote">${escapeHtml(message.replyTo.senderName || "Reply")}<br>${escapeHtml(message.replyTo.preview || "")}</div>`
      : "";

  const imageMarkup =
    message.type === "image" && message.imageURL && !deleted
      ? `<img class="message-image" src="${escapeHtml(message.imageURL)}" alt="Shared photo" data-photo-url="${escapeHtml(message.imageURL)}" />`
      : "";
  const textMarkup = deleted
    ? `<p class="deleted-message">This message was deleted</p>`
    : message.text
      ? `<p>${escapeHtml(message.text)}</p>`
      : "";

  row.innerHTML = `
    <div class="bubble">
      ${replyMarkup}
      ${imageMarkup}
      ${textMarkup}
      <div class="message-meta">
        <time>${escapeHtml(formatTime(message.createdAt))}</time>
        ${getReceiptMarkup(message, isMine)}
      </div>
      ${renderReactions(message)}
    </div>
  `;

  const photo = row.querySelector("[data-photo-url]");
  if (photo) {
    photo.addEventListener("click", () => openPhotoViewer(message.imageURL));
  }
  bindMessageGestures(row, id, message);
  return row;
}

function renderReactions(message) {
  const reactions = Object.values(message.reactions || {});
  if (!reactions.length) return "";
  return `<div class="reactions">${reactions.map((emoji) => `<span class="reaction-pill">${escapeHtml(emoji)}</span>`).join("")}</div>`;
}

function bindMessageGestures(row, id, message) {
  let pressTimer;
  let startX = 0;
  let startY = 0;
  let swiping = false;
  const bubble = row.querySelector(".bubble");

  row.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    openMessageActions(id);
  });

  row.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
    startY = event.clientY;
    swiping = false;
    pressTimer = window.setTimeout(() => openMessageActions(id), 520);
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
  const file = els.messagePhotoInput.files?.[0];
  els.messagePhotoInput.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) {
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
    text: "Uploading photo...",
    type: "text",
    createdAt: new Date(),
    localProgress: true,
  };
  const tempRow = buildMessageElement(tempId, tempMessage);
  els.messages.appendChild(tempRow);
  els.messages.scrollTop = els.messages.scrollHeight;
  try {
    const imageURL = await uploadImageToCloudinary(file);
    const now = serverTimestamp();
    await addDoc(collection(db, "chats", state.activeChatId, "messages"), {
      senderId: state.currentUser.uid,
      text: "",
      type: "image",
      imageURL,
      fileName: file.name || "photo",
      createdAt: now,
      status: "sent",
      replyTo: state.replyTo,
      readBy: {
        [state.currentUser.uid]: true,
      },
    });
    await updateDoc(doc(db, "chats", state.activeChatId), {
      lastMessage: "Photo",
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

function openPhotoViewer(url) {
  state.viewerPhotoUrl = url;
  els.viewerPhoto.src = url;
  els.photoViewer.hidden = false;
}

function closePhotoViewer() {
  els.photoViewer.hidden = true;
  els.viewerPhoto.src = "";
  state.viewerPhotoUrl = "";
}

function openMessageActions(id) {
  const message = state.messageData.get(id);
  if (!message) return;
  state.selectedMessageId = id;
  els.actionCopyBtn.hidden = message.type !== "text" || !message.text || message.deletedForEveryone;
  els.actionDeleteBtn.hidden = message.deletedForEveryone;
  els.messageActions.hidden = false;
}

function closeMessageActions() {
  els.messageActions.hidden = true;
}

function openDeleteActions() {
  closeMessageActions();
  els.deleteActions.hidden = false;
}

function closeDeleteActions() {
  els.deleteActions.hidden = true;
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
  if (!els.replyPreview) return;
  els.replyPreview.hidden = true;
  els.replyTitle.textContent = "Reply";
  els.replyText.textContent = "";
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
  closeMessageActions();
  els.forwardActions.hidden = false;
}

function closeForwardActions() {
  els.forwardActions.hidden = true;
}

function renderForwardList() {
  els.forwardChatList.innerHTML = "";
  const message = state.messageData.get(state.selectedMessageId);
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
          <p>${escapeHtml(messagePreview(message))}</p>
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
  const message = state.messageData.get(state.selectedMessageId);
  if (!message || !chatId) return;
  try {
    const now = serverTimestamp();
    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: state.currentUser.uid,
      text: message.type === "text" ? message.text || "" : "",
      type: message.type,
      imageURL: message.type === "image" ? message.imageURL || "" : "",
      forwarded: true,
      createdAt: now,
      status: "sent",
      readBy: { [state.currentUser.uid]: true },
    });
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: message.type === "image" ? "Forwarded photo" : message.text || "Forwarded message",
      lastMessageType: message.type,
      lastMessageAt: now,
      lastMessageSenderId: state.currentUser.uid,
      updatedAt: now,
    });
    closeForwardActions();
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
    closeMessageActions();
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
  const id = state.selectedMessageId;
  if (!id || !state.activeChatId) return;
  try {
    await updateDoc(doc(db, "chats", state.activeChatId, "messages", id), {
      [`hiddenFor.${state.currentUser.uid}`]: true,
    });
    closeDeleteActions();
    showToast("Deleted for you.");
  } catch (error) {
    console.error(error);
    showToast("Could not delete message.", "error");
  }
}

async function deleteSelectedForEveryone() {
  const id = state.selectedMessageId;
  const message = state.messageData.get(id);
  if (!id || !state.activeChatId || message?.senderId !== state.currentUser.uid) {
    showToast("You can delete only your own message for everyone.", "error");
    return;
  }

  try {
    await updateDoc(doc(db, "chats", state.activeChatId, "messages", id), {
      deletedForEveryone: true,
      text: "",
      imageURL: "",
      status: "deleted",
      deletedAt: serverTimestamp(),
    });
    closeDeleteActions();
    showToast("Deleted for everyone.");
  } catch (error) {
    console.error(error);
    showToast("Could not delete for everyone.", "error");
  }
}

function openReceiverProfileScreen(profile) {
  if (!profile) return;
  els.fullUserAvatar.src = profile.photoURL || DEFAULT_AVATAR;
  els.fullUserName.textContent = profile.name || "ZopChat User";
  els.fullUserAbout.textContent = profile.about || "Hey there! I am using ZopChat.";
  els.fullUserMobile.textContent = profile.mobile || "-";
  els.fullUserEmail.textContent = profile.email || "-";
  els.fullUserStatus.textContent = profile.online ? "Online" : "Offline";
  showScreen(els.receiverProfileScreen);
}

function backToChatFromReceiverProfile() {
  if (state.activeChatId) {
    showScreen(els.chatScreen);
  } else {
    showScreen(els.homeScreen);
  }
}

function backToHome() {
  if (state.unsubMessages) state.unsubMessages();
  if (state.unsubReceiver) state.unsubReceiver();
  state.unsubMessages = null;
  state.unsubReceiver = null;
  state.activeChatId = null;
  state.activeReceiver = null;
  state.messageElements.clear();
  state.messageData.clear();
  clearReply();
  showScreen(els.homeScreen);
}

async function logout() {
  try {
    await setOnlineStatus(false);
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
  els.privacyBtn.addEventListener("click", () => showToast("Privacy settings are ready for the next ZopChat version."));
  els.blockListBtn.addEventListener("click", () => showToast("Block list will be added in the next ZopChat version."));
  els.notificationsBtn.addEventListener("click", () => showToast("Notification controls will be added in the next ZopChat version."));
  els.openSearchBtn.addEventListener("click", openSearchPage);
  els.startChatBtn.addEventListener("click", openSearchPage);
  els.emptyStartChatBtn.addEventListener("click", openSearchPage);
  els.closeSearchBtn.addEventListener("click", closeSearchPage);
  els.searchForm.addEventListener("submit", handleSearch);
  els.searchMobile.addEventListener("input", handleSearchInput);
  els.backHomeBtn.addEventListener("click", backToHome);
  els.openReceiverProfileBtn.addEventListener("click", () => openReceiverProfileScreen(state.activeReceiver));
  els.receiverProfileBackBtn.addEventListener("click", backToChatFromReceiverProfile);
  els.messageForm.addEventListener("submit", handleSendMessage);
  els.messagePhotoInput.addEventListener("change", handleSendPhoto);
  els.cancelReplyBtn.addEventListener("click", clearReply);
  els.closePhotoViewerBtn.addEventListener("click", closePhotoViewer);
  els.saveViewerPhotoBtn.addEventListener("click", () => {
    if (state.viewerPhotoUrl) downloadImage(state.viewerPhotoUrl);
  });
  els.photoViewer.addEventListener("click", (event) => {
    if (event.target === els.photoViewer) closePhotoViewer();
  });
  els.actionReplyBtn.addEventListener("click", () => setReply(state.selectedMessageId));
  els.actionCopyBtn.addEventListener("click", copySelectedMessage);
  els.actionForwardBtn.addEventListener("click", forwardSelectedMessage);
  els.actionDeleteBtn.addEventListener("click", openDeleteActions);
  els.actionCancelBtn.addEventListener("click", closeMessageActions);
  els.messageActions.addEventListener("click", (event) => {
    if (event.target === els.messageActions) closeMessageActions();
  });
  els.deleteForMeBtn.addEventListener("click", deleteSelectedForMe);
  els.deleteForEveryoneBtn.addEventListener("click", deleteSelectedForEveryone);
  els.deleteCancelBtn.addEventListener("click", closeDeleteActions);
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
