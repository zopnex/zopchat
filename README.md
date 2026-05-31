# ZopChat V1

ZopChat is a static, mobile-first one-to-one chat web app using Firebase Authentication, Firestore realtime listeners, and Cloudinary unsigned image uploads.

## Files

- `index.html` - app shell and pages
- `style.css` - responsive premium chat UI
- `app.js` - Firebase, Cloudinary, profile, search, and chat logic
- `firestore.rules` - V1 demo Firestore rules

## Current V1 Features

- Google sign-in and profile completion
- Mobile number + password sign-in through Firebase Email/Password
- WhatsApp-style recent chats with realtime latest chat ordering
- Inline settings for name, description, photo, and mobile update
- Receiver profile modal from chat header
- Text and photo messages with received-photo download button

## Firebase Data Shape

```text
users/{uid}
mobileNumbers/{normalizedMobile}
mobileLogin/{normalizedMobile}
chats/{chatId}
chats/{chatId}/messages/{messageId}
```

`chatId` is deterministic: both UIDs sorted alphabetically and joined with `_`.

## Setup

1. Open Firebase Console for `zopchat-ts`.
2. Enable Authentication > Google provider.
3. Enable Authentication > Email/Password provider. ZopChat uses it behind the scenes for mobile number + password login with a synthetic email derived from the normalized mobile number.
4. Add your local and hosting domains in Authentication > Settings > Authorized domains.
5. Enable Firestore Database.
6. Publish `firestore.rules` from this project.
7. Make sure Cloudinary unsigned preset `ml_default` is enabled for cloud `dsnuatuc8`.
8. Open `index.html` through a local static server, GitHub Pages, or Firebase Hosting.

For quick local testing:

```bash
python -m http.server 5173
```

Then open `http://localhost:5173`.

## Production Notes

The mobile number uniqueness and mobile/password login in V1 are frontend-friendly demo flows. Before production:

- Move mobile number claiming to Firebase Cloud Functions or a trusted backend.
- Replace `mobileLogin.passwordHash_or_demoPassword` with backend password hashing.
- Add rate limiting and custom-token sign-in for mobile/password login.
- Tighten rules so clients cannot directly write `mobileNumbers` or `mobileLogin`.
