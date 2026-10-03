# FCM setup — project `love-that`, package `com.meetdating.app`

## 1. Place the file
`google-services.json` → `app/google-services.json` (already matches package `com.meetdating.app`).

## 2. Gradle
Project-level `build.gradle.kts`:
    plugins { id("com.google.gms.google-services") version "4.4.2" apply false }
App-level `app/build.gradle.kts`:
    plugins { id("com.google.gms.google-services") }
    dependencies {
        implementation(platform("com.google.firebase:firebase-bom:33.5.1"))
        implementation("com.google.firebase:firebase-messaging-ktx")
        implementation("com.google.firebase:firebase-firestore-ktx")
        implementation("com.google.firebase:firebase-auth-ktx")
    }

## 3. AndroidManifest.xml
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <application ...>
        <service android:name=".AppMessagingService" android:exported="false">
            <intent-filter><action android:name="com.google.firebase.MESSAGING_EVENT"/></intent-filter>
        </service>
        <meta-data android:name="com.google.firebase.messaging.default_notification_icon"
                   android:resource="@drawable/ic_stat_notification"/>
        <meta-data android:name="com.google.firebase.messaging.default_notification_channel_id"
                   android:value="messages"/>
    </application>

## 4. App code
- `Application.onCreate()` → `NotifChannels.create(this)`
- After login → `NotifChannels.registerToken()`; before logout → `NotifChannels.removeToken()`
- Android 13+: request `POST_NOTIFICATIONS` at runtime (e.g. after onboarding).
- Handle the `type` extras (match, like, message, short_like, short_comment, event) in MainActivity to deep-link.

## 5. Backend
    firebase init functions   # JavaScript, Node 20, project love-that
    # replace functions/index.js with the provided file
    firebase deploy --only functions
Needs the Blaze plan (scheduled functions). Add a Firestore composite index for the events query
(reminderSent + startTime) — the deploy/first run logs a console link to create it.

## 6. Test
Firebase console → Messaging → send test to a device token, then trigger each real event.
